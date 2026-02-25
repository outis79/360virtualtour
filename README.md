# 360 Virtual Tour Builder

Client-side web app to create, edit, export, and view 360 tours powered by Marzipano.

The repository contains two separate applications:
- `editor/`: tour authoring environment
- `viewer/`: runtime viewer for exported tours

There are no build tools, backend services, or package manager requirements. Everything runs directly in the browser.

## Current Status
The project is operational and currently includes:
- scene group management
- unique group-name validation on create/rename
- per-group main scene selection
- panorama upload and scene creation
- project-level hard reset (`Reset Project` with typed confirmation: `reset`)
- cubemap tile generation (worker + main-thread fallback)
- selected-scene tiling (single or multi-select from scene list, already-tiled scenes are skipped)
- selected-scene deletion (`Delete Scene(s)`) including linked tile/map/link cleanup
- per-group floorplans with scene nodes
- map workflow modes: `Place`, `Edit`, `Select All`, point `Delete`
- per-scene map point colors (including bulk color apply with `Select All`)
- detailed group deletion warning with cascade impact summary
- standard hotspots and scene-link hotspots
- hotspot content blocks (`text`, `image`, `video`, `audio`, `link`, `scene`)
- local autosave with IndexedDB
- project JSON export
- static package export (ZIP or folder write)
- collapsible `Scene Actions` panel in right column (before `Map`)
- scene list sorting controls (`A/Z`, `UPLOAD`) with asc/desc toggle
- scene alias mode in list (`Alias ON/OFF`) with inline double-click editing
- per-scene comment field in `Scene Actions`
- keyboard scene navigation in list (`ArrowUp` / `ArrowDown`)
- scene-link label uses target scene alias (fallback: scene name)
- cross-group duplicate upload modal (`Proceed`, `Accept All`, `Skip`, `Skip All`, `List`, `Cancel`)
- viewer with groups, floorplan, hotspot modal, gyro toggle, and basic VR/Cardboard mode

## Editor/Viewer Synchronization
Verified synchronization points between `editor` and `viewer`:
- both use the same project source format (`shared/sample-tour.json`)
- static export always bundles current viewer runtime files (`viewer/index.html`, `viewer/app.js`, `viewer/styles.css`, `viewer/vendor/*`)
- scene-link hotspots (`contentBlocks.type = scene`) are resolved in viewer and switch scene correctly
- scene alias is used consistently by editor/viewer for `Go to ...` link labels
- per-group floorplan nodes are exported with per-node `colorKey` (fallback: floorplan `markerColorKey`) and rendered in viewer
- group `mainSceneId` from editor is now respected by viewer on initial load and when switching group

Practical implication: if a tour behaves correctly in editor and you export a static package, the exported viewer now follows the same group/scene entry logic.

## Repository Structure
- `editor/index.html`: editor UI
- `editor/app.js`: full editor logic
- `editor/tiler.worker.js`: equirectangular -> cubemap tiling worker
- `editor/vendor/jszip.min.js`: ZIP export support
- `viewer/index.html`: viewer UI
- `viewer/app.js`: viewer runtime logic
- `viewer/styles.css`: viewer styles
- `viewer/vendor/`: runtime libraries (`marzipano`, `screenfull`, `bowser`, reset CSS)
- `shared/sample-tour.json`: default project loaded by editor and viewer
- `shared/tour.schema.json`: JSON schema for the project format
- `shared/themes.json`: available theme variables (currently not applied by runtime code)
- `_tmp_marzipano.js`: local Marzipano copy (not directly referenced by the pages)

## Requirements
- modern desktop/mobile browser
- no npm installation required
- serving over local HTTP (not `file://`) is recommended to avoid `fetch`, worker, and file access limitations

Example local server from repository root:

```powershell
python -m http.server 5500
```

Then open:
- Editor: `http://localhost:5500/editor/index.html`
- Viewer: `http://localhost:5500/viewer/index.html`

## Quick Workflow (Editor -> Viewer)
1. Open `editor/index.html`.
2. Create a group (optional, but useful for organization).
3. Upload one or more panorama images (`Upload Img` in `Groups` panel).
4. Generate tiles (`Generate Tiles`) for current scene selection (single or multi-select).
5. Add hotspots and content.
6. Upload floorplan.
7. Use map modes:
   - `Place`: add the current scene on map (no duplicates for same scene)
   - `Edit`: drag/delete points, change selected point color
   - `Select All` (in edit mode): bulk select all points for delete/color apply
8. (Optional) Set the group entry scene with `Set Main Scene`.
9. (Optional) Use `Reset Project` from `Project` panel to clear all scenes/tiles/hotspots/maps/assets (requires typing `reset`).
10. Export:
   - `Export Project JSON` for backup/project exchange
   - `Export Static Package` for deployable output

To validate final output, open the exported package `viewer/index.html`.

## Project Format (Summary)
Each project includes:
- `project`: metadata (name, version, timestamps)
- `settings`: viewer options
- `groups`: scene grouping and per-group main scene
- `scenes`: scene metadata, initial view, hotspots, source or tile references
- `assets`: media library
- `minimap.floorplans`: per-group floorplan with scene nodes

Scene/link naming notes:
- `scenes[].alias` is the optional human-friendly label used by scene links (`Go to ...`) and alias list mode.
- `contentBlocks[].type = scene` uses `sceneId` + optional `comment`.
- Legacy per-link `alias` is no longer used by the UI/runtime and is removed on import normalization.

References:
- full example: `shared/sample-tour.json`
- schema: `shared/tour.schema.json`

## Static Export: Expected Output
Static export creates (ZIP or folder) a structure similar to:

```text
shared/sample-tour.json
viewer/index.html
viewer/app.js
viewer/styles.css
viewer/vendor/*
viewer/media/*
viewer/floorplans/*
viewer/tiles/<scene-id>/preview.jpg
viewer/tiles/<scene-id>/0/<face>/<y>/<x>.jpg
<project-name>-static.json
```

Operational notes:
- Generated tiles stay in memory until static export is executed.
- Export converts `dataUrl` assets into real files and rewrites JSON paths.
- In editor UI, scene-wide actions are grouped in the right panel under `Scene Actions`.
- Group-level image actions are in the left `Groups` panel (`Upload Img`, `Delete All Img`).
- Map maximize is constrained to a floating area over the panorama (full height, about 1/3 width).

## Deployment (GitHub Pages or Static Hosting)
1. Generate the static package from the editor.
2. Publish exported files while preserving folder structure.
3. Verify `shared/sample-tour.json` is reachable relative to `viewer/index.html`.
4. Open `viewer/index.html` from the public URL.

## Attribution Footer (Viewer)
The viewer now includes a built-in third-party attribution footer in `viewer/index.html`.

Current block:

```html
<footer class="license-footer">
  Powered by Marzipano (Apache-2.0), JSZip (MIT), Bowser (MIT), Screenfull (MIT), Reset CSS (Public Domain).
</footer>
```

You can then style it in `viewer/styles.css`, for example:

```css
.license-footer {
  padding: 8px 12px;
  font-size: 12px;
  color: #9aa6b2;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: #141a22;
}
```

You can customize or remove it if needed. Licenses are still documented in `THIRD_PARTY_LICENSES.md` and `licenses/`.

## Public Builder vs Personal Tours
If you publish this repository as a public editor, keep it content-neutral:
- keep `shared/sample-tour.json` as a blank template
- do not commit personal `viewer/tiles`, `viewer/media`, `viewer/floorplans`
- publish exported tours in a separate repository/folder

Recommended setup:
- Repo A: builder (`editor`, `viewer` runtime code, `shared` template)
- Repo B: exported tour package for final public delivery

## Local Persistence
The editor automatically stores a draft in IndexedDB:
- DB: `virtual-tour-builder`
- store: `projects`
- key: `autosave`

Local draft data takes precedence over `shared/sample-tour.json` when the editor starts.

## Known Limitations
- `shared/themes.json` and `shared/tour.schema.json` exist but are not automatically enforced/applied at runtime.
- Tile settings are collected via `prompt` (minimal UX, no advanced validation).
- VR mode currently provides Cardboard/fullscreen behavior; full WebXR integration is still partial.
- The viewer loads `../shared/sample-tour.json` by default. For a different tour, replace that file or update `viewer/app.js`.
- Cross-group duplicate detection is hash/name based (not visual similarity), so renamed/re-encoded files may still require manual confirmation.

## Dependency Licensing
The repository includes minified vendor files (Marzipano, JSZip, Bowser, Screenfull, Reset CSS).  
See `THIRD_PARTY_LICENSES.md` before public/commercial redistribution.
Local license texts are also included in `licenses/`.
