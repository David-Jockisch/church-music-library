const fs = require("fs");
const path = require("path");
const readline = require("readline");

const {
  CONFIG,
  addOrUpdateSongAsset,
  detectTrackType,
  ensureTrackTypes,
  findSongMatches,
  getR2Client,
  isR2Url,
  makePublicUrl,
  normalizeForMatch,
  readLibrary,
  scanInbox,
  uploadFile,
  writeLibrary
} = require("./r2-shared");

const args = new Set(process.argv.slice(2));

const DRY_RUN = !args.has("--upload");
const OVERWRITE = args.has("--overwrite");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) =>
      resolve(answer.trim())
    );
  });
}

function oldLocalFilename(fileValue) {
  if (
    !fileValue ||
    /^https?:\/\//i.test(fileValue)
  ) {
    return null;
  }

  return fileValue
    .replace(/\\/g, "/")
    .split("/")
    .pop();
}

function findInboxCandidate(
  inboxFiles,
  expectedFilename,
  type
) {
  if (!expectedFilename) return null;

  const exact = inboxFiles.find(
    (file) =>
      file.filename.toLowerCase() ===
      expectedFilename.toLowerCase()
  );

  if (exact) return exact;

  const target =
    normalizeForMatch(expectedFilename, type);

  const sameType = inboxFiles.filter(
    (file) => file.type === type
  );

  const normalizedExact =
    sameType.find(
      (file) =>
        normalizeForMatch(
          file.filename,
          file.type
        ) === target
    );

  return normalizedExact || null;
}

function migrationPlan(library, inboxFiles) {
  const plan = [];
  const unresolved = [];

  for (const song of library) {
    for (const document of song.documents || []) {
      if (isR2Url(document.file)) continue;

      const filename =
        oldLocalFilename(document.file);

      const candidate = findInboxCandidate(
        inboxFiles,
        filename,
        "sheet"
      );

      if (!candidate) {
        unresolved.push({
          song: song.title,
          type: "sheet",
          expected: filename
        });
        continue;
      }

      plan.push({
        song,
        asset: candidate,
        objectKey:
          `sheet/${candidate.filename}`
      });
    }

    for (const audio of song.audio || []) {
      if (isR2Url(audio.file)) continue;

      const type = audio.type || "practice";
      const filename =
        oldLocalFilename(audio.file);

      const candidate = findInboxCandidate(
        inboxFiles,
        filename,
        type
      );

      if (!candidate) {
        unresolved.push({
          song: song.title,
          type,
          expected: filename
        });
        continue;
      }

      plan.push({
        song,
        asset: {
          ...candidate,
          type
        },
        objectKey:
          `${type}/${candidate.filename}`
      });
    }
  }

  return { plan, unresolved };
}

async function main() {
  console.clear();

  console.log(
    "============================================================"
  );
  console.log(
    "        CHURCH MUSIC R2 MIGRATION"
  );
  console.log(
    "============================================================"
  );
  console.log("");
  console.log(
    DRY_RUN
      ? "MODE: DRY RUN — NOTHING WILL BE UPLOADED OR CHANGED"
      : "MODE: LIVE UPLOAD"
  );
  console.log("");
  console.log(`Inbox: ${CONFIG.inboxDir}`);
  console.log("");

  const library = readLibrary();
  ensureTrackTypes(library);

  const inboxFiles = scanInbox();

  const { plan, unresolved } =
    migrationPlan(library, inboxFiles);

  console.log(
    `Library songs:       ${library.length}`
  );
  console.log(
    `Inbox media files:   ${inboxFiles.length}`
  );
  console.log(
    `Assets ready:        ${plan.length}`
  );
  console.log(
    `Assets unresolved:   ${unresolved.length}`
  );
  console.log("");

  for (const item of plan) {
    console.log(
      `[MATCH] ${item.song.title}`
    );
    console.log(
      `        ${item.asset.type.toUpperCase()}: ${item.asset.filename}`
    );
    console.log(
      `        R2: ${item.objectKey}`
    );
  }

  if (unresolved.length) {
    console.log("");
    console.log(
      "---------------- UNRESOLVED ----------------"
    );

    for (const item of unresolved) {
      console.log(
        `[MISSING] ${item.song}`
      );
      console.log(
        `          ${item.type.toUpperCase()}: ${item.expected}`
      );
    }
  }

  console.log("");

  if (DRY_RUN) {
    console.log(
      "Dry run complete. No files were uploaded."
    );
    console.log("");
    console.log(
      "When the matches look correct, run:"
    );
    console.log(
      "  node tools/r2/migrate-to-r2.js --upload"
    );
    console.log("");
    rl.close();
    return;
  }

  const answer = (
    await ask(
      `Upload ${plan.length} matched assets to R2 and rewrite music-library.js? [y/N]: `
    )
  ).toLowerCase();

  if (answer !== "y" && answer !== "yes") {
    console.log("Cancelled.");
    rl.close();
    return;
  }

  const client = getR2Client();

  let uploaded = 0;
  let existing = 0;
  let failed = 0;

  for (const item of plan) {
    try {
      process.stdout.write(
        `Uploading ${item.objectKey} ... `
      );

      const result = await uploadFile({
        client,
        sourcePath: item.asset.fullPath,
        objectKey: item.objectKey,
        overwrite: OVERWRITE
      });

      if (result.uploaded) {
        uploaded += 1;
        console.log("uploaded");
      } else {
        existing += 1;
        console.log("already exists");
      }

      addOrUpdateSongAsset(item.song, {
        type: item.asset.type,
        label: item.asset.label,
        publicUrl: result.url,
        replaceSameType: true
      });
    } catch (error) {
      failed += 1;
      console.log("FAILED");
      console.error(
        `  ${error.message}`
      );
    }
  }

  if (failed === 0) {
    writeLibrary(library);

    console.log("");
    console.log(
      "music-library.js updated with R2 URLs."
    );
  } else {
    console.log("");
    console.log(
      "Because one or more uploads failed, music-library.js was NOT rewritten."
    );
  }

  console.log("");
  console.log(`Uploaded:       ${uploaded}`);
  console.log(`Already in R2:  ${existing}`);
  console.log(`Failed:         ${failed}`);
  console.log(`Unresolved:     ${unresolved.length}`);
  console.log("");

  rl.close();
}

main().catch((error) => {
  console.error("");
  console.error("Migration failed:");
  console.error(error);
  rl.close();
  process.exitCode = 1;
});
