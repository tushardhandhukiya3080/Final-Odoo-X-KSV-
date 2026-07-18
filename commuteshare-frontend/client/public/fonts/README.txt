OSIRIS FONT — drop-in instructions
==================================

The whole app is already wired to use "Osiris" as its primary font
(see client/src/index.css @font-face + tailwind.config.js fontFamily).
It just needs the actual font file(s) placed IN THIS FOLDER.

WHAT TO DO
----------
1. Get the Osiris font file (from the foundry / wherever you have it).
   A .woff2 is best for the web, but .woff / .ttf / .otf all work.

2. Rename it and drop it here (client/public/fonts/):

     osiris.woff2      <-- regular weight  (any ONE of these formats)
     osiris.woff
     osiris.ttf
     osiris.otf

   (Optional) a separate bold file for crisper headings:

     osiris-bold.woff2   (or .woff / .ttf / .otf)

3. Hard-refresh the browser (Ctrl+Shift+R). Done — the entire app
   (body + brutalist headings) now renders in Osiris.

NOTES
-----
- Only ONE regular file is required. The bold file is optional; without
  it, bold headings are synthesised from the regular weight.
- Until a file is present, the app falls back to Inter / Space Grotesk,
  so nothing looks broken.
- If your file has a different extension, that's fine — just match one of
  the names above (osiris.<ext>). To use a totally different filename,
  update the src url(...) lines in client/src/index.css.
- Make sure you have a license to embed the font for web use.
