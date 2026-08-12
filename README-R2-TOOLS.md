# Church Music Library — R2 Tools v1

This package adds the new Cloudflare R2 workflow without containing your `.env`
or any media files.

## Included

- `tools/r2/migrate-to-r2.js`
  - One-time migration from your iCloud media folder to R2.
  - Defaults to **dry run**.
  - Reads the existing `music-library.js` as the source of truth.
  - Uploads sheet music to `sheet/`.
  - Uploads normal practice audio to `practice/`.
  - Rewrites library URLs only after successful migration.

- `tools/importer/church-music-importer.js`
  - Ongoing iCloud → R2 importer.
  - Matches filename variations intelligently.
  - Recognizes key suffixes such as `(G)`, `(Bb)`, `(D)`.
  - Recognizes `Bass`, `Drums`, `Live`, `Service`, `Practice`, and `Reference`.
  - Matches additional instrument/live tracks to existing songs.
  - Suggests close matches instead of blindly guessing.
  - Allows multiple tracks of the same type or replacement.

- `Church Music Importer.bat`
- `Church Music R2 Migration.bat`
- `.env.example`
- `.gitignore`
- `package.json`

## Supported matching examples

All of these resolve to the same base song:

```text
This is Amazing Grace.pdf
This is Amazing Grace (G).mp3
This is Amazing Grace Bass.mp3
This is Amazing Grace - Drums.mp3
This is Amazing Grace Live Service.mp3
```

Detected R2 targets:

```text
sheet/This is Amazing Grace.pdf
practice/This is Amazing Grace (G).mp3
bass/This is Amazing Grace Bass.mp3
drums/This is Amazing Grace - Drums.mp3
live/This is Amazing Grace Live Service.mp3
```

## Audio formats

Supported:

```text
.mp3
.m4a
.aac
.wav
.flac
```

PDF is currently the supported sheet format for R2 migration/import.

## Installation

Extract this ZIP into the **root** of your current `church-music-library` project.

It should add/replace:

```text
Church Music Importer.bat
Church Music R2 Migration.bat
package.json
.gitignore
.env.example
tools/
  importer/
    church-music-importer.js
  r2/
    migrate-to-r2.js
    r2-shared.js
```

Your existing `.env` is NOT included and should remain where it is.

Then run:

```powershell
npm install
```

## Step 1 — Dry run

Double-click:

```text
Church Music R2 Migration.bat
```

and choose:

```text
1. Dry Run
```

or from PowerShell:

```powershell
node .\tools\r2\migrate-to-r2.js
```

**Nothing is uploaded or changed in dry-run mode.**

Review the `[MATCH]` and `[MISSING]` results carefully.

## Step 2 — Live migration

Only after the dry run looks correct:

```powershell
node .\tools\r2\migrate-to-r2.js --upload
```

The script asks for confirmation before uploading.

If every upload succeeds, it rewrites `js/music-library.js` with R2 URLs.

If an upload fails, it does NOT rewrite the library file.

## Important — do not commit deleted media yet

Your current Git status shows the old `audio/` and `documents/` media as deleted.
Leave those deletions uncommitted until:

1. R2 migration succeeds.
2. The updated library is tested locally.
3. The live PWA is tested.
4. R2 copies are verified.

Then we can deliberately commit media removal and clean old media from Git history.

## Ongoing importer

Once migration is complete, use:

```text
Church Music Importer.bat
```

It scans:

```text
C:\Users\david\iCloudDrive\church_music_library
```

For each asset it:

1. Detects asset type.
2. Removes key markers for matching only.
3. Detects Bass / Drums / Live / Practice suffixes.
4. Checks existing song titles.
5. Auto-matches exact normalized names.
6. Offers close matches when confidence is high.
7. Allows new-song creation if no match exists.
8. Uploads to R2.
9. Constructs the public R2 URL.
10. Updates `music-library.js`.

## Secrets

Never add `.env` to Git.

The included `.gitignore` contains:

```text
.env
node_modules/
```


## v1.2 reliability update

The uploader now buffers one file at a time and retries transient SSL/network
errors up to 5 attempts with exponential backoff.

This specifically addresses errors such as:

```text
read ECONNRESET
ssl3_read_bytes: sslv3 alert bad record mac
non-retryable streaming request
```

Safe resume behavior is unchanged. Before uploading an object, the migration
checks whether it already exists in R2. Re-running after a partial migration
will therefore skip successful objects and retry only missing ones.

Run again with:

```powershell
node .\tools\r2\migrate-to-r2.js --upload
```

Do not use `--overwrite` for a normal resume.
