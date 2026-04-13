# LOTO Field Collector v4.0

A progressive web app (PWA) for field data collection of Lockout/Tagout (LOTO) information. Built for technicians to document equipment details, energy sources, and capture photos directly from mobile devices — fully offline-capable.

**Live App:** [whittw1.github.io/loto-info-sheet](https://whittw1.github.io/loto-info-sheet/)

---

## Features

- **Equipment Documentation** — Log equipment type (28+ presets), name, building, room, and location
- **Energy Source Tracking** — Up to 10 sources per equipment with 40+ energy types (Electrical 120V–4160V, Steam, Glycol, Hydraulic, etc.), device types, quantities, and verification methods
- **Photo Capture** — Three equipment photo slots (Main, Data Plate, EE Number) plus per-source photos, with configurable resolution and compression
- **Templates** — 22 pre-configured templates (AHU variants, Pumps, Boilers, Chillers, Elevators, ATS models, etc.) that auto-populate energy sources; supports custom templates
- **Offline Support** — Service Worker with network-first caching strategy; works without internet after first load
- **Installable** — PWA manifest allows "Add to Home Screen" on mobile devices
- **Import / Backup** — JSON-based backup and restore with merge-or-replace on import and duplicate detection
- **Tied-To Equipment** — Track interdependent systems across entries

## Export Formats

**ZIP Export** (`LOTO_Export_YYYY-MM-DD.zip`) containing:

| Content | Filename Pattern | Description |
|---|---|---|
| CSV data | `LOTO_FieldData_YYYY-MM-DD.csv` | All equipment and energy source rows |
| Equipment photos | `{EquipName}_main.jpg` | Main equipment photo |
| | `{EquipName}_dataplate.jpg` | Data plate photo |
| | `{EquipName}_ee.jpg` | EE number photo |
| Source photos | `{EquipName}_source{N}.jpg` | Energy source photo (1-indexed) |

**Excel Info Sheet** — Professional formatted `.xlsx` with equipment headers, 10-row source tables, photo filename references, and page numbering.

## Architecture

```
loto-info-sheet/
├── index.html      # Single-page application (HTML + CSS + JS, all-in-one)
├── manifest.json   # PWA manifest (app name, theme, display mode)
├── sw.js           # Service Worker (network-first caching, offline fallback)
└── README.md
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (no framework) |
| Styling | CSS custom properties, dark theme, mobile-first responsive grid |
| Storage (primary) | IndexedDB — full-resolution photos as ArrayBuffers |
| Storage (fallback) | localStorage — JSON metadata, thumbnails, base64 photo fallback |
| Offline | Service Worker with network-first strategy |
| ZIP generation | [JSZip 3.10.1](https://stuk.github.io/jszip/) (CDN) |
| Excel generation | [ExcelJS 4.4.0](https://github.com/exceljs/exceljs) (CDN) |

### Data Flow

```
Camera / File Input
       │
       ▼
  Photo captured (resized to configured resolution)
       │
       ├──► IndexedDB  (full-res ArrayBuffer, keyed by dbKey)
       └──► localStorage (thumbnail for preview)
       
Form Inputs ──► localStorage (auto-saved as JSON)
       │
       ▼
  Save Entry ──► Saved Equipment list (localStorage)
       │
       ▼
  Export All ──► ZIP blob (JSZip) ──► Browser download
             ──► XLSX (ExcelJS)  ──► Embedded in ZIP
```

### UI Layout

- **Header** — App title, version badge, navigation (List, Settings, Import, Backup, Export)
- **Saved Equipment Panel** — Collapsible sidebar listing previously saved entries
- **Equipment Form** — 2-column grid for equipment metadata fields
- **Photo Grid** — 3-column capture grid (Main, Data Plate, EE Number)
- **Energy Sources** — Dynamic collapsible cards with add/remove controls
- **Notes Section** — Free-text area per equipment entry
- **Bottom Bar** — Source counter, storage usage indicator, Save & New / Export buttons

## Getting Started

No build step required. The app is a single HTML file served via GitHub Pages.

**To run locally:**

```bash
# Any static file server works
python3 -m http.server 8000
# Then open http://localhost:8000
```

**To install on mobile:**
1. Visit [the live app](https://whittw1.github.io/loto-info-sheet/)
2. Tap the browser's share/menu button
3. Select "Add to Home Screen"

## Browser Compatibility

Designed for modern mobile browsers with camera access. Includes iOS Safari-specific fallbacks for photo storage (localStorage base64 when IndexedDB is unreliable).
