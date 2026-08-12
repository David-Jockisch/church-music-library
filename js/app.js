const searchInput = document.getElementById("searchInput");
const songList = document.getElementById("songList");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const alphabetNav = document.getElementById("alphabetNav");

const refreshLibraryButton = document.getElementById("refreshLibraryButton");
const libraryUpdateText = document.getElementById("libraryUpdateText");

const libraryView = document.getElementById("libraryView");
const songView = document.getElementById("songView");
const backButton = document.getElementById("backButton");

const songTitle = document.getElementById("songTitle");
const songMeta = document.getElementById("songMeta");
const resourceActions = document.getElementById("resourceActions");
const sharePrintButton = document.getElementById("sharePrintButton");
const practiceButton = document.getElementById("practiceButton");
const playsetToggleButton = document.getElementById("playsetToggleButton");
const exitPracticeButton = document.getElementById("exitPracticeButton");

const playsetSlots = document.getElementById("playsetSlots");
const playsetHint = document.getElementById("playsetHint");
const clearPlaysetButton = document.getElementById("clearPlaysetButton");

const trackPicker = document.getElementById("trackPicker");
const trackPickerSong = document.getElementById("trackPickerSong");
const trackPickerOptions = document.getElementById("trackPickerOptions");
const closeTrackPickerButton = document.getElementById("closeTrackPickerButton");

const documentEmpty = document.getElementById("documentEmpty");
const pdfStatus = document.getElementById("pdfStatus");
const pdfViewer = document.getElementById("pdfViewer");
const wordNotice = document.getElementById("wordNotice");
const wordOpenLink = document.getElementById("wordOpenLink");

const audioDock = document.getElementById("audioDock");
const audioTrackTitle = document.getElementById("audioTrackTitle");
const audioPlayer = document.getElementById("audioPlayer");

const fitMusicButton = document.getElementById("fitMusicButton");
const rewindButton = document.getElementById("rewindButton");
const playPauseButton = document.getElementById("playPauseButton");
const playPauseIcon = document.getElementById("playPauseIcon");
const forwardButton = document.getElementById("forwardButton");
const audioSeek = document.getElementById("audioSeek");
const currentTime = document.getElementById("currentTime");
const durationTime = document.getElementById("durationTime");

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

let activePdfDocument = null;
let activePdfResource = null;
let activeResource = null;
let activeSong = null;
let activePracticeTrack = null;
let pdfRenderToken = 0;

const PLAYSET_STORAGE_KEY = "churchMusicWeeklyPlayset";
const PLAYSET_MAX = 3;
let weeklyPlayset = loadWeeklyPlayset();
let resizeTimer = null;

/* Practice-sheet zoom state */
let practiceZoom = 1;
const PRACTICE_ZOOM_MIN = 1;
const PRACTICE_ZOOM_MAX = 3;

let pinchStartDistance = 0;
let pinchStartZoom = 1;

/*
  Keep a live copy of the library instead of reading directly from the
  original const. This lets the PWA fetch a newly-published music-library.js
  and update itself without closing the app.
*/
let liveMusicLibrary = [...musicLibrary];

let sortedLibrary = [...liveMusicLibrary].sort((a, b) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
);

function loadWeeklyPlayset() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAYSET_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.slice(0, PLAYSET_MAX) : [];
  } catch {
    return [];
  }
}

function saveWeeklyPlayset() {
  localStorage.setItem(PLAYSET_STORAGE_KEY, JSON.stringify(weeklyPlayset));
}

function getPlaysetSongs() {
  return weeklyPlayset
    .map((id) => liveMusicLibrary.find((song) => song.id === id))
    .filter(Boolean);
}

function renderWeeklyPlayset() {
  const songs = getPlaysetSongs();

  playsetSlots.innerHTML = Array.from({ length: PLAYSET_MAX }, (_, index) => {
    const song = songs[index];

    if (!song) {
      return `
        <div class="playset-slot empty">
          <span class="playset-number">${index + 1}</span>
          <span class="playset-empty-label">Open a song and tap Add to Set</span>
        </div>
      `;
    }

    return `
      <div class="playset-slot">
        <button class="playset-song-button" type="button" data-playset-open="${song.id}">
          <span class="playset-number">${index + 1}</span>
          <span class="playset-song-copy">
            <strong>${song.title}</strong>
            <small>${song.composer || "Worship song"}</small>
          </span>
        </button>
        <button class="playset-remove-button" type="button" data-playset-remove="${song.id}" aria-label="Remove ${song.title} from weekly set">×</button>
      </div>
    `;
  }).join("");

  playsetHint.textContent = songs.length
    ? `${songs.length} of ${PLAYSET_MAX} songs selected • saved on this device`
    : `Add up to ${PLAYSET_MAX} songs from the library.`;

  clearPlaysetButton.classList.toggle("hidden", songs.length === 0);

  playsetSlots.querySelectorAll("[data-playset-open]").forEach((button) => {
    button.addEventListener("click", () => openSong(button.dataset.playsetOpen));
  });

  playsetSlots.querySelectorAll("[data-playset-remove]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      removeSongFromPlayset(button.dataset.playsetRemove);
    });
  });

  updatePlaysetToggleButton();
}

function updatePlaysetToggleButton() {
  if (!playsetToggleButton || !activeSong) return;

  const inSet = weeklyPlayset.includes(activeSong.id);
  playsetToggleButton.textContent = inSet ? "Remove from Set" : "Add to Set";
  playsetToggleButton.classList.toggle("active", inSet);
}

function addSongToPlayset(songId) {
  if (weeklyPlayset.includes(songId)) return true;

  if (weeklyPlayset.length >= PLAYSET_MAX) {
    window.alert("Your weekly playset already has 3 songs. Remove one before adding another.");
    return false;
  }

  weeklyPlayset.push(songId);
  saveWeeklyPlayset();
  renderWeeklyPlayset();
  return true;
}

function removeSongFromPlayset(songId) {
  weeklyPlayset = weeklyPlayset.filter((id) => id !== songId);
  saveWeeklyPlayset();
  renderWeeklyPlayset();
}

function toggleActiveSongInPlayset() {
  if (!activeSong) return;

  if (weeklyPlayset.includes(activeSong.id)) {
    removeSongFromPlayset(activeSong.id);
  } else {
    addSongToPlayset(activeSong.id);
  }

  updatePlaysetToggleButton();
}

function clearWeeklyPlayset() {
  if (!weeklyPlayset.length) return;

  if (!window.confirm("Reset this week's playset?")) return;

  weeklyPlayset = [];
  saveWeeklyPlayset();
  renderWeeklyPlayset();
}

function friendlyTrackType(track) {
  const type = (track.type || "practice").toLowerCase();

  const labels = {
    practice: "Practice Track",
    bass: "Bass Part",
    drums: "Drums",
    live: "Live / Full Band"
  };

  return labels[type] || track.label || "Audio Track";
}

function closeTrackPicker() {
  trackPicker.classList.add("hidden");
  document.body.classList.remove("track-picker-open");
}

function choosePracticeTrack(track) {
  activePracticeTrack = track;
  setAudioTrack(activeSong, track);
  closeTrackPicker();
  enterPracticeModeWithSelectedTrack();
}

function openTrackPicker() {
  if (!activeSong) return;

  const tracks = activeSong.audio || [];
  if (!tracks.length) return;

  if (tracks.length === 1) {
    choosePracticeTrack(tracks[0]);
    return;
  }

  trackPickerSong.textContent = activeSong.title;

  trackPickerOptions.innerHTML = tracks.map((track, index) => `
    <button class="track-picker-option" type="button" data-track-index="${index}">
      <span class="track-picker-icon">${(track.type || "practice") === "live" ? "♫" : "▶"}</span>
      <span>
        <strong>${friendlyTrackType(track)}</strong>
        <small>${track.label || friendlyTrackType(track)}</small>
      </span>
    </button>
  `).join("");

  trackPickerOptions.querySelectorAll("[data-track-index]").forEach((button) => {
    button.addEventListener("click", () => {
      choosePracticeTrack(tracks[Number(button.dataset.trackIndex)]);
    });
  });

  trackPicker.classList.remove("hidden");
  document.body.classList.add("track-picker-open");
}

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

function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function setLibraryStatus(text) {
  libraryUpdateText.textContent = text;
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
  }

  emptyState.classList.toggle("hidden", matches.length > 0);

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

  activeResource = null;

  wordNotice.classList.add("hidden");
  documentEmpty.classList.remove("hidden");

  sharePrintButton.classList.add("hidden");
  practiceButton.classList.add("hidden");

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

      const baseCssWidth = availableWidth;
      const baseCssHeight = baseViewport.height * displayScale;

      canvas.dataset.baseWidth = String(baseCssWidth);
      canvas.dataset.baseHeight = String(baseCssHeight);

      canvas.style.width = `${baseCssWidth * practiceZoom}px`;
      canvas.style.height = `${baseCssHeight * practiceZoom}px`;

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

  activeResource = resource;

  /*
    Practice availability depends ONLY on whether this song has audio.
    resetDocumentViewer() hides action buttons, so restore Practice here
    after every document selection.
  */
  const hasAudio = (activeSong?.audio || []).length > 0;
  practiceButton.classList.toggle("hidden", !hasAudio);

  /*
    The normal song landing page is now the document viewing / printing area.
    Practice mode uses the same rendered PDF, but strips away the normal
    library controls and exposes the large rehearsal player.
  */
  if (resource.type === "pdf") {
    sharePrintButton.classList.remove("hidden");
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


function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function updatePlayPauseButton() {
  const isPlaying = !audioPlayer.paused && !audioPlayer.ended;

  playPauseIcon.textContent = isPlaying ? "❚❚" : "▶";
  playPauseButton.setAttribute(
    "aria-label",
    isPlaying ? "Pause" : "Play"
  );
}

function updateAudioProgress() {
  const duration = audioPlayer.duration;
  const position = audioPlayer.currentTime;

  currentTime.textContent = formatAudioTime(position);
  durationTime.textContent = formatAudioTime(duration);

  if (Number.isFinite(duration) && duration > 0) {
    audioSeek.value = String((position / duration) * 100);
    audioSeek.disabled = false;
  } else {
    audioSeek.value = "0";
    audioSeek.disabled = true;
  }
}

function resetPracticePlayerUi() {
  audioSeek.value = "0";
  audioSeek.disabled = true;

  currentTime.textContent = "0:00";
  durationTime.textContent = "0:00";

  updatePlayPauseButton();
}

async function toggleAudioPlayback() {
  if (!audioPlayer.src) return;

  try {
    if (audioPlayer.paused || audioPlayer.ended) {
      await audioPlayer.play();
    } else {
      audioPlayer.pause();
    }
  } catch (error) {
    console.error("Audio playback failed:", error);
  }
}

function skipAudio(seconds) {
  if (!Number.isFinite(audioPlayer.duration)) return;

  const nextTime = Math.min(
    Math.max(audioPlayer.currentTime + seconds, 0),
    audioPlayer.duration
  );

  audioPlayer.currentTime = nextTime;
  updateAudioProgress();
}

function setAudioTrack(song, track) {
  audioPlayer.pause();

  if (!song || !track) {
    activePracticeTrack = null;
    audioPlayer.removeAttribute("src");
    audioPlayer.load();
    resetPracticePlayerUi();
    audioDock.classList.add("hidden");
    songView.classList.remove("has-audio");
    return;
  }

  activePracticeTrack = track;
  audioTrackTitle.textContent = `${song.title} — ${friendlyTrackType(track)}`;
  audioPlayer.src = track.file;
  audioPlayer.load();
  resetPracticePlayerUi();

  audioDock.classList.add("hidden");
  songView.classList.remove("has-audio");
}

function setAudio(song) {
  const tracks = song.audio || [];
  setAudioTrack(song, tracks[0] || null);
}



function clampPracticeZoom(value) {
  return Math.min(
    PRACTICE_ZOOM_MAX,
    Math.max(PRACTICE_ZOOM_MIN, value)
  );
}

function applyPracticeZoom(nextZoom, focusX = null, focusY = null) {
  const panel = documentPanel;
  const oldZoom = practiceZoom;
  const zoom = clampPracticeZoom(nextZoom);

  if (!panel || Math.abs(zoom - oldZoom) < 0.001) return;

  /*
    Preserve the point beneath the user's fingers while changing zoom.
  */
  const panelRect = panel.getBoundingClientRect();

  const localX =
    focusX == null
      ? panel.clientWidth / 2
      : focusX - panelRect.left;

  const localY =
    focusY == null
      ? panel.clientHeight / 2
      : focusY - panelRect.top;

  const contentX = (panel.scrollLeft + localX) / oldZoom;
  const contentY = (panel.scrollTop + localY) / oldZoom;

  practiceZoom = zoom;

  pdfViewer.querySelectorAll(".pdf-page").forEach((canvas) => {
    const baseWidth = Number(canvas.dataset.baseWidth);
    const baseHeight = Number(canvas.dataset.baseHeight);

    if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight)) return;

    canvas.style.width = `${baseWidth * practiceZoom}px`;
    canvas.style.height = `${baseHeight * practiceZoom}px`;
  });

  pdfViewer.style.width = `${100 * practiceZoom}%`;

  requestAnimationFrame(() => {
    panel.scrollLeft = contentX * practiceZoom - localX;
    panel.scrollTop = contentY * practiceZoom - localY;
  });

  fitMusicButton.classList.toggle(
    "zoom-active",
    practiceZoom > 1.01
  );
}

function resetPracticeZoom() {
  practiceZoom = 1;

  pdfViewer.style.width = "100%";

  pdfViewer.querySelectorAll(".pdf-page").forEach((canvas) => {
    const baseWidth = Number(canvas.dataset.baseWidth);
    const baseHeight = Number(canvas.dataset.baseHeight);

    if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight)) return;

    canvas.style.width = `${baseWidth}px`;
    canvas.style.height = `${baseHeight}px`;
  });

  documentPanel.scrollLeft = 0;
  documentPanel.scrollTop = 0;

  fitMusicButton.classList.remove("zoom-active");
}

function touchDistance(touchA, touchB) {
  return Math.hypot(
    touchB.clientX - touchA.clientX,
    touchB.clientY - touchA.clientY
  );
}

function touchMidpoint(touchA, touchB) {
  return {
    x: (touchA.clientX + touchB.clientX) / 2,
    y: (touchA.clientY + touchB.clientY) / 2
  };
}

function handlePracticeTouchStart(event) {
  if (!document.body.classList.contains("practice-mode")) return;
  if (!activePdfResource) return;

  if (event.touches.length === 2) {
    pinchStartDistance = touchDistance(
      event.touches[0],
      event.touches[1]
    );

    pinchStartZoom = practiceZoom;

    /*
      Stop iOS from zooming the entire PWA.
    */
    event.preventDefault();
  }
}

function handlePracticeTouchMove(event) {
  if (!document.body.classList.contains("practice-mode")) return;
  if (!activePdfResource) return;
  if (event.touches.length !== 2 || pinchStartDistance <= 0) return;

  event.preventDefault();

  const distance = touchDistance(
    event.touches[0],
    event.touches[1]
  );

  const scale = distance / pinchStartDistance;
  const midpoint = touchMidpoint(
    event.touches[0],
    event.touches[1]
  );

  applyPracticeZoom(
    pinchStartZoom * scale,
    midpoint.x,
    midpoint.y
  );
}

function handlePracticeTouchEnd(event) {
  if (event.touches.length < 2) {
    pinchStartDistance = 0;
    pinchStartZoom = practiceZoom;
  }
}

function enterPracticeModeWithSelectedTrack() {
  if (!activeSong || !(activeSong.audio || []).length) return;

  resetPracticeZoom();

  document.body.classList.add("practice-mode");
  songView.classList.add("practice-mode-active");
  songView.classList.add("has-audio");

  /*
    Audio-only songs are valid. If there is no PDF, hide the normal
    "No document selected" message so Practice remains a clean screen.
  */
  const hasPdf =
    (activeSong.documents || []).some(
      (resource) => resource.type === "pdf"
    );

  document.body.classList.toggle(
    "practice-audio-only",
    !hasPdf
  );

  if (!hasPdf) {
    documentEmpty.classList.add("hidden");
    pdfStatus.classList.add("hidden");
    pdfViewer.classList.add("hidden");
    wordNotice.classList.add("hidden");
  }

  audioDock.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}

function exitPracticeMode() {
  audioPlayer.pause();
  resetPracticeZoom();

  document.body.classList.remove(
    "practice-mode",
    "practice-audio-only"
  );

  songView.classList.remove(
    "practice-mode-active",
    "has-audio"
  );

  audioDock.classList.add("hidden");

  /*
    Restore the correct normal landing state when leaving audio-only
    practice mode.
  */
  if (
    activeSong &&
    !(activeSong.documents || []).length
  ) {
    documentEmpty.classList.remove("hidden");
  }

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}

function populateSongView(song) {
  activeSong = song;
  updatePlaysetToggleButton();

  songTitle.textContent = song.title;

  songMeta.textContent = [
    song.composer,
    ...(song.tags || [])
  ]
    .filter(Boolean)
    .join(" • ");

  resourceActions.innerHTML = "";

  const documents = song.documents || [];
  const hasAudio = (song.audio || []).length > 0;

  /*
    Practice is an AUDIO feature. It remains available even when a song
    has no PDF or other document.
  */
  practiceButton.classList.toggle("hidden", !hasAudio);

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

    if (hasAudio) {
      practiceButton.classList.remove("hidden");
    }
  }

  setAudio(song);
}

function openSong(id, updateHistory = true) {
  const song = liveMusicLibrary.find((item) => item.id === id);

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
  exitPracticeMode();

  songView.classList.add("hidden");
  libraryView.classList.remove("hidden");

  activeSong = null;

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

/* ==========================================================
   NATIVE SHARE / PRINT
   ========================================================== */

async function shareCurrentDocument() {
  if (!activeResource?.file) return;

  const originalText = sharePrintButton.textContent;
  sharePrintButton.disabled = true;

  /*
    Desktop browsers already have excellent native print dialogs.
    Printing the current rendered PDF view is more reliable than trying
    to route desktop users through the Web Share API.
  */
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (!isIOS) {
    sharePrintButton.textContent = "Opening Print…";

    try {
      window.print();
    } finally {
      sharePrintButton.disabled = false;
      sharePrintButton.textContent = originalText;
    }

    return;
  }

  /*
    iPhone/iPad — fetch the actual PDF and hand it to the native iOS
    Share Sheet. The system Print action is available there.
  */
  sharePrintButton.textContent = "Preparing…";

  try {
    const separator = activeResource.file.includes("?") ? "&" : "?";

    const response = await fetch(
      `${activeResource.file}${separator}share=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`PDF request failed with ${response.status}`);
    }

    const blob = await response.blob();

    const filename =
      activeResource.file.split("/").pop().split("?")[0] ||
      `${activeSong?.title || "sheet-music"}.pdf`;

    const file = new File(
      [blob],
      decodeURIComponent(filename),
      { type: blob.type || "application/pdf" }
    );

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: activeSong?.title || "Sheet Music",
        files: [file]
      });

      return;
    }

    /*
      Older iOS fallback: share the original PDF URL.
    */
    if (navigator.share) {
      const absoluteUrl =
        new URL(activeResource.file, window.location.href).href;

      await navigator.share({
        title: activeSong?.title || "Sheet Music",
        url: absoluteUrl
      });

      return;
    }

    window.open(activeResource.file, "_blank", "noopener");
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error("Share / Print failed:", error);
      window.open(activeResource.file, "_blank", "noopener");
    }
  } finally {
    sharePrintButton.disabled = false;
    sharePrintButton.textContent = originalText;
  }
}


/* ==========================================================
   PWA LIBRARY REFRESH
   ========================================================== */

async function fetchLatestLibrary() {
  const url = `js/music-library.js?refresh=${Date.now()}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache"
    }
  });

  if (!response.ok) {
    throw new Error(`Library request failed with ${response.status}`);
  }

  const source = await response.text();

  /*
    music-library.js declares:
      const musicLibrary = [ ... ];

    Evaluate the fetched file in an isolated function and return that array.
    This lets us update the running PWA without reloading the whole app.
  */
  const getLibrary = new Function(`
    ${source}
    return typeof musicLibrary !== "undefined" ? musicLibrary : [];
  `);

  const latestLibrary = getLibrary();

  if (!Array.isArray(latestLibrary)) {
    throw new Error("The refreshed music library was not valid.");
  }

  return {
    library: latestLibrary,
    lastModified: response.headers.get("last-modified")
  };
}

async function refreshLibrary() {
  const originalText = refreshLibraryButton.textContent;

  refreshLibraryButton.disabled = true;
  refreshLibraryButton.textContent = "Refreshing…";
  setLibraryStatus("Checking GitHub Pages for updates…");

  try {
    /*
      Ask the service worker to check for a newer version too. The library
      fetch below does not depend on this finishing successfully.
    */
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        registration.update().catch(() => {});
      }
    }

    const result = await fetchLatestLibrary();

    liveMusicLibrary = result.library;

    sortedLibrary = [...liveMusicLibrary].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );

    renderLibrary(searchInput.value);
    renderWeeklyPlayset();

    const serverDate = result.lastModified
      ? formatDateTime(result.lastModified)
      : "";

    if (serverDate) {
      setLibraryStatus(`Library updated: ${serverDate}`);
    } else {
      setLibraryStatus(`Library checked: ${formatDateTime(new Date())}`);
    }

    localStorage.setItem(
      "churchMusicLibraryLastRefresh",
      new Date().toISOString()
    );

    /*
      If a song is currently open and still exists after the refresh,
      quietly update its in-memory data without interrupting playback.
    */
    if (activeSong) {
      const refreshedSong = liveMusicLibrary.find(
        (song) => song.id === activeSong.id
      );

      if (refreshedSong) {
        activeSong = refreshedSong;
      }
    }
  } catch (error) {
    console.error("Library refresh failed:", error);
    setLibraryStatus("Refresh failed — using saved library");
  } finally {
    refreshLibraryButton.disabled = false;
    refreshLibraryButton.textContent = originalText;
  }
}

/* ==========================================================
   EVENTS
   ========================================================== */

searchInput.addEventListener("input", (event) => {
  renderLibrary(event.target.value);
});

backButton.addEventListener("click", () => {
  closeSong();
});

sharePrintButton.addEventListener("click", shareCurrentDocument);
practiceButton.addEventListener("click", openTrackPicker);
playsetToggleButton.addEventListener("click", toggleActiveSongInPlayset);
clearPlaysetButton.addEventListener("click", clearWeeklyPlayset);
closeTrackPickerButton.addEventListener("click", closeTrackPicker);
trackPicker.addEventListener("click", (event) => {
  if (event.target === trackPicker) closeTrackPicker();
});
exitPracticeButton.addEventListener("click", exitPracticeMode);
refreshLibraryButton.addEventListener("click", refreshLibrary);

window.addEventListener("popstate", () => {
  const id = window.location.hash.slice(1);

  if (id && liveMusicLibrary.some((song) => song.id === id)) {
    openSong(id, false);
  } else {
    closeSong(false);
  }
});

window.addEventListener("resize", () => {
  if (!activePdfResource) return;

  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    const resource = activePdfResource;
    renderPdfPages(resource);
  }, 250);
});


/* ==========================================================
   PRACTICE AUDIO CONTROLS
   ========================================================== */

fitMusicButton.addEventListener("click", resetPracticeZoom);

playPauseButton.addEventListener("click", toggleAudioPlayback);

rewindButton.addEventListener("click", () => {
  skipAudio(-10);
});

forwardButton.addEventListener("click", () => {
  skipAudio(10);
});

audioSeek.addEventListener("input", () => {
  if (!Number.isFinite(audioPlayer.duration)) return;

  const percent = Number(audioSeek.value) / 100;
  audioPlayer.currentTime = percent * audioPlayer.duration;

  updateAudioProgress();
});

audioPlayer.addEventListener("loadedmetadata", updateAudioProgress);
audioPlayer.addEventListener("durationchange", updateAudioProgress);
audioPlayer.addEventListener("timeupdate", updateAudioProgress);
audioPlayer.addEventListener("play", updatePlayPauseButton);
audioPlayer.addEventListener("pause", updatePlayPauseButton);

audioPlayer.addEventListener("ended", () => {
  updatePlayPauseButton();
  updateAudioProgress();
});


/*
  Pinch zoom is bound only to the document panel.
  The fixed player never participates in the gesture.
*/
documentPanel.addEventListener(
  "touchstart",
  handlePracticeTouchStart,
  { passive: false }
);

documentPanel.addEventListener(
  "touchmove",
  handlePracticeTouchMove,
  { passive: false }
);

documentPanel.addEventListener(
  "touchend",
  handlePracticeTouchEnd,
  { passive: true }
);

documentPanel.addEventListener(
  "touchcancel",
  handlePracticeTouchEnd,
  { passive: true }
);

/* ==========================================================
   INITIAL LOAD
   ========================================================== */

renderLibrary();
renderWeeklyPlayset();

const previousRefresh = localStorage.getItem(
  "churchMusicLibraryLastRefresh"
);

if (previousRefresh) {
  setLibraryStatus(
    `Last checked: ${formatDateTime(previousRefresh)}`
  );
} else {
  setLibraryStatus(
    `Library loaded: ${formatDateTime(new Date())}`
  );
}

const initialId = window.location.hash.slice(1);

if (
  initialId &&
  liveMusicLibrary.some((song) => song.id === initialId)
) {
  openSong(initialId, false);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
