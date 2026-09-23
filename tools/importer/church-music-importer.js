const readline = require("readline");
const { execFileSync } = require("child_process");
const path = require("path");

const {
  CONFIG,
  addOrUpdateSongAsset,
  ensureTrackTypes,
  findSongMatches,
  getR2Client,
  makeId,
  readLibrary,
  scanInbox,
  uploadFile,
  writeLibrary
} = require("../r2/r2-shared");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function line(char = "=", width = 68) { return char.repeat(width); }
function shortType(asset) { return asset.type === "sheet" ? asset.label : asset.label; }
function findExistingAsset(song, asset) {
  const entries = asset.type === "sheet" ? song.documents || [] : song.audio || [];
  return entries.some((item) => {
    try { return decodeURIComponent(new URL(item.file).pathname).endsWith(`/${asset.folder}/${asset.filename}`); }
    catch { return false; }
  });
}
function sameKind(song, asset) {
  return asset.type === "sheet"
    ? (song.documents || []).filter((item) => (item.sheetType || "sheet") === asset.sheetType)
    : (song.audio || []).filter((item) => (item.type || "practice") === asset.type);
}
function initialQueue(assets, library) {
  return assets.map((asset) => {
    const matches = findSongMatches(library, asset.filename, asset.type);
    const song = matches.exact?.song || (matches.suggestions[0]?.score >= 0.82 ? matches.suggestions[0].song : null);
    const existing = library.some((entry) => findExistingAsset(entry, asset));
    return { asset, song, title: song ? song.title : asset.inferredTitle, artist: "", action: existing ? "skip" : "add", replacement: -1, existing, reviewed: false };
  });
}
function label(item) {
  if (item.action === "skip") return item.existing ? "Already imported" : "Skipped";
  const target = item.song ? item.song.title : `NEW: ${item.title}`;
  const operation = item.replacement >= 0 ? `Replace #${item.replacement + 1}` : "Add";
  return `${operation} ${shortType(item.asset)} → ${target}`;
}
function showQueue(queue) {
  console.log("\n" + line());
  console.log("  IMPORT QUEUE — nothing uploads until you choose Upload");
  console.log(line());
  queue.forEach((item, index) => {
    if (item.existing && !item.reviewed) return;
    console.log(`${index + 1}. ${item.asset.filename}`);
    console.log(`   ${label(item)}${item.reviewed ? "" : "  [review suggested choice]"}`);
  });
  const hidden = queue.filter((item) => item.existing && !item.reviewed).length;
  if (hidden) console.log(`\n${hidden} already imported file(s) hidden. Enter A to show them.`);
  console.log("\nEnter a file number to edit, U to upload, A to show all, or Q to quit.");
}
async function choice(question, valid) {
  while (true) {
    const answer = (await ask(question)).toLowerCase();
    if (valid.includes(answer)) return answer;
    console.log(`Choose ${valid.join(", ")}.`);
  }
}
async function selectSong(item, library) {
  const matches = findSongMatches(library, item.asset.filename, item.asset.type);
  console.log("\nSuggested matches:");
  matches.suggestions.filter((entry) => entry.score >= 0.45).forEach((entry, i) => console.log(`  ${i + 1}. ${entry.song.title} (${Math.round(entry.score * 100)}%)`));
  console.log("  S. Search all songs    N. New song    B. Back");
  while (true) {
    const answer = (await ask("Song: ")).toLowerCase();
    if (answer === "b") return;
    if (answer === "n") {
      const title = await ask(`Title [${item.asset.inferredTitle}]: `);
      item.song = null;
      item.title = title || item.asset.inferredTitle;
      item.artist = await ask("Artist / composer (optional): ");
      item.action = "add"; item.replacement = -1; return;
    }
    if (answer === "s") {
      const query = (await ask("Search song title: ")).toLowerCase();
      const found = library.filter((song) => song.title.toLowerCase().includes(query)).slice(0, 30);
      if (!query || !found.length) { console.log("No matches. Try another search."); continue; }
      found.forEach((song, i) => console.log(`  ${i + 1}. ${song.title}`));
      const selected = Number(await ask("Number (Enter to cancel): "));
      if (selected >= 1 && selected <= found.length) {
        item.song = found[selected - 1]; item.title = item.song.title;
        item.action = "add"; item.replacement = -1; return;
      }
      continue;
    }
    const suggested = matches.suggestions.filter((entry) => entry.score >= 0.45);
    const selected = Number(answer);
    if (selected >= 1 && selected <= suggested.length) {
      item.song = suggested[selected - 1].song; item.title = item.song.title;
      item.action = "add"; item.replacement = -1; return;
    }
    console.log("Choose a shown option.");
  }
}
async function editItem(item, library) {
  item.reviewed = true;
  while (true) {
    console.log(`\n${line("-")}\n${item.asset.filename}\n${label(item)}`);
    console.log("  1. Choose song / edit new title and artist");
    console.log("  2. Change file type or label");
    console.log("  3. Add, replace an existing entry, or skip");
    console.log("  B. Back to queue");
    const answer = await choice("Edit: ", ["1", "2", "3", "b"]);
    if (answer === "b") return;
    if (answer === "1") await selectSong(item, library);
    if (answer === "2") {
      if (item.asset.type === "sheet") {
        const types = [["sheet", "Sheet Music"], ["bass", "Bass"], ["guitar", "Guitar"], ["chords", "Chords"], ["lead", "Lead Sheet"]];
        types.forEach(([type, name], i) => console.log(`  ${i + 1}. ${name}`));
        const selected = await choice("Sheet type: ", ["1", "2", "3", "4", "5"]);
        [item.asset.sheetType, item.asset.label] = types[Number(selected) - 1];
        item.asset.label = (await ask(`Label [${item.asset.label}]: `)) || item.asset.label;
      } else {
        const types = [["practice", "Practice Track"], ["bass", "Bass Part"], ["drums", "Drums Part"], ["live", "Live Service"]];
        types.forEach(([type, name], i) => console.log(`  ${i + 1}. ${name}`));
        const selected = await choice("Audio type: ", ["1", "2", "3", "4"]);
        [item.asset.type, item.asset.label] = types[Number(selected) - 1];
        item.asset.folder = item.asset.type;
        item.asset.label = (await ask(`Label [${item.asset.label}]: `)) || item.asset.label;
      }
      item.replacement = -1;
    }
    if (answer === "3") {
      console.log("  A. Add another entry   R. Replace an existing entry   S. Skip");
      const action = await choice("Action: ", ["a", "r", "s"]);
      if (action === "s") { item.action = "skip"; item.replacement = -1; }
      if (action === "a") { item.action = "add"; item.replacement = -1; }
      if (action === "r") {
        const entries = item.song ? sameKind(item.song, item.asset) : [];
        if (!entries.length) { console.log("No entries of this type to replace. Choose a song and type first."); continue; }
        entries.forEach((entry, i) => console.log(`  ${i + 1}. ${entry.label || "Unnamed"} — ${entry.file}`));
        const selected = Number(await ask("Entry number (Enter to cancel): "));
        if (selected >= 1 && selected <= entries.length) {
          item.action = "add";
          item.replacement = (item.asset.type === "sheet" ? item.song.documents : item.song.audio).indexOf(entries[selected - 1]);
        }
      }
    }
  }
}
async function uploadQueue(queue, library) {
  const active = queue.filter((item) => item.action === "add");
  if (!active.length) { console.log("Nothing selected for upload."); return []; }
  const pending = active.filter((item) => !item.reviewed);
  if (pending.length) {
    console.log(`\n${pending.length} suggested choice(s) have not been reviewed. Open each file before uploading.`);
    return null;
  }
  const titles = new Map();
  for (const item of active) {
    if (item.song || !item.title.trim()) continue;
    const key = makeId(item.title);
    const existing = library.find((song) => song.id === key);
    if (existing) { console.log(`\nNew song "${item.title}" conflicts with existing "${existing.title}". Edit its song choice.`); return null; }
    if (!titles.has(key)) titles.set(key, item);
  }
  console.log("\nFINAL REVIEW");
  active.forEach((item) => console.log(`  ${item.asset.filename} → ${label(item)}`));
  if (await choice("Upload these files and update the library? [y/N]: ", ["y", "n", ""]) !== "y") return null;
  const client = getR2Client();
  const results = [];
  const created = new Map();
  for (const item of active) {
    try {
      let song = item.song;
      if (!song) {
        const id = makeId(item.title);
        song = created.get(id);
        if (!song) {
          song = { id, title: item.title, composer: item.artist, tags: ["worship"], documents: [], audio: [] };
          created.set(id, song);
        }
      }
      if (findExistingAsset(song, item.asset)) { results.push({ status: "skipped", filename: item.asset.filename }); continue; }
      const result = await uploadFile({ client, sourcePath: item.asset.fullPath, objectKey: `${item.asset.folder}/${item.asset.filename}`, overwrite: false });
      if (!library.includes(song)) library.push(song);
      const entries = item.asset.type === "sheet" ? (song.documents ||= []) : (song.audio ||= []);
      if (item.replacement >= 0 && !item.song) throw new Error("Replacement requires an existing song");
      if (item.replacement >= 0) {
        const entry = entries[item.replacement];
        if (!entry) throw new Error("The selected entry to replace is missing");
        Object.assign(entry, item.asset.type === "sheet"
          ? { label: item.asset.label, type: "pdf", sheetType: item.asset.sheetType, file: result.url }
          : { label: item.asset.label, type: item.asset.type, file: result.url });
      } else addOrUpdateSongAsset(song, { type: item.asset.type, label: item.asset.label, sheetType: item.asset.sheetType, publicUrl: result.url });
      writeLibrary(library);
      console.log(`  ✓ ${item.asset.filename} → ${song.title}`);
      results.push({ status: "added", filename: item.asset.filename, song: song.title });
    } catch (error) {
      console.log(`  ! ${item.asset.filename}: ${error.message}`);
      results.push({ status: "error", filename: item.asset.filename, error: error.message });
    }
  }
  return results;
}

function runGit(args, { capture = true } = {}) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });
}

function getGitState() {
  try {
    const branch = runGit(["branch", "--show-current"]).trim() || "main";
    const libraryStatus = runGit(["status", "--short", "--", "js/music-library.js"]).trim();
    return { available: true, branch, libraryChanged: Boolean(libraryStatus) };
  } catch (error) {
    return {
      available: false,
      error: String(error.stderr || error.message || error).trim()
    };
  }
}

async function publishLibrary() {
  const state = getGitState();

  if (!state.available) {
    console.log("");
    console.log("Git publish is unavailable on this computer/project.");
    if (state.error) console.log(state.error);
    return { status: "failed" };
  }

  if (!state.libraryChanged) {
    console.log("");
    console.log("There are no new music-library changes to push.");
    return { status: "nothing" };
  }

  console.log("");
  console.log("PUBLISH TO GITHUB");
  console.log(line("-"));
  console.log("This will only stage js/music-library.js.");
  console.log("Other files you may be working on will NOT be included.");
  console.log(`Branch: ${state.branch}`);
  console.log("");

  const answer = (await ask("Save, commit, and push the library now? [Y/n]: ")).toLowerCase();
  if (answer === "n" || answer === "no") {
    console.log("Publish skipped. Your library changes are still saved locally.");
    return { status: "skipped" };
  }

  try {
    console.log("");
    console.log("1/3  Saving library change to Git...");
    runGit(["add", "--", "js/music-library.js"]);

    console.log("2/3  Creating commit...");
    try {
      runGit(["commit", "-m", "Update church music library", "--", "js/music-library.js"], { capture: false });
    } catch (error) {
      // If the staged file is identical to HEAD, there is simply nothing to commit.
      const staged = runGit(["diff", "--cached", "--name-only"]).trim();
      if (staged) throw error;
    }

    console.log("3/3  Pushing to GitHub...");
    runGit(["push", "origin", state.branch], { capture: false });

    console.log("");
    console.log("SUCCESS: The updated church music library is now on GitHub.");
    return { status: "pushed" };
  } catch (error) {
    console.log("");
    console.log("PUBLISH FAILED");
    console.log("Your importer changes are still saved locally; nothing was lost.");
    console.log(String(error.stderr || error.message || error).trim());
    return { status: "failed" };
  }
}

function printResults(results) {
  const added = results.filter((item) => item.status === "added");
  const skipped = results.filter((item) => item.status === "skipped");
  const errors = results.filter((item) => item.status === "error");

  console.log("");
  console.log(line());
  console.log("  IMPORT COMPLETE");
  console.log(line());
  console.log(`  Imported: ${added.length}`);
  console.log(`  Skipped:  ${skipped.length}`);
  console.log(`  Errors:   ${errors.length}`);

  if (added.length) {
    console.log("");
    console.log("Imported:");
    added.forEach((item) => console.log(`  + ${item.filename} -> ${item.song}`));
  }

  if (errors.length) {
    console.log("");
    console.log("Errors:");
    errors.forEach((item) => console.log(`  ! ${item.filename}: ${item.error}`));
  }

  console.log("");
}

async function main() {
  console.log("CHURCH MUSIC IMPORTER\nScan → Edit queue → Upload → Publish\n");
  console.log(`Inbox: ${CONFIG.inboxDir}\n`);
  const library = readLibrary();
  ensureTrackTypes(library);
  const assets = scanInbox();
  if (!assets.length) { console.log("No supported PDF or audio files in the inbox."); return; }
  const queue = initialQueue(assets, library);
  let showAll = false;
  while (true) {
    showQueue(showAll ? queue.map((item) => ({ ...item, reviewed: true })) : queue);
    const answer = (await ask("Choose: ")).toLowerCase();
    if (answer === "q") { console.log("No files uploaded."); return; }
    if (answer === "a") { showAll = !showAll; continue; }
    if (answer === "u") {
      const results = await uploadQueue(queue, library);
      if (results === null) continue;
      printResults(results);
      if (results.some((item) => item.status === "added")) await publishLibrary();
      return;
    }
    const index = Number(answer) - 1;
    if (Number.isInteger(index) && index >= 0 && index < queue.length) await editItem(queue[index], library);
    else console.log("Choose a file number, U, A, or Q.");
  }
}
main().catch((error) => { console.error(`\nImporter failed: ${error.message}`); process.exitCode = 1; })
  .finally(async () => { await ask("\nPress Enter to close..."); rl.close(); });
