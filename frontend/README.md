# MYU Medicine & Surgical Wholesale Management System - Desktop Application

A professional, high-performance, 100% offline Windows desktop application built with **Tauri** and modularized HTML5/CSS3/JavaScript.

## Project Structure

```
MYU-Wholesale/
│
├── src-tauri/                 # Tauri Rust Desktop Backend & Config
│   ├── src/
│   │   └── main.rs            # Tauri main entry (SQLite IPC reserved for future migration)
│   ├── icons/                 # Multi-platform application icon bundle
│   ├── tauri.conf.json        # Windows app properties & window settings
│   └── Cargo.toml             # Rust dependencies (tauri, serde, rusqlite)
│
├── frontend/                  # Modular Frontend Application
│   ├── index.html             # Main HTML Shell
│   │
│   ├── css/                   # Modularized CSS Stylesheets
│   │   ├── variables.css      # Design tokens & color palettes
│   │   ├── base.css           # Global resets & scrollbars
│   │   ├── layout.css         # Sidebar & app container layout
│   │   ├── components.css     # Buttons, cards, badges & toasts
│   │   ├── tables.css         # Custom table styling & sticky headers
│   │   ├── forms.css          # Form inputs, selects & dropdowns
│   │   ├── modals.css         # Modal backdrops & dialog popups
│   │   ├── reports.css        # Invoice vouchers & print styles
│   │   └── responsive.css     # Media queries & window scaling
│   │
│   ├── js/                    # Modularized JavaScript Engine
│   │   ├── utils.js           # Currency formatting, date & math helpers
│   │   ├── storage.js         # LocalStorage persistence & JSON export/import engine
│   │   ├── main.js            # App controller, router, settings & backup handlers
│   │   ├── products.js        # Products catalog & min stock tracking
│   │   ├── purchases.js       # Purchase orders & supplier payables
│   │   ├── sales.js           # Sales history, returns & customer receivables
│   │   ├── billing.js         # POS billing system & invoice generation
│   │   ├── returns.js         # Sales returns & customer refunds
│   │   ├── expenses.js        # Shop expenses & manual income entries
│   │   └── reports.js         # Business reports & Chart.js rendering
│   │
│   └── libraries/             # 100% Offline Vendors
│       ├── fontawesome/       # Font Awesome 6.4.0 (CSS + webfonts)
│       ├── chartjs/           # Chart.js 4.x offline bundle
│       └── fonts/             # Plus Jakarta Sans local typography
│
├── package.json
└── README.md
```

## Features & Capabilities

- **100% Offline Operation**: Zero reliance on external CDNs or internet connectivity.
- **Client-Side Data Persistence**: High-speed, persistent storage engine powered by browser `localStorage`.
- **JSON Backup & Restore**: One-click database export and import as standardized JSON backup files.
- **Planned SQLite Migration**: Rust IPC commands and database schema definitions are prepared in `src-tauri/src/main.rs` for future SQLite backend migration.
- **Preserved UI & Calculations**: Exact visual design, layout, colors, invoice templates, reports, and wholesale calculations preserved without change.
- **Invoice & Report Printing**: Print wholesale invoices, return vouchers, supplier ledgers, customer balances, and P&L reports natively.

## Development & Building Instructions

### 1. Requirements

- Node.js (v18+)
- Rust Toolchain (`rustup` / `cargo`)
- Visual Studio C++ Build Tools (for Windows `.exe` / `.msi` build)

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Application in Development Mode

```bash
npm run tauri dev
```

### 4. Build Windows Desktop Executable / Installer

```bash
npm run tauri build
```

The Windows setup installer executable (`MYU-Wholesale-Management-Setup.exe`) will be generated inside `src-tauri/target/release/bundle/nsis/` or `src-tauri/target/release/bundle/msi/`.
