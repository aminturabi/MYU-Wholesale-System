const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src); Role: Senior JavaScript & UI Developer

  Task: Add expandable / collapsible row functionality to the Sales History table(`sales.js`) to display an itemized breakdown of products and per - product profits directly beneath the invoice row.

### UI & UX Requirements:

  1. ** Row Toggle Interaction **:
  - Make the entire invoice row(or the Invoice # column) clickable to toggle an expanded details row directly beneath it.
   - Add a chevron indicator icon(`fa-chevron-down` / `fa-chevron-up`) next to the Invoice # to signify it is expandable.

2. ** Expanded Content(Sub - Table) **:
  - When expanded, insert a full - width sub - row(`<tr class="expanded-details-row"><td colspan="9">...</td></tr>`).
   - Render a mini table inside containing:
     - ** Product Name & Code **
     - ** Quantity & Bonus **
     - ** Trade Price(TP) **
     - ** Sale Discount %**
     - ** Net Amount **
     - ** Margin / Profit %**: Display product margin badge(e.g., `+10.0% (+Rs. 340.00)`)

  3. ** Behavior & Styling **:
  - Ensure smooth toggle animation or clean `display: table-row` toggle.
   - Use a subtle light background(`#f8fafc`) for the expanded sub - table to make it clearly distinct from the primary invoice row.
   - Retain full functionality for the existing action buttons(Print, View, Return, Edit, Delete).

### Target File:
  - `frontend/js/sales.js`(inside invoice table rendering logic and click handler delegation).
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const itemsToCopy = [
  'index.html',
  'css',
  'js',
  'assets',
  'libraries',
  'myu-logo.png',
  'myu-logo-b64.txt',
  'signature.png',
  'signature-b64.txt'
];

itemsToCopy.forEach(item => {
  const src = path.join(rootDir, item);
  const dest = path.join(distDir, item);
  if (fs.existsSync(src)) {
    copyRecursiveSync(src, dest);
  }
});

console.log('[Tauri Build] Isolated web assets successfully synchronized to ./dist');
