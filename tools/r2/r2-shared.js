const fs = require("fs");
const path = require("path");
const vm = require("vm");
const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand
} = require("@aws-sdk/client-s3");

require("dotenv").config({
  path: path.resolve(__dirname, "..", "..", ".env")
});

const REPO_ROOT = path.resolve(__dirname, "..", "..");

const CONFIG = {
  inboxDir:
    process.env.CHURCH_MUSIC_INBOX ||
    String.raw`C:\Users\david\iCloudDrive\church_music_library`,

  libraryFile: path.join(REPO_ROOT, "js", "music-library.js"),

  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET || "church-music-library",
    publicUrl: (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "")
  }
};

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".m4a",
  ".aac",
  ".wav",
  ".flac"
]);

const DOCUMENT_EXTENSIONS = new Set([".pdf"]);

const TRACK_TYPES = {
  practice: {
    folder: "practice",
    label: "Practice Track"
  },
  bass: {
    folder: "bass",
    label: "Bass Part"
  },
  drums: {
    folder: "drums",
    label: "Drums Part"
  },
  live: {
    folder: "live",
    label: "Live Service"
  }
};

function validateR2Config() {
  const missing = [];

  if (!CONFIG.r2.accountId) missing.push("R2_ACCOUNT_ID");
  if (!CONFIG.r2.accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!CONFIG.r2.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!CONFIG.r2.bucket) missing.push("R2_BUCKET");
  if (!CONFIG.r2.publicUrl) missing.push("R2_PUBLIC_URL");

  if (missing.length) {
    throw new Error(
      "Missing required .env values:\n  " + missing.join("\n  ")
    );
  }
}

function getR2Client() {
  validateR2Config();

  return new S3Client({
    region: "auto",
    endpoint:
      `https://${CONFIG.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: CONFIG.r2.accessKeyId,
      secretAccessKey: CONFIG.r2.secretAccessKey
    }
  });
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();

  const types = {
    ".pdf": "application/pdf",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".flac": "audio/flac"
  };

  return types[ext] || "application/octet-stream";
}

function encodeObjectPath(objectKey) {
  return objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function makePublicUrl(objectKey) {
  return `${CONFIG.r2.publicUrl}/${encodeObjectPath(objectKey)}`;
}

function isR2Url(value) {
  return Boolean(
    typeof value === "string" &&
    CONFIG.r2.publicUrl &&
    value.startsWith(`${CONFIG.r2.publicUrl}/`)
  );
}

function stripExtension(filename) {
  return path.basename(filename, path.extname(filename)).trim();
}

function makeId(title) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
  Remove musical key markers such as:
    (G), (Bb), (F#), [D], - Key of A

  The filename itself is NOT changed; this is matching-only normalization.
*/
function stripKeyMarkers(value) {
  return value
    .replace(
      /\s*[\(\[]\s*[A-G](?:#|b)?(?:m|maj|min)?\s*[\)\]]\s*$/i,
      ""
    )
    .replace(
      /\s*[-–—]?\s*key\s+of\s+[A-G](?:#|b)?(?:m|maj|min)?\s*$/i,
      ""
    )
    .trim();
}

function detectTrackType(filename) {
  const ext = path.extname(filename).toLowerCase();

  if (DOCUMENT_EXTENSIONS.has(ext)) {
    return {
      kind: "sheet",
      type: "sheet",
      folder: "sheet",
      label: "Sheet Music"
    };
  }

  if (!AUDIO_EXTENSIONS.has(ext)) {
    return null;
  }

  const base = stripExtension(filename);

  const rules = [
    {
      type: "bass",
      regex:
        /(?:^|[\s\-–—_(])(?:bass|bass\s+guitar)(?:[\s\-–—_)]|$)/i
    },
    {
      type: "drums",
      regex:
        /(?:^|[\s\-–—_(])(?:drum|drums|drum\s+part)(?:[\s\-–—_)]|$)/i
    },
    {
      type: "live",
      regex:
        /(?:^|[\s\-–—_(])(?:live|live\s+service|service\s+recording|service)(?:[\s\-–—_)]|$)/i
    },
    {
      type: "practice",
      regex:
        /(?:^|[\s\-–—_(])(?:practice|practice\s+track|reference|reference\s+track)(?:[\s\-–—_)]|$)/i
    }
  ];

  for (const rule of rules) {
    if (rule.regex.test(base)) {
      return {
        kind: "audio",
        type: rule.type,
        folder: TRACK_TYPES[rule.type].folder,
        label: TRACK_TYPES[rule.type].label
      };
    }
  }

  // Ordinary audio is a practice/reference track by default.
  return {
    kind: "audio",
    type: "practice",
    folder: TRACK_TYPES.practice.folder,
    label: TRACK_TYPES.practice.label
  };
}

function stripTrackSuffix(value, trackType) {
  let result = value;

  const suffixes = {
    bass:
      /(?:\s*[-–—]?\s*|\s*\()\s*(?:bass|bass\s+guitar)\s*\)?\s*$/i,
    drums:
      /(?:\s*[-–—]?\s*|\s*\()\s*(?:drum|drums|drum\s+part)\s*\)?\s*$/i,
    live:
      /(?:\s*[-–—]?\s*|\s*\()\s*(?:live|live\s+service|service\s+recording|service)\s*\)?\s*$/i,
    practice:
      /(?:\s*[-–—]?\s*|\s*\()\s*(?:practice|practice\s+track|reference|reference\s+track)\s*\)?\s*$/i
  };

  if (suffixes[trackType]) {
    result = result.replace(suffixes[trackType], "");
  }

  return result.trim();
}

function normalizeForMatch(value, trackType = null) {
  let title = stripExtension(value);

  if (trackType && trackType !== "sheet") {
    title = stripTrackSuffix(title, trackType);
  }

  title = stripKeyMarkers(title);

  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalTitleFromFilename(filename, trackType) {
  let title = stripExtension(filename);

  if (trackType && trackType !== "sheet") {
    title = stripTrackSuffix(title, trackType);
  }

  return stripKeyMarkers(title).trim();
}

function levenshtein(a, b) {
  const x = a || "";
  const y = b || "";

  const rows = y.length + 1;
  const cols = x.length + 1;
  const matrix = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = y[i - 1] === x[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;

  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function readLibrary() {
  const source = fs.readFileSync(CONFIG.libraryFile, "utf8");

  const sandbox = {};

  vm.createContext(sandbox);

  vm.runInContext(
    source.replace(
      /\bconst\s+musicLibrary\s*=/,
      "musicLibrary ="
    ),
    sandbox,
    {
      filename: CONFIG.libraryFile
    }
  );

  if (!Array.isArray(sandbox.musicLibrary)) {
    throw new Error(
      "Could not parse js/music-library.js"
    );
  }

  return sandbox.musicLibrary;
}

function writeLibrary(library) {
  const header = `/*
  CHURCH MUSIC LIBRARY

  Media is hosted in Cloudflare R2.
  This file is maintained by the Church Music Importer.
*/

`;

  const body =
    "const musicLibrary = " +
    JSON.stringify(library, null, 2) +
    ";\n";

  fs.writeFileSync(
    CONFIG.libraryFile,
    header + body,
    "utf8"
  );
}

function findSongMatches(library, filename, detectedType) {
  const normalizedFile = normalizeForMatch(
    filename,
    detectedType
  );

  const scored = library.map((song) => {
    const normalizedSong = normalizeForMatch(song.title);

    return {
      song,
      normalizedSong,
      score:
        normalizedFile === normalizedSong
          ? 1
          : similarity(normalizedFile, normalizedSong)
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    normalizedFile,
    exact:
      scored.find((candidate) => candidate.score === 1) ||
      null,
    suggestions: scored.slice(0, 5)
  };
}

function scanInbox() {
  if (!fs.existsSync(CONFIG.inboxDir)) {
    throw new Error(
      `Inbox folder does not exist:\n${CONFIG.inboxDir}`
    );
  }

  return fs
    .readdirSync(CONFIG.inboxDir, {
      withFileTypes: true
    })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const classification =
        detectTrackType(entry.name);

      if (!classification) return null;

      return {
        filename: entry.name,
        fullPath: path.join(
          CONFIG.inboxDir,
          entry.name
        ),
        ...classification,
        inferredTitle:
          canonicalTitleFromFilename(
            entry.name,
            classification.type
          )
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      a.filename.localeCompare(
        b.filename,
        undefined,
        { sensitivity: "base" }
      )
    );
}

async function objectExists(client, objectKey) {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: CONFIG.r2.bucket,
        Key: objectKey
      })
    );

    return true;
  } catch (error) {
    if (
      error?.$metadata?.httpStatusCode === 404 ||
      error?.name === "NotFound" ||
      error?.name === "NoSuchKey"
    ) {
      return false;
    }

    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientUploadError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  const code = String(error?.code || error?.name || "").toLowerCase();

  return (
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("socket hang up") ||
    message.includes("bad record mac") ||
    message.includes("ssl") ||
    message.includes("connection reset") ||
    message.includes("network") ||
    code.includes("econnreset") ||
    code.includes("etimedout")
  );
}

async function uploadFile({
  client,
  sourcePath,
  objectKey,
  overwrite = false,
  maxAttempts = 5
}) {
  if (!overwrite) {
    const exists =
      await objectExists(client, objectKey);

    if (exists) {
      return {
        uploaded: false,
        existed: true,
        url: makePublicUrl(objectKey)
      };
    }
  }

  /*
    Use a reusable Buffer rather than fs.createReadStream().
    AWS SDK streaming request bodies cannot always be retried after a
    connection reset because the consumed stream cannot be replayed.
    These church PDFs/audio files are small enough to safely buffer one
    object at a time, which lets us retry the exact same request body.
  */
  const body = fs.readFileSync(sourcePath);
  const contentType = getContentType(sourcePath);

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: CONFIG.r2.bucket,
          Key: objectKey,
          Body: body,
          ContentLength: body.length,
          ContentType: contentType
        })
      );

      return {
        uploaded: true,
        existed: false,
        url: makePublicUrl(objectKey),
        attempts: attempt
      };
    } catch (error) {
      lastError = error;

      if (
        attempt >= maxAttempts ||
        !isTransientUploadError(error)
      ) {
        throw error;
      }

      const delayMs = Math.min(
        1000 * Math.pow(2, attempt - 1),
        8000
      );

      console.log(
        `retry ${attempt}/${maxAttempts - 1} after ${delayMs / 1000}s...`
      );

      await sleep(delayMs);
    }
  }

  throw lastError;
}

function getAssetKeyFromEntry(entry) {
  if (!entry?.file) return null;

  if (isR2Url(entry.file)) {
    try {
      const url = new URL(entry.file);
      return decodeURIComponent(
        url.pathname.replace(/^\/+/, "")
      );
    } catch {
      return null;
    }
  }

  return null;
}

function libraryHasAsset(song, type, publicUrl) {
  if (type === "sheet") {
    return (song.documents || []).some(
      (item) => item.file === publicUrl
    );
  }

  return (song.audio || []).some(
    (item) =>
      item.file === publicUrl ||
      (item.type === type &&
        getAssetKeyFromEntry(item) ===
          decodeURIComponent(
            new URL(publicUrl).pathname.replace(/^\/+/, "")
          ))
  );
}

function addOrUpdateSongAsset(
  song,
  {
    type,
    label,
    publicUrl,
    replaceSameType = false
  }
) {
  if (type === "sheet") {
    song.documents = Array.isArray(song.documents)
      ? song.documents
      : [];

    const existing =
      song.documents.find(
        (item) =>
          item.type === "pdf" ||
          item.label === "Sheet Music"
      );

    if (existing) {
      existing.label = "Sheet Music";
      existing.type = "pdf";
      existing.file = publicUrl;
    } else {
      song.documents.push({
        label: "Sheet Music",
        type: "pdf",
        file: publicUrl
      });
    }

    return;
  }

  song.audio = Array.isArray(song.audio)
    ? song.audio
    : [];

  if (libraryHasAsset(song, type, publicUrl)) {
    return;
  }

  if (replaceSameType) {
    const existing =
      song.audio.find(
        (item) => item.type === type
      );

    if (existing) {
      existing.type = type;
      existing.label = label;
      existing.file = publicUrl;
      return;
    }
  }

  song.audio.push({
    type,
    label,
    file: publicUrl
  });
}

function ensureTrackTypes(library) {
  for (const song of library) {
    if (!Array.isArray(song.audio)) continue;

    for (const track of song.audio) {
      if (!track.type) {
        track.type = "practice";
      }
    }
  }
}

module.exports = {
  AUDIO_EXTENSIONS,
  CONFIG,
  DOCUMENT_EXTENSIONS,
  TRACK_TYPES,
  addOrUpdateSongAsset,
  canonicalTitleFromFilename,
  detectTrackType,
  ensureTrackTypes,
  findSongMatches,
  getR2Client,
  isR2Url,
  makeId,
  makePublicUrl,
  normalizeForMatch,
  objectExists,
  readLibrary,
  scanInbox,
  similarity,
  uploadFile,
  validateR2Config,
  writeLibrary
};
