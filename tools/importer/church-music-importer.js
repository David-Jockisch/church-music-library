const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ==========================================================
// CONFIG
// ==========================================================

// Files received from iPhone / iCloud land here.
const INBOX_DIR = String.raw`C:\Users\david\iCloudDrive\church_music_library`;

// This script lives at:
//   church-music-library/tools/importer/church-music-importer.js
//
// So two levels up is the repository root.
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const DOCUMENTS_DIR = path.join(REPO_ROOT, "documents");
const AUDIO_DIR = path.join(REPO_ROOT, "audio");
const LIBRARY_FILE = path.join(REPO_ROOT, "js", "music-library.js");

// ==========================================================
// HELPERS
// ==========================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function normalizeTitle(filename) {
  return path.basename(filename, path.extname(filename)).trim();
}

function makeId(title) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeJsString(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
}

function ensureDirectories() {
  for (const dir of [DOCUMENTS_DIR, AUDIO_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function readLibraryText() {
  if (!fs.existsSync(LIBRARY_FILE)) {
    throw new Error(`Could not find music library:\n${LIBRARY_FILE}`);
  }

  return fs.readFileSync(LIBRARY_FILE, "utf8");
}

function libraryAlreadyContains(libraryText, id, title) {
  const idPattern = new RegExp(
    String.raw`id\s*:\s*["'\`]${escapeRegExp(id)}["'\`]`,
    "i"
  );

  const titlePattern = new RegExp(
    String.raw`title\s*:\s*["'\`]${escapeRegExp(title)}["'\`]`,
    "i"
  );

  return idPattern.test(libraryText) || titlePattern.test(libraryText);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function copyFileSafe(source, destination) {
  if (fs.existsSync(destination)) {
    const sourceSize = fs.statSync(source).size;
    const destinationSize = fs.statSync(destination).size;

    if (sourceSize === destinationSize) {
      return { copied: false, reason: "already exists" };
    }

    throw new Error(
      `A different file already exists at:\n${destination}\n\n` +
      `Rename or remove the conflicting file before importing.`
    );
  }

  fs.copyFileSync(source, destination);
  return { copied: true };
}

function createLibraryEntry({
  id,
  title,
  artist,
  pdfFilename,
  mp3Filename
}) {
  const lines = [];

  lines.push("  {");
  lines.push(`    id: "${escapeJsString(id)}",`);
  lines.push(`    title: "${escapeJsString(title)}",`);

  if (artist) {
    lines.push(`    composer: "${escapeJsString(artist)}",`);
  } else {
    lines.push(`    composer: "",`);
  }

  lines.push(`    tags: ["worship"],`);

  if (pdfFilename) {
    lines.push("    documents: [");
    lines.push("      {");
    lines.push(`        label: "Sheet Music",`);
    lines.push(`        type: "pdf",`);
    lines.push(
      `        file: "documents/${escapeJsString(pdfFilename)}"`
    );
    lines.push("      }");
    lines.push("    ],");
  } else {
    lines.push("    documents: [],");
  }

  if (mp3Filename) {
    lines.push("    audio: [");
    lines.push("      {");
    lines.push(`        label: "Practice Track",`);
    lines.push(
      `        file: "audio/${escapeJsString(mp3Filename)}"`
    );
    lines.push("      }");
    lines.push("    ]");
  } else {
    lines.push("    audio: []");
  }

  lines.push("  }");

  return lines.join("\n");
}

function appendLibraryEntry(libraryText, entry) {
  const closingIndex = libraryText.lastIndexOf("];");

  if (closingIndex === -1) {
    throw new Error(
      "Could not find the closing ]; in js/music-library.js."
    );
  }

  const before = libraryText.slice(0, closingIndex).trimEnd();
  const after = libraryText.slice(closingIndex);

  // If the array already contains an object, add a comma before the new entry.
  const hasExistingEntries = /\{\s*id\s*:/.test(before);

  const updated =
    before +
    (hasExistingEntries ? ",\n\n" : "\n") +
    entry +
    "\n" +
    after;

  fs.writeFileSync(LIBRARY_FILE, updated, "utf8");
}

function scanInbox() {
  if (!fs.existsSync(INBOX_DIR)) {
    throw new Error(
      `Inbox folder does not exist:\n${INBOX_DIR}`
    );
  }

  const files = fs
    .readdirSync(INBOX_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const grouped = new Map();

  for (const filename of files) {
    const ext = path.extname(filename).toLowerCase();

    if (![".pdf", ".mp3"].includes(ext)) {
      continue;
    }

    const title = normalizeTitle(filename);
    const key = title.toLowerCase();

    if (!grouped.has(key)) {
      grouped.set(key, {
        title,
        pdf: null,
        mp3: null
      });
    }

    const item = grouped.get(key);

    if (ext === ".pdf") {
      item.pdf = filename;
    }

    if (ext === ".mp3") {
      item.mp3 = filename;
    }
  }

  return [...grouped.values()].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );
}

function printHeader() {
  console.clear();

  console.log("====================================================");
  console.log("            CHURCH MUSIC IMPORTER V1");
  console.log("====================================================");
  console.log("");
  console.log(`Inbox: ${INBOX_DIR}`);
  console.log("");
}

async function importSong(song) {
  const id = makeId(song.title);
  let libraryText = readLibraryText();

  if (libraryAlreadyContains(libraryText, id, song.title)) {
    console.log(`SKIPPED: "${song.title}" is already in the library.`);
    console.log("");
    return { status: "skipped" };
  }

  console.log("----------------------------------------------------");
  console.log(`Song: ${song.title}`);
  console.log(`PDF : ${song.pdf || "None found"}`);
  console.log(`MP3 : ${song.mp3 || "None found"}`);
  console.log("----------------------------------------------------");

  const choice = (
    await ask("Add this song? [Y]es / [N]o / [Q]uit: ")
  ).toLowerCase();

  if (choice === "q") {
    return { status: "quit" };
  }

  if (choice !== "y" && choice !== "yes") {
    console.log("Skipped.");
    console.log("");
    return { status: "skipped" };
  }

  const artist = await ask(
    "Artist / composer (optional - press Enter to leave blank): "
  );

  const confirmTitle = await ask(
    `Title [${song.title}] (press Enter to keep): `
  );

  const finalTitle = confirmTitle || song.title;
  const finalId = makeId(finalTitle);

  // Re-read in case an earlier item in this same run updated the library.
  libraryText = readLibraryText();

  if (libraryAlreadyContains(libraryText, finalId, finalTitle)) {
    console.log("");
    console.log(`SKIPPED: "${finalTitle}" is already in the library.`);
    console.log("");
    return { status: "skipped" };
  }

  let copiedPdf = null;
  let copiedMp3 = null;

  try {
    if (song.pdf) {
      const source = path.join(INBOX_DIR, song.pdf);
      const destination = path.join(DOCUMENTS_DIR, song.pdf);

      copyFileSafe(source, destination);
      copiedPdf = song.pdf;
    }

    if (song.mp3) {
      const source = path.join(INBOX_DIR, song.mp3);
      const destination = path.join(AUDIO_DIR, song.mp3);

      copyFileSafe(source, destination);
      copiedMp3 = song.mp3;
    }

    const entry = createLibraryEntry({
      id: finalId,
      title: finalTitle,
      artist,
      pdfFilename: copiedPdf,
      mp3Filename: copiedMp3
    });

    appendLibraryEntry(libraryText, entry);

    console.log("");
    console.log(`ADDED: ${finalTitle}`);

    if (copiedPdf) {
      console.log(`  PDF -> documents\\${copiedPdf}`);
    }

    if (copiedMp3) {
      console.log(`  MP3 -> audio\\${copiedMp3}`);
    }

    console.log("  Library -> js\\music-library.js");
    console.log("");

    return { status: "added" };
  } catch (error) {
    console.log("");
    console.error("IMPORT FAILED:");
    console.error(error.message);
    console.log("");

    return { status: "error" };
  }
}

async function main() {
  printHeader();
  ensureDirectories();

  const songs = scanInbox();

  if (!songs.length) {
    console.log("No PDF or MP3 files were found in the inbox.");
    console.log("");
    await ask("Press Enter to exit...");
    rl.close();
    return;
  }

  const libraryText = readLibraryText();

  const newSongs = songs.filter((song) => {
    const id = makeId(song.title);
    return !libraryAlreadyContains(libraryText, id, song.title);
  });

  console.log(`Found ${songs.length} song file set(s).`);
  console.log(`${newSongs.length} appear to be new.`);
  console.log("");

  if (!newSongs.length) {
    console.log("Nothing new to import.");
    console.log("");
    await ask("Press Enter to exit...");
    rl.close();
    return;
  }

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const song of newSongs) {
    const result = await importSong(song);

    if (result.status === "quit") {
      break;
    }

    if (result.status === "added") {
      added += 1;
    } else if (result.status === "error") {
      errors += 1;
    } else {
      skipped += 1;
    }
  }

  console.log("====================================================");
  console.log("                    COMPLETE");
  console.log("====================================================");
  console.log(`Added   : ${added}`);
  console.log(`Skipped : ${skipped}`);
  console.log(`Errors  : ${errors}`);
  console.log("");

  if (added > 0) {
    console.log("The files and music-library.js are ready.");
    console.log("You can now commit and push them to GitHub.");
    console.log("");
  }

  await ask("Press Enter to exit...");
  rl.close();
}

main().catch(async (error) => {
  console.error("");
  console.error("Importer stopped because of an error:");
  console.error(error);
  console.error("");

  await ask("Press Enter to exit...");
  rl.close();
});
