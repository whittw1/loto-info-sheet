# LOTO Field Collector v5.0

A progressive web app (PWA) for field data collection of Lockout/Tagout (LOTO) information. Built for technicians to document equipment details, energy sources, and capture photos directly from mobile devices — fully offline-capable.

**Live App:** [whittw1.github.io/loto-info-sheet](https://whittw1.github.io/loto-info-sheet/)
**Finger Lakes VA:** [FingerLakes_Information_Sheet.html](https://whittw1.github.io/loto-info-sheet/FingerLakes_Information_Sheet.html)

---

## Features

- **Equipment Documentation** — Log equipment type (28+ presets), name, building, room, and location
- **Energy Source Tracking** — Up to 10 sources per equipment with 40+ energy types (Electrical 120V–4160V, Steam, Glycol, Hydraulic, etc.), device types, quantities, and verification methods
- **Photo Capture** — Three equipment photo slots (Main, Data Plate, EE Number) plus per-source photos, with configurable resolution and compression; tap existing photo to view before retaking
- **Templates** — 22 pre-configured templates (AHU variants, Pumps, Boilers, Chillers, Elevators, ATS models, etc.) that auto-populate energy sources; supports custom templates
- **Conditional Dropdown Filtering** — Device types filter based on selected energy source (e.g., steam shows valves only, electrical shows breakers/disconnects). Verification methods filter based on device type with temperature variants (Hot/CHW) auto-resolved from energy source
- **Template Filtering by Equipment Type** — Template dropdown shows only relevant templates for the selected equipment type (e.g., Air Handler shows only AHU templates, ATS shows only ATS variants)
- **Custom Source Keyword Matching** — Custom energy sources (e.g., "HV Water") are matched by keyword to determine appropriate devices, verifications, and label prefixes
- **Voltage Prompt System** — ATS, Generator, and Chiller equipment types prompt for voltage selection (208V/480V) to auto-populate Electrical sources
- **Auto-Source Injection** — Equipment types auto-add standard energy sources (e.g., Elevator → Gravity/Potential; pumps → Kinetic + Electrical 208V; Condensing Unit → Electrical 208V + Disconnect)
- **Condensate Auto-Fill** — Condensate sources on AHUs, Heat Exchangers, Water Heaters, and Unit Heaters auto-fill Gate Valve + Temp Only - Hot
- **Duplicate Energy Source** — Clone any source card within an equipment entry
- **Offline Support** — Service Worker with network-first caching strategy; works without internet after first load
- **Installable** — PWA manifest allows "Add to Home Screen" on mobile devices
- **Import / Backup** — JSON-based backup and restore with merge-or-replace on import and duplicate detection
- **Tied-To Equipment** — Track interdependent systems across entries

### Finger Lakes VA Edition (Additional Features)

- **Building Picker Dropdown** — Preset list of VA campus buildings (10, 14, 17, 18, 20, 24, 29A, 31, 32, 34, 39, 41, 75, 92, 104) with custom option
- **Room Auto-Fill** — Room number persists alongside building after Save & New
- **Overhead Sketch System** — 20 SVG equipment diagrams with canvas drawing overlay for Apple Pencil annotation
- **Draggable Energy Labels** — Tap diagram to place color-coded labels (E-1, S-1, W-1, etc.); drag to reposition; tap to remove
- **Source-Relevant Labels Only** — Label picker shows only prefixes matching current energy sources
- **Label Prefix Mapping** — Longest-match-first algorithm maps energy sources to correct label prefixes (E=Electrical, S=Steam, W=Water/Condensate/CHW, P=Pneumatic, F=Fuel, G=Gas, H=Hydraulic, K=Kinetic, R=Refrigerant, CH=Chemical, TH=Thermal)
- **General Diagram Override** — Switch any equipment to the general blank-grid diagram
- **Undo Last Label** — Remove the most recently placed label
- **Misc Photos** — Additional photo slots beyond standard equipment photos
- **Device ID Field** — Per-source field for device identifiers (e.g., Pump 3, V-201)

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
| Custom/Unknown | Full verification list |

**Temperature variants** (applied to valve verifications):
- **Hot** (Steam, HPS, LPS, MPS, HHW, DHW, DW, Feedwater, Condensate): Gauge/Drain - Hot, GaugeOnly - Hot, Drain Only - Hot, Temp Only - Hot
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
| Domestic Water Heater | Water Heater - Steam, Water Heater - Gas |
| Mini Split | Condensing Unit |
| Condensate Pump | Heating Hot Water Pump |
| Boiler / Steam PRV Station | Standard Electrical |
| Single-match types | Auto-selected |
| Custom / New Equipment | Full template list |

## Export Formats

**ZIP Export** (`LOTO_Export_YYYY-MM-DD.zip`) containing:

| Content | Filename Pattern | Description |
|---|---|---|
| CSV data | `LOTO_FieldData_YYYY-MM-DD.csv` | All equipment and energy source rows |
| Equipment photos | `{EquipName}_main.jpg` | Main equipment photo |
| | `{EquipName}_dataplate.jpg` | Data plate photo |
| | `{EquipName}_ee.jpg` | EE number photo |
| Source photos | `{EquipName}_source{N}.jpg` | Energy source photo (1-indexed) |
| Diagrams (FL) | `{EquipName}_diagram.png` | Annotated overhead sketch |

**Excel Info Sheet** — Professional formatted `.xlsx` with equipment headers, 10-row source tables, photo filename references, and page numbering.

## Architecture

```
loto-info-sheet/
├── index.html                          # Original single-page app (HTML + CSS + JS)
├── FingerLakes_Information_Sheet.html  # Finger Lakes VA edition (extended features)
├── manifest.json                       # PWA manifest for original app
├── manifest_fl.json                    # PWA manifest for Finger Lakes edition
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
- **Saved Equipment Panel** — Collapsible sidebar listing previously saved entries with edit/duplicate/delete
- **Equipment Form** — 2-column grid for equipment metadata fields (type, name, building, room, template, tied-to)
- **Photo Grid** — 3-column capture grid (Main, Data Plate, EE Number) with view-before-retake
- **Energy Sources** — Dynamic collapsible cards with add/remove/duplicate controls; conditional device and verification dropdowns
- **Overhead Sketch** (FL) — SVG diagram + canvas drawing layer + draggable energy labels
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

- **v5.0 / FL v5.97** — Conditional device/verification/template filtering, custom source keyword matching, condensate auto-fill, DISC removal from diagrams
- **v4.4 / FL v5.87** — Voltage prompt system, duplicate source button, photo view-before-retake, draggable labels, building picker
- **v4.0** — IndexedDB photo storage, equipment templates, auto-source injection, export system
