# Church Music Importer V1

This importer is designed for the current Church Music Library project.

## What it does

It scans:

```text
C:\Users\david\iCloudDrive\church_music_library
```

for `.pdf` and `.mp3` files.

Files with the same filename are automatically treated as one song:

```text
Build My Life.pdf
Build My Life.mp3
```

becomes:

```text
Build My Life
├── Sheet Music
└── Practice Track
```

For every new song, the importer:

1. Shows the matched files.
2. Asks whether to add the song.
3. Allows an optional artist/composer entry.
4. Allows the detected title to be confirmed or changed.
5. Copies the PDF into `/documents`.
6. Copies the MP3 into `/audio`.
7. Adds the entry to `/js/music-library.js`.
8. Skips songs that already appear to exist in the library.

No npm packages are required.

## Installation

Copy these two items into the ROOT of the `church-music-library` repository:

```text
Church Music Importer.bat
tools/
```

Result:

```text
church-music-library/
├── Church Music Importer.bat
├── index.html
├── documents/
├── audio/
├── js/
│   └── music-library.js
└── tools/
    └── importer/
        └── church-music-importer.js
```

## Running it

Double-click:

```text
Church Music Importer.bat
```

## Example

If the iCloud folder contains:

```text
Because He Lives.pdf
Because He Lives.mp3
```

the importer displays:

```text
Song: Because He Lives
PDF : Because He Lives.pdf
MP3 : Because He Lives.mp3

Add this song? [Y]es / [N]o / [Q]uit:
```

Then:

```text
Artist / composer (optional - press Enter to leave blank):
Title [Because He Lives] (press Enter to keep):
```

The created library entry will use the filename as the title and connect both files automatically.

## Notes

- PDF is optional.
- MP3 is optional.
- At least one PDF or MP3 must exist for the song to be detected.
- Existing inbox files do not have to be deleted. Once a song is in `music-library.js`, it will be skipped on future scans.
- The importer copies files rather than moving/deleting the originals from iCloud.
- Version 1 does not automatically run Git commands.
