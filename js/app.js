const searchInput = document.getElementById("searchInput");
const songList = document.getElementById("songList");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const alphabetNav = document.getElementById("alphabetNav");

const libraryView = document.getElementById("libraryView");
const songView = document.getElementById("songView");
const backButton = document.getElementById("backButton");

const songTitle = document.getElementById("songTitle");
const songMeta = document.getElementById("songMeta");
const resourceActions = document.getElementById("resourceActions");
const openOriginalButton = document.getElementById("openOriginalButton");

const documentEmpty = document.getElementById("documentEmpty");
const pdfStatus = document.getElementById("pdfStatus");
const pdfViewer = document.getElementById("pdfViewer");
const wordNotice = document.getElementById("wordNotice");
const wordOpenLink = document.getElementById("wordOpenLink");

const audioDock = document.getElementById("audioDock");
const audioTrackTitle = document.getElementById("audioTrackTitle");
const audioPlayer = document.getElementById("audioPlayer");

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

let activePdfDocument = null;
let activePdfResource = null;
let pdfRenderToken = 0;
let resizeTimer = null;

const sortedLibrary = [...musicLibrary].sort((a, b) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
);

function normalized(value = "") {
  return value.toLowerCase().trim();
}

function searchableText(song) {
  return normalized([
    song.title,
    song.composer,
    ...(song.tags || []),
    ...(song.documents || []).map((item) => item.label),
    ...(song.audio || []).map((item) => item.label)
  ].join(" "));
}

function songResourceBadges(song) {
  const badges = [];

  if ((song.documents || []).some((doc) => doc.type === "pdf")) {
    badges.push('<span class="resource-pill">PDF</span>');
  }

  if ((song.documents || []).some((doc) => ["doc", "docx"].includes(doc.type))) {
    badges.push('<span class="resource-pill">DOC</span>');
  }

  if ((song.audio || []).length) {
    badges.push('<span class="resource-pill">MP3</span>');
  }

  return badges.join("");
}

function renderAlphabetNav(availableLetters) {
  alphabetNav.innerHTML = alphabet.map((letter) => {
    const enabled = availableLetters.has(letter);

    return `
      <button
        class="alphabet-button"
        type="button"
        data-letter="${letter}"
        ${enabled ? "" : "disabled"}
      >
        ${letter}
      </button>
    `;
  }).join("");

  alphabetNav.querySelectorAll(".alphabet-button:not(:disabled)").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById(`letter-${button.dataset.letter}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

function renderLibrary(query = "") {
  const q = normalized(query);

  const matches = sortedLibrary.filter((song) =>
    !q || searchableText(song).includes(q)
  );

if (q) {
  resultCount.textContent =
    `${matches.length} of ${sortedLibrary.length} songs`;
} else {
  resultCount.textContent =
    `${sortedLibrary.length} ${sortedLibrary.length === 1 ? "song" : "songs"} in library`;
}  emptyState.classList.toggle("hidden", matches.length > 0);

  const grouped = new Map();

  matches.forEach((song) => {
    const letter = song.title.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : "#";

    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(song);
  });

  renderAlphabetNav(new Set(grouped.keys()));

  songList.innerHTML = [...grouped.entries()].map(([letter, songs]) => `
    <section id="letter-${letter}" class="letter-section">
      <h2 class="letter-heading">${letter}</h2>

      <div class="song-cards">
        ${songs.map((song) => `
          <button class="song-card" type="button" data-song-id="${song.id}">
            <div>
              <p class="song-card-title">${song.title}</p>
              <p class="song-card-meta">${song.composer || ""}</p>
            </div>

            <div class="song-card-icons">
              ${songResourceBadges(song)}
            </div>
          </button>
        `).join("")}
      </div>
    </section>
  `).join("");

  songList.querySelectorAll(".song-card").forEach((card) => {
    card.addEventListener("click", () => openSong(card.dataset.songId));
  });
}

function clearPdfViewer() {
  pdfRenderToken += 1;
  activePdfDocument = null;
  activePdfResource = null;
  pdfViewer.innerHTML = "";
  pdfViewer.classList.add("hidden");
  pdfStatus.classList.add("hidden");
}

function resetDocumentViewer() {
  clearPdfViewer();

  wordNotice.classList.add("hidden");
  documentEmpty.classList.remove("hidden");

  openOriginalButton.classList.add("hidden");
  openOriginalButton.removeAttribute("href");

  resourceActions
    .querySelectorAll(".resource-button")
    .forEach((button) => button.classList.remove("active"));
}

async function renderPdfPages(resource) {
  clearPdfViewer();

  if (!window.pdfjsLib) {
    documentEmpty.classList.add("hidden");
    pdfStatus.textContent =
      "The sheet music viewer could not load. Use Open Original to view the PDF.";
    pdfStatus.classList.remove("hidden");
    return;
  }

  const token = ++pdfRenderToken;
  activePdfResource = resource;

  documentEmpty.classList.add("hidden");
  wordNotice.classList.add("hidden");
  pdfViewer.classList.add("hidden");
  pdfStatus.textContent = "Loading sheet music…";
  pdfStatus.classList.remove("hidden");

  try {
    const loadingTask = pdfjsLib.getDocument(resource.file);
    const pdf = await loadingTask.promise;

    if (token !== pdfRenderToken) return;

    activePdfDocument = pdf;
    pdfViewer.innerHTML = "";

    /*
      Render at higher internal resolution for sharp text while CSS displays
      the canvas at the actual available page width.
    */
    const availableWidth = Math.max(280, pdfViewer.parentElement.clientWidth);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      if (token !== pdfRenderToken) return;

      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const displayScale = availableWidth / baseViewport.width;
      const renderScale = displayScale * pixelRatio;
      const renderViewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement("canvas");
      canvas.className = "pdf-page";
      canvas.setAttribute("aria-label", `Page ${pageNumber} of ${pdf.numPages}`);

      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);

      /*
        CSS pixels remain the full viewer width while the backing canvas uses
        the higher device-pixel resolution calculated above.
      */
      canvas.style.width = `${availableWidth}px`;
      canvas.style.height =
        `${(baseViewport.height * displayScale)}px`;

      pdfViewer.appendChild(canvas);

      const context = canvas.getContext("2d", { alpha: false });

      await page.render({
        canvasContext: context,
        viewport: renderViewport,
        background: "rgb(255,255,255)"
      }).promise;
    }

    if (token !== pdfRenderToken) return;

    pdfStatus.classList.add("hidden");
    pdfViewer.classList.remove("hidden");
  } catch (error) {
    console.error("PDF render failed:", error);

    if (token !== pdfRenderToken) return;

    pdfViewer.classList.add("hidden");
    pdfStatus.textContent =
      "Unable to render this PDF here. Use Open Original to view it.";
    pdfStatus.classList.remove("hidden");
  }
}

function openDocument(resource, button) {
  resetDocumentViewer();
  documentEmpty.classList.add("hidden");
  button?.classList.add("active");

  openOriginalButton.href = resource.file;
  openOriginalButton.classList.remove("hidden");

  if (resource.type === "pdf") {
    renderPdfPages(resource);
    return;
  }

  if (["doc", "docx"].includes(resource.type)) {
    wordOpenLink.href = resource.file;
    wordNotice.classList.remove("hidden");
    return;
  }

  window.open(resource.file, "_blank", "noopener");
}

function setAudio(song) {
  const tracks = song.audio || [];

  if (!tracks.length) {
    audioPlayer.pause();
    audioPlayer.removeAttribute("src");
    audioPlayer.load();

    audioDock.classList.add("hidden");
    songView.classList.remove("has-audio");

    return;
  }

  const track = tracks[0];

  audioTrackTitle.textContent = `${song.title} — ${track.label}`;
  audioPlayer.src = track.file;

  audioDock.classList.remove("hidden");
  songView.classList.add("has-audio");
}

function populateSongView(song) {
  songTitle.textContent = song.title;

  songMeta.textContent = [
    song.composer,
    ...(song.tags || [])
  ]
    .filter(Boolean)
    .join(" • ");

  resourceActions.innerHTML = "";

  const documents = song.documents || [];

  resourceActions.classList.toggle(
    "single-resource",
    documents.length <= 1
  );

  documents.forEach((resource, index) => {
    const button = document.createElement("button");

    button.className = "resource-button";
    button.type = "button";
    button.textContent = resource.label;

    button.addEventListener("click", () => {
      openDocument(resource, button);
    });

    resourceActions.appendChild(button);

    if (index === 0) {
      setTimeout(() => openDocument(resource, button), 0);
    }
  });

  if (!documents.length) {
    resetDocumentViewer();
  }

  setAudio(song);
}

function openSong(id, updateHistory = true) {
  const song = musicLibrary.find((item) => item.id === id);

  if (!song) return;

  libraryView.classList.add("hidden");
  songView.classList.remove("hidden");

  populateSongView(song);

  if (updateHistory) {
    history.pushState({ songId: id }, "", `#${id}`);
  }

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}

function closeSong(updateHistory = true) {
  songView.classList.add("hidden");
  libraryView.classList.remove("hidden");

  audioPlayer.pause();
  audioPlayer.removeAttribute("src");
  audioPlayer.load();

  audioDock.classList.add("hidden");
  songView.classList.remove("has-audio");

  resetDocumentViewer();

  if (updateHistory) {
    history.pushState({}, "", window.location.pathname);
  }
}

searchInput.addEventListener("input", (event) => {
  renderLibrary(event.target.value);
});

backButton.addEventListener("click", () => {
  closeSong();
});

window.addEventListener("popstate", () => {
  const id = window.location.hash.slice(1);

  if (id && musicLibrary.some((song) => song.id === id)) {
    openSong(id, false);
  } else {
    closeSong(false);
  }
});

/*
  Re-render the active PDF when orientation / window width changes so the
  pages continue fitting the device exactly.
*/
window.addEventListener("resize", () => {
  if (!activePdfResource) return;

  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    const resource = activePdfResource;
    renderPdfPages(resource);
  }, 250);
});

renderLibrary();

const initialId = window.location.hash.slice(1);

if (initialId && musicLibrary.some((song) => song.id === initialId)) {
  openSong(initialId, false);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
