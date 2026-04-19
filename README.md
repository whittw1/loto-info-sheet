# LOTO Field Collector v7.0

A progressive web app (PWA) for field data collection of Lockout/Tagout (LOTO) information. Built for technicians to document equipment details, energy sources, capture photos, and annotate overhead diagrams directly from mobile devices — fully offline-capable.

**Live URLs (all four URLs serve the same merged app):**

| Platform | Main URL | FL Alias |
|---|---|---|
| Azure Static Web Apps | [delightful-bay-02569820f.7.azurestaticapps.net](https://delightful-bay-02569820f.7.azurestaticapps.net/) | [.../FingerLakes_Information_Sheet.html](https://delightful-bay-02569820f.7.azurestaticapps.net/FingerLakes_Information_Sheet.html) |
| GitHub Pages (legacy) | [whittw1.github.io/loto-info-sheet](https://whittw1.github.io/loto-info-sheet/) | [.../FingerLakes_Information_Sheet.html](https://whittw1.github.io/loto-info-sheet/FingerLakes_Information_Sheet.html) |

> **Note on filenames:** As of v7.0, `index.html` and `FingerLakes_Information_Sheet.html` contain **identical code**. Both URLs are preserved to keep existing PWA installs and bookmarks working. All future changes land in both files simultaneously.

> **Note on deployment:** Each push to `main` deploys to **both** Azure Static Web Apps and GitHub Pages in parallel. Azure is the primary target going forward (proper cache headers fix the SW update propagation issue); GitHub Pages stays live to preserve legacy PWA installs.

---

## Features

- **Equipment Documentation** — Log equipment type (28+ presets), name, building, room, and location
- **Energy Source Tracking** — Up to 10 sources per equipment with 40+ energy types (Electrical 120V–4160V, Steam, Glycol, Hydraulic, etc.), device types, quantities, and verification methods
- **Photo Capture** — Three equipment photo slots (Main, Data Plate, EE Number) plus per-source photos, with configurable resolution and compression; tap existing photo to view before retaking
- **Templates** — Pre-configured templates (AHU variants, Pumps, Boilers, Chillers, Elevators, ATS models, Water Heater variants, etc.) that auto-populate energy sources; supports custom templates
- **Conditional Dropdown Filtering** — Device types filter based on selected energy source (e.g., steam shows valves only, electrical shows breakers/disconnects). Verification methods filter based on device type with temperature variants (Hot/CHW) auto-resolved from energy source
- **Template Filtering by Equipment Type** — Template dropdown shows only relevant templates for the selected equipment type (e.g., Air Handler shows only AHU templates, ATS shows only ATS variants)
- **Custom Source Keyword Matching** — Custom energy sources (e.g., "HV Water") are matched by keyword to determine appropriate devices, verifications, and label prefixes
- **Voltage Prompt System** — ATS, Generator, and Chiller equipment types prompt for voltage selection (208V/480V) to auto-populate Electrical sources
- **Auto-Source Injection** — Equipment types auto-add standard energy sources (e.g., Elevator → Gravity/Potential; pumps → Kinetic + Electrical 208V; Condensing Unit → Electrical 208V + Disconnect)
- **Condensate Auto-Fill** — Condensate sources on AHUs, Heat Exchangers, Water Heaters, and Unit Heaters auto-fill Gate Valve + Temp Only - Hot
- **Duplicate Energy Source** — Clone any source card within an equipment entry
- **Reorder Energy Sources** — ▲/▼ arrows on each source card (both collapsed and expanded views) to nudge sources into the right order; photos move with their source
- **Link Shared Sources** — Link a source to another equipment's source (for shared valves, breakers, etc.). Room/building/all scope filter. Linked source hides its photo slot (photo lives on the referenced source) and inherits the diagram label
- **Preserved Edit State** — Editing a saved entry no longer removes it from the saved list. The entry shows an **EDITING** badge and the original is preserved until Save & New replaces it in place
- **Offline Support** — Service Worker with network-first caching strategy; works without internet after first load
- **Installable** — PWA manifest allows "Add to Home Screen" on mobile devices
- **Import / Backup** — JSON-based backup and restore with merge-or-replace on import and duplicate detection
- **Tied-To Equipment** — Track interdependent systems across entries
- **Export Date Filter** — Export dialog lets you pick a specific date's entries, all dates, or undated entries. Filename includes the date suffix for specific-day exports.

### Overhead Sketch System

Collapsible section that auto-expands when a template's diagram is available or when editing an entry that already has sketch data.

- **20 SVG equipment diagrams** covering AHU, pumps, generators, chillers, heat exchangers, elevators, cooling towers, compressors, vacuum pumps, water heaters, UPS, and a general grid
- **Apple Pencil / finger drawing** on a canvas overlay with multiple pen colors
- **Draggable energy labels** (E-1, S-1, W-1, etc.) placed on the diagram; tap to place, drag to reposition, tap again to remove
- **Label picker filters to source-relevant prefixes only** (e.g., if the equipment has only electrical + steam sources, only E and S labels are offered)
- **Room-based label numbering** — numbers continue across all equipment in the same building+room (so AHU-1's S-3 and AHU-2's S-4 are consecutive, not both S-1)
- **Linked sources inherit the linked equipment's label** — if you link AHU-2's steam source to AHU-1's S-3, AHU-2's picker offers S-3 (same physical tag on both info sheets)
- **General Diagram Override** — switch any equipment to the blank grid
- **Undo Last Label** and Undo (stroke) buttons
- **Clear Sketch** button (confirmation required)

### Per-Site Fields

- **Building Picker Dropdown** — Preset list of VA campus buildings (currently Finger Lakes: 10, 14, 17, 18, 20, 24, 29A, 31, 32, 34, 35, 39, 41, 75, 92, 104) with custom option. Editable via code for other sites.
- **Room Auto-Fill** — Room number persists alongside building after Save & New
- **Misc Photos** — Additional photo capture slots beyond standard equipment/source photos
- **Device ID Field** — Per-source identifier (e.g., Pump 3, V-201)

## Conditional Filtering Maps

### Device Type Filtering (by Energy Source)

| Energy Source Category | Available Devices |
|---|---|
| Electrical | Disconnect, VFD, Switch, Breaker, Plug, Fuse, Quick Disconnect (+ padlock variants) |
| Steam / Water (HHW, CHW, Condensate, DW, Feedwater, Glycol, etc.) | Gate Valve, Ball Valve, Butterfly Valve, Ckt Setter, Chain (+ cable/padlock variants) |
| Pneumatic / Gas / Fuel / Refrigerant / Chemical / Thermal | Gate Valve, Ball Valve, Butterfly Valve, Chain (no Ckt Setter) |
| Kinetic | Rotating |
| Gravity/Potential | Potential |
| Hydraulic | Hydraulic |
| Custom/Unknown | Full device list |

### Verification Filtering (by Device Type + Energy Source)

| Device | Base Verification Options |
|---|---|
| Breaker | Meter, Controls, SW (On/Off), SW (Hand/Off/Auto), Button (Start/Stop), Button (Other) |
| Disconnect | Controls, Meter, SW (On/Off), SW (Hand/Off/Auto), SW (H/O/A), SW (Other), Button (Start/Stop), Button (Other) |
| VFD | Controls, Meter, SW (Hand/Off/Auto), SW (H/O/A), SW (Drive/Off/Bypass), SW (VFD/Off/Bypass), SW (Other), Button (Start/Stop) - VFD, Button (Hand/Off/Auto) - VFD, Button (Other) |
| Switch | Controls, Meter, SW (On/Off), SW (Hand/Off/Auto), Button (Start/Stop), Button (Other) |
| Plug | Controls |
| All Valves + Ckt Setter + Chain | Gauge/Drain, GaugeOnly, Drain Only (with Hot/CHW variants from energy source) + Temp Only - Hot for hot sources |
| Rotating | Rotating |
| Potential | Block |
| No device selected yet | Union of all verifications valid for the selected energy source |
| Custom/Unknown | Full verification list |

**Temperature variants** (applied to valve verifications):
- **Hot** (Steam, HPS, LPS, MPS, HHW, DHW, DW, Feedwater, Condensate): Gauge/Drain - Hot, GaugeOnly - Hot, Drain Only - Hot, Temp Only - Hot (shown first)
- **CHW** (CHW, CW, Condenser Water): Gauge/Drain - CHW, GaugeOnly - CHW
- **Other** (Domestic, Pneumatic, Fuel, etc.): Gauge/Drain, GaugeOnly, Drain Only (plain)

### Template Filtering (by Equipment Type)

| Equipment Type | Available Templates |
|---|---|
| Air Handler | AHU - Steam, AHU - HHW, AHU - Steam CHW HHW |
| Elevator | Elevator - Traction, Elevator - Hydraulic |
| ATS | ATS - Generic, ASCO 7000, Non Byp, Kohler, Zenith |
| Condensate Return Unit | Condensate Return Unit, Condensate Return Unit - Steam |
| Unit Heater | Unit Heater - Steam, Unit Heater - HHW |
| Domestic Water Heater | Water Heater - Steam, Water Heater - Gas, Water Heater - Electric |
| Heat Exchanger | Heat Exchanger - Steam, Heat Exchanger - CHW/Glycol |
| Mini Split | Condensing Unit |
| Condensate Pump | Heating Hot Water Pump |
| Humidifier | Water Heater - Steam (general diagram override) |
| Boiler / Steam PRV Station | Standard Electrical (general diagram) |
| Single-match types | Auto-selected |
| Custom / New Equipment | Full template list |

See `LOTO_Mapping_Reference.docx` (local working copy) for the complete auto-source mapping for every template.

## Export Formats

**ZIP Export** (`LOTO_Export_YYYY-MM-DD[_filterdate].zip`) containing:

| Content | Filename Pattern | Description |
|---|---|---|
| CSV data | `LOTO_FieldData_YYYY-MM-DD.csv` | All equipment and energy source rows (includes Linked To column) |
| Equipment photos | `{EquipName}_main.jpg` | Main equipment photo |
| | `{EquipName}_dataplate.jpg` | Data plate photo |
| | `{EquipName}_ee.jpg` | EE number photo |
| Source photos | `{EquipName}_source{N}.jpg` | Energy source photo (1-indexed) |
| Diagrams | `{EquipName}_diagram.png` | Annotated overhead sketch |

**Excel Info Sheet** — Professional formatted `.xlsx` with equipment headers, 10-row source tables, photo filename references, page numbering, and linked-source markers in the detail cell.

## Architecture

```
loto-info-sheet/
├── index.html                          # Main app (identical content at both URLs)
├── FingerLakes_Information_Sheet.html  # Same file — preserved for existing bookmarks/PWA installs
├── manifest.json                       # PWA manifest
├── manifest_fl.json                    # PWA manifest (kept for existing FL PWA installs)
├── sw.js                               # Service Worker (network-first caching)
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
| Sketch | Inline SVG diagrams + HTML5 Canvas overlay with pointer events (Apple Pencil support via setPointerCapture) |

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
       │    (or replace-in-place if editingEntry is set)
       ▼
  Export (filtered by date) ──► ZIP blob (JSZip) ──► Browser download
                            ──► XLSX (ExcelJS)  ──► Embedded in ZIP
```

### UI Layout

- **Header** — App title, version badge, navigation (List, Settings, Import, Backup, Export)
- **Saved Equipment Panel** — Collapsible sidebar listing previously saved entries with edit/duplicate/delete. Entries currently being edited show an **EDITING** badge.
- **Equipment Form** — 2-column grid for equipment metadata fields (type, name, building, room, template, tied-to)
- **Photo Grid** — 3-column capture grid (Main, Data Plate, EE Number) with view-before-retake
- **Energy Sources** — Dynamic collapsible cards with add/remove/duplicate/reorder/link controls; conditional device and verification dropdowns
- **Overhead Sketch** — Collapsible section with SVG diagram + canvas drawing layer + draggable energy labels
- **Misc Photos** — Additional photos beyond the standard equipment/source slots
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

**Cache bypass:** Append `?bypass=1` to the URL to force-load the latest version (useful when the service worker is caching an old version).

## Browser Compatibility

Designed for modern mobile browsers with camera access. Includes iOS Safari-specific fallbacks for photo storage (localStorage base64 when IndexedDB is unreliable). Service worker uses one-time purge on first load to clear stale caches.

## Version History

- **v7.0** — **Merged the FL and original editions into a single codebase.** Both URLs now serve identical content; all future changes land in both files at once. Added collapsible Overhead Sketch section.
- **v6.15 (FL) / v6.6 (original)** — Water Heater - Electric template added
- **v6.14 (FL) / v6.5 (original)** — Preserved saved entry during editing (no more data loss on cancel), improved linked source label fallback
- **v6.11 (FL) / v6.3 (original)** — Export dialog date filter
- **v6.10 (FL)** — Linked sources inherit diagram label from referenced equipment; larger label markers on diagram
- **v5.97 (FL) / v5.0 (original)** — Conditional device/verification/template filtering, custom source keyword matching, condensate auto-fill, DISC removal from diagrams
- **v5.87 (FL) / v4.4 (original)** — Voltage prompt system, duplicate source button, photo view-before-retake, draggable labels, building picker
- **v4.0** — IndexedDB photo storage, equipment templates, auto-source injection, export system
