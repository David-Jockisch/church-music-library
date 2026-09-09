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

async function pause(message = "Press Enter for the next file...") {
  await ask(message);
}

function line(char = "=", width = 68) {
  return char.repeat(width);
}

function clear() {
  if (process.stdout.isTTY) console.clear();
}

function printHeader(subtitle = "Import music into the church library") {
  clear();
  console.log(line());
  console.log("  CHURCH MUSIC IMPORTER");
  console.log(`  ${subtitle}`);
  console.log(line());
  console.log(`  Inbox: ${CONFIG.inboxDir}`);
  console.log("");
}

function printStep(current, total, filename) {
  printHeader("Reviewing files that need attention");
  console.log(line("-"));
  console.log(`  FILE ${current} OF ${total}`);
  console.log(`  ${filename}`);
  console.log(line("-"));
}

function shortType(asset) {
  return asset.type === "sheet" ? "Sheet Music" : asset.label;
}

function findExistingAsset(song, asset) {
  if (asset.type === "sheet") {
    return (song.documents || []).some(
      (item) =>
        item.file &&
        item.file.includes(encodeURIComponent(asset.filename))
    );
  }

  return (song.audio || []).some(
    (item) =>
      item.file &&
      item.file.includes(encodeURIComponent(asset.filename))
  );
}

function getInitialPlan(asset, library) {
  const matches = findSongMatches(library, asset.filename, asset.type);

  if (matches.exact) {
    const duplicate = findExistingAsset(matches.exact.song, asset);
    return {
      status: duplicate ? "Already imported" : "Exact match",
      target: matches.exact.song.title,
      score: 100
    };
  }

  const best = matches.suggestions[0];
  if (best && best.score >= 0.82) {
    return {
      status: "Needs confirmation",
      target: best.song.title,
      score: Math.round(best.score * 100)
    };
  }

  return {
    status: "New song",
    target: asset.inferredTitle,
    score: null
  };
}

function classifyAssets(assets, library) {
  const existing = [];
  const actionable = [];

  for (const asset of assets) {
    const plan = getInitialPlan(asset, library);
    if (plan.status === "Already imported") {
      existing.push({ asset, plan });
    } else {
      actionable.push({ asset, plan });
    }
  }

  return { existing, actionable };
}

function printScanSummary(actionable, existingCount) {
  console.log(`Checked ${actionable.length + existingCount} supported file${actionable.length + existingCount === 1 ? "" : "s"}.`);
  console.log("");

  if (existingCount) {
    console.log(`✓ ${existingCount} file${existingCount === 1 ? "" : "s"} already in the library — hidden from review.`);
    console.log("");
  }

  if (!actionable.length) {
    console.log("Everything in the inbox is already imported.");
    console.log("There is nothing you need to review.");
    return;
  }

  console.log(`NEEDS YOUR ATTENTION: ${actionable.length}`);
  console.log(line("-"));

  actionable.forEach(({ asset, plan }, index) => {
    const score = plan.score === null ? "" : ` (${plan.score}%)`;

    console.log(`${String(index + 1).padStart(2, " ")}. ${asset.filename}`);
    console.log(`    ${plan.status}${score} → ${plan.target}`);
    if (index !== actionable.length - 1) console.log("");
  });

  console.log(line("-"));
  console.log("");
  console.log("Existing duplicates were checked automatically and will not be shown again.");
  console.log("Nothing has been uploaded or changed yet.");
}

async function chooseSong(asset, library) {
  const matches = findSongMatches(library, asset.filename, asset.type);

  if (matches.exact) {
    console.log(`Matched automatically: ${matches.exact.song.title}`);
    return {
      song: matches.exact.song,
      confidence: "exact"
    };
  }

  const strong = matches.suggestions.filter(
    (candidate) => candidate.score >= 0.82
  );

  if (strong.length) {
    console.log("");
    console.log("I found possible song matches:");
    console.log("");

    strong.forEach((candidate, index) => {
      console.log(
        `  [${index + 1}] ${candidate.song.title} — ${Math.round(candidate.score * 100)}% match`
      );
    });

    console.log("  [N] Create a new song instead");
    console.log("  [S] Skip this file");
    console.log("");

    while (true) {
      const choice = (await ask("Your choice: ")).toLowerCase();

      if (choice === "s") return null;
      if (choice === "n") {
        return { song: null, confidence: "new" };
      }

      const index = Number.parseInt(choice, 10) - 1;
      if (Number.isInteger(index) && strong[index]) {
        return {
          song: strong[index].song,
          confidence: "confirmed"
        };
      }

      console.log("Please choose one of the options shown above.");
    }
  }

  console.log("No existing song matched closely enough.");
  return {
    song: null,
    confidence: "new"
  };
}

async function createNewSong(asset, library) {
  console.log("");
  console.log("CREATE NEW SONG");
  console.log(`Suggested title: ${asset.inferredTitle}`);
  console.log("");

  const titleAnswer = await ask(`Title [${asset.inferredTitle}]: `);
  const title = titleAnswer || asset.inferredTitle;
  const artist = await ask("Artist / composer (optional): ");

  const song = {
    id: makeId(title),
    title,
    composer: artist,
    tags: ["worship"],
    documents: [],
    audio: []
  };

  library.push(song);
  return song;
}

async function chooseDuplicateTypeAction(song, asset) {
  if (asset.type === "sheet") return false;

  const sameType = (song.audio || []).some(
    (track) => (track.type || "practice") === asset.type
  );

  if (!sameType) return false;

  console.log("");
  console.log(`${song.title} already has a ${asset.label}.`);
  console.log("  [1] Add this as another track");
  console.log("  [2] Replace the first track of this type");
  console.log("  [3] Skip this file");
  console.log("");

  while (true) {
    const answer = await ask("Your choice: ");
    if (answer === "1") return false;
    if (answer === "2") return true;
    if (answer === "3") return "skip";
    console.log("Please choose 1, 2, or 3.");
  }
}

async function importAsset({ asset, library, client, current, total }) {
  printStep(current, total, asset.filename);
  console.log(`Detected as: ${shortType(asset)}`);

  const selection = await chooseSong(asset, library);

  if (!selection) {
    console.log("Result: Skipped by you.");
    return { status: "skipped", filename: asset.filename };
  }

  let song = selection.song;

  if (!song) {
    song = await createNewSong(asset, library);
  }

  if (findExistingAsset(song, asset)) {
    console.log("");
    console.log("Result: This exact file is already in the library. Nothing changed.");
    return { status: "skipped", filename: asset.filename, song: song.title, reason: "already imported" };
  }

  const duplicateAction = await chooseDuplicateTypeAction(song, asset);
  if (duplicateAction === "skip") {
    console.log("Result: Skipped by you.");
    return { status: "skipped", filename: asset.filename, song: song.title };
  }

  const objectKey = `${asset.folder}/${asset.filename}`;

  console.log("");
  console.log("READY TO IMPORT");
  console.log(`  Song:      ${song.title}`);
  console.log(`  Type:      ${shortType(asset)}`);
  console.log(`  R2 folder: ${asset.folder}/`);
  console.log("");

  const confirm = (await ask("Import this file? [Y/n]: ")).toLowerCase();
  if (confirm === "n" || confirm === "no") {
    console.log("Result: Skipped by you.");
    return { status: "skipped", filename: asset.filename, song: song.title };
  }

  console.log("Uploading to R2...");

  const result = await uploadFile({
    client,
    sourcePath: asset.fullPath,
    objectKey,
    overwrite: false
  });

  addOrUpdateSongAsset(song, {
    type: asset.type,
    label: asset.label,
    publicUrl: result.url,
    replaceSameType: duplicateAction === true
  });

  // Keep the existing safe behavior: save the local library immediately
  // after each successful file, so a later upload failure does not lose work.
  writeLibrary(library);

  console.log(
    result.uploaded
      ? "Result: Uploaded to R2 and added to the local library."
      : "Result: File already existed in R2; library link was added locally."
  );

  return {
    status: "added",
    filename: asset.filename,
    song: song.title,
    uploaded: result.uploaded
  };
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
  printHeader();

  const library = readLibrary();
  ensureTrackTypes(library);
  const assets = scanInbox();

  if (!assets.length) {
    console.log("No supported PDF/audio files were found in the inbox.");
    console.log("");
    await ask("Press Enter to close...");
    rl.close();
    return;
  }

  const { existing, actionable } = classifyAssets(assets, library);
  printScanSummary(actionable, existing.length);

  if (!actionable.length) {
    console.log("");
    await ask("Press Enter to close...");
    rl.close();
    return;
  }

  console.log("");
  console.log("  [1] Review only the files shown above");
  console.log("  [2] Exit without changing anything");
  console.log("");

  const start = await ask("Choose: ");
  if (start !== "1") {
    console.log("No changes made.");
    rl.close();
    return;
  }

  const client = getR2Client();
  const results = [];

  for (let index = 0; index < actionable.length; index += 1) {
    const asset = actionable[index].asset;

    try {
      const result = await importAsset({
        asset,
        library,
        client,
        current: index + 1,
        total: actionable.length
      });
      results.push(result);
      if (index < actionable.length - 1) {
        console.log("");
        await pause();
      }
    } catch (error) {
      console.error("");
      console.error(`FAILED: ${asset.filename}`);
      console.error(error.message);
      results.push({
        status: "error",
        filename: asset.filename,
        error: error.message
      });
      if (index < actionable.length - 1) {
        console.log("");
        await pause();
      }
    }
  }

  printResults(results);
  if (existing.length) {
    console.log(`  Already present (hidden): ${existing.length}`);
    console.log("");
  }

  if (results.some((item) => item.status === "added")) {
    await publishLibrary();
  } else {
    console.log("No new library entries were added, so there is nothing to publish.");
  }

  console.log("");
  await ask("Press Enter to close...");
  rl.close();
}

main().catch(async (error) => {
  console.error("");
  console.error("Importer failed:");
  console.error(error);

  await ask("Press Enter to close...");
  rl.close();
  process.exitCode = 1;
});
