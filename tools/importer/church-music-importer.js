const readline = require("readline");

const {
  CONFIG,
  TRACK_TYPES,
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

function printHeader() {
  console.clear();

  console.log(
    "============================================================"
  );
  console.log(
    "          CHURCH MUSIC IMPORTER — R2"
  );
  console.log(
    "============================================================"
  );
  console.log("");
  console.log(`Inbox: ${CONFIG.inboxDir}`);
  console.log("");
}

function findExistingAsset(song, asset) {
  if (asset.type === "sheet") {
    return (song.documents || []).some(
      (item) =>
        item.file &&
        item.file.includes(
          encodeURIComponent(asset.filename)
        )
    );
  }

  return (song.audio || []).some(
    (item) =>
      item.file &&
      item.file.includes(
        encodeURIComponent(asset.filename)
      )
  );
}

async function chooseSong(
  asset,
  library
) {
  const matches = findSongMatches(
    library,
    asset.filename,
    asset.type
  );

  if (matches.exact) {
    return {
      song: matches.exact.song,
      confidence: "exact"
    };
  }

  const strong =
    matches.suggestions.filter(
      (candidate) => candidate.score >= 0.82
    );

  if (strong.length) {
    console.log("");
    console.log(
      `Possible match for: ${asset.filename}`
    );

    strong.forEach(
      (candidate, index) => {
        console.log(
          `[${index + 1}] ${candidate.song.title} (${Math.round(candidate.score * 100)}%)`
        );
      }
    );

    console.log(
      `[N] Create as a new song`
    );
    console.log(
      `[S] Skip`
    );

    const choice = (
      await ask("Choose: ")
    ).toLowerCase();

    if (choice === "s") {
      return null;
    }

    if (choice === "n") {
      return {
        song: null,
        confidence: "new"
      };
    }

    const index =
      Number.parseInt(choice, 10) - 1;

    if (
      Number.isInteger(index) &&
      strong[index]
    ) {
      return {
        song: strong[index].song,
        confidence: "confirmed"
      };
    }

    console.log("Invalid choice. Skipped.");
    return null;
  }

  return {
    song: null,
    confidence: "new"
  };
}

async function createNewSong(
  asset,
  library
) {
  console.log("");
  console.log(
    `New song detected from: ${asset.filename}`
  );

  const titleAnswer =
    await ask(
      `Title [${asset.inferredTitle}]: `
    );

  const title =
    titleAnswer || asset.inferredTitle;

  const artist =
    await ask(
      "Artist / composer (optional): "
    );

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

async function importAsset({
  asset,
  library,
  client
}) {
  console.log("");
  console.log(
    "------------------------------------------------------------"
  );
  console.log(`File: ${asset.filename}`);
  console.log(
    `Detected: ${asset.label}`
  );

  const selection =
    await chooseSong(asset, library);

  if (!selection) {
    console.log("Skipped.");
    return "skipped";
  }

  let song = selection.song;

  if (!song) {
    song = await createNewSong(
      asset,
      library
    );
  } else {
    console.log(
      `Matched song: ${song.title}`
    );
  }

  if (findExistingAsset(song, asset)) {
    console.log(
      "This exact file is already linked to the song. Skipped."
    );
    return "skipped";
  }

  const objectKey =
    `${asset.folder}/${asset.filename}`;

  console.log(`R2 target: ${objectKey}`);

  let replaceSameType = false;

  if (
    asset.type !== "sheet" &&
    (song.audio || []).some(
      (track) =>
        (track.type || "practice") ===
        asset.type
    )
  ) {
    console.log("");
    console.log(
      `${song.title} already has a ${asset.label}.`
    );
    console.log(
      "[1] Add as another track"
    );
    console.log(
      "[2] Replace first track of this type"
    );
    console.log(
      "[3] Skip"
    );

    const answer =
      await ask("Choose: ");

    if (answer === "3") {
      return "skipped";
    }

    replaceSameType = answer === "2";
  }

  const confirm = (
    await ask(
      `Upload and add to "${song.title}"? [Y/n]: `
    )
  ).toLowerCase();

  if (confirm === "n" || confirm === "no") {
    return "skipped";
  }

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
    replaceSameType
  });

  writeLibrary(library);

  console.log(
    result.uploaded
      ? "Uploaded and added."
      : "Already existed in R2; library link added."
  );

  return "added";
}

async function main() {
  printHeader();

  const library = readLibrary();
  ensureTrackTypes(library);

  const assets = scanInbox();

  if (!assets.length) {
    console.log(
      "No supported PDF/audio files found."
    );
    rl.close();
    return;
  }

  console.log(
    `Found ${assets.length} supported file(s).`
  );

  const client = getR2Client();

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const asset of assets) {
    try {
      const status =
        await importAsset({
          asset,
          library,
          client
        });

      if (status === "added") added += 1;
      else skipped += 1;
    } catch (error) {
      errors += 1;

      console.error("");
      console.error(
        `FAILED: ${asset.filename}`
      );
      console.error(error.message);
    }
  }

  console.log("");
  console.log(
    "============================================================"
  );
  console.log("COMPLETE");
  console.log(
    "============================================================"
  );
  console.log(`Added:   ${added}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors:  ${errors}`);
  console.log("");

  await ask("Press Enter to exit...");
  rl.close();
}

main().catch(async (error) => {
  console.error("");
  console.error("Importer failed:");
  console.error(error);

  await ask("Press Enter to exit...");
  rl.close();
  process.exitCode = 1;
});
