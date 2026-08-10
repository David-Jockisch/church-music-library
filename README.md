# Church Music Library — Version 1.1

This update replaces the browser's embedded PDF iframe with a clean PDF.js
practice viewer.

## What's changed

- PDF toolbar is removed from Practice View.
- Sheet music now fills the available device width.
- Multi-page PDFs render as one continuous vertical document.
- MP3 player remains fixed at the bottom while the music is viewed/scrolled.
- Compact `Open Original` button opens the original PDF in a new browser tab.
- The original browser PDF view remains available for print, download, share,
  page controls, etc.
- Songs with only one document no longer waste space showing a "Sheet Music"
  selector button.
- Songs with multiple documents still get resource selector buttons.
- PDF re-renders automatically after phone/tablet rotation.

## Files to copy into your repository

Replace these existing files:

```text
index.html
css/style.css
js/app.js
js/music-library.js
service-worker.js
```

Your existing `/documents` and `/audio` files can stay exactly where they are.

## Important

The PDF practice viewer uses PDF.js from a CDN in this version. That works well
on GitHub Pages. When the project is converted into the finished offline PWA,
the PDF.js library should be stored locally in the repository so Practice View
also works without an internet connection.

## Git commit

```powershell
git add .
git commit -m "Add full-width PDF practice view"
git push
```
