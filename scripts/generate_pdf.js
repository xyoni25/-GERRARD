#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');

(async () => {
  try {
    const cwd = process.cwd();
    const files = fs.readdirSync(cwd).filter(f => f.endsWith('.html') && f !== 'head.html');
    files.sort((a, b) => {
      if (a === 'index.html') return -1;
      if (b === 'index.html') return 1;
      return a.localeCompare(b);
    });

    if (files.length === 0) {
      console.error('No HTML files found in', cwd);
      process.exit(1);
    }

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    const pdfBuffers = [];

    for (const file of files) {
      const filePath = path.resolve(cwd, file);
      const url = 'file://' + filePath;
      console.log('Rendering', file);
      await page.goto(url, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      pdfBuffers.push(pdf);
    }

    await browser.close();

    const mergedPdf = await PDFDocument.create();
    for (const buf of pdfBuffers) {
      const pdf = await PDFDocument.load(buf);
      const copied = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copied.forEach(p => mergedPdf.addPage(p));
    }

    const mergedBytes = await mergedPdf.save();
    const outPath = path.join(cwd, 'website.pdf');
    fs.writeFileSync(outPath, mergedBytes);
    console.log('Saved merged PDF to', outPath);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
