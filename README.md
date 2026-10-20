# Generate single PDF from local website

This project provides a small Node.js script to render all top-level `.html` files in the workspace into a single `website.pdf`.

Usage:

1. Install dependencies:

```bash
npm install
```

2. Generate the PDF:

```bash
npm run generate-pdf
```

The script will render each `.html` file (skipping `head.html`) and merge them into `website.pdf` in the workspace root.

Notes:
- Puppeteer will download a Chromium binary on first install. This may take some time and disk space.
- If your pages load resources from the web, ensure you have network access while running the script.
