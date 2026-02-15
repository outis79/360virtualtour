# Virtual Tour Builder (Web)

This project is a browser-based editor and viewer for 360 virtual tours.
It is designed to work fully client-side and export a static package
that can be hosted on GitHub Pages and embedded in ArcGIS StoryMaps.

## Structure
- editor/  : the web editor (create, edit, save, export)
- viewer/  : the runtime viewer for exported tours
- shared/  : schemas, sample data, shared assets

## Key Features (planned)
- Multi-scene tours
- Local save/resume (IndexedDB)
- Static export for GitHub Pages
- Rich hotspots with multiple content blocks
- Custom hotspot icons
- Manual gyro toggle (mobile)
- VR Cardboard mode

## Running locally
Open `editor/index.html` or `viewer/index.html` in a browser.

## Embedding (ArcGIS StoryMaps)
Export the tour to a static site and embed the URL in StoryMaps.
