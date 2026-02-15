const sampleTourUrl = '../shared/sample-tour.json';
const fallbackProject = {
  project: {
    name: 'Sample Tour',
    version: '1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  settings: {
    mouseViewMode: 'drag',
    autorotateEnabled: false,
    fullscreenButton: true,
    gyroEnabled: false,
    vrEnabled: true
  },
  scenes: [
    {
      id: 'scene-entrance',
      groupId: 'group-main',
      name: 'Entrance',
      levels: [
        { tileSize: 256, size: 256, fallbackOnly: true },
        { tileSize: 512, size: 512 },
        { tileSize: 512, size: 1024 },
        { tileSize: 512, size: 2048 }
      ],
      faceSize: 2048,
      initialViewParameters: { yaw: 0, pitch: 0, fov: 1.4 },
      hotspots: [
        {
          id: 'hs-altar',
          yaw: 1.2,
          pitch: -0.1,
          iconId: 'info',
          title: 'Main Altar',
          contentBlocks: [
            { type: 'text', value: 'Short description.' },
            { type: 'image', assetId: 'img-altar' },
            { type: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
            { type: 'audio', assetId: 'aud-narration' },
            { type: 'link', label: 'Read more', url: 'https://example.com' }
          ]
        }
      ]
    }
  ],
  groups: [
    { id: 'group-main', name: 'Main Group' }
  ],
  assets: {
    icons: [{ id: 'info', path: 'icons/info.svg', name: 'Info' }],
    media: [
      { id: 'img-altar', type: 'image', path: 'media/altar.jpg', name: 'Altar Image' },
      { id: 'aud-narration', type: 'audio', path: 'media/narration.mp3', name: 'Narration' }
    ]
  },
  minimap: {
    enabled: false,
    image: 'minimap/floorplan.png',
    nodes: [],
    floorplans: []
  }
};

const DB_NAME = 'virtual-tour-builder';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const AUTOSAVE_KEY = 'autosave';

const state = {
  project: null,
  selectedGroupId: null,
  selectedSceneId: null,
  selectedHotspotId: null,
  selectedFloorplanId: null
};

const sceneList = document.getElementById('scene-list');
const sceneGroupSelect = document.getElementById('scene-group');
const hotspotList = document.getElementById('hotspot-list');
const linkSelect = document.getElementById('link-select');
const linkTargetSceneSelect = document.getElementById('link-target-scene');
const linkCommentInput = document.getElementById('link-comment');
const contentBlocks = document.getElementById('content-blocks');
const sceneTitle = document.getElementById('scene-title');
const projectNameInput = document.getElementById('project-name');
const projectFovInput = document.getElementById('project-fov');
const hotspotTitleInput = document.getElementById('hotspot-title');
const statusLeft = document.getElementById('status-left');
const btnAddGroup = document.getElementById('btn-add-group');
const btnRenameGroup = document.getElementById('btn-rename-group');
const btnDeleteGroup = document.getElementById('btn-delete-group');
const btnImport = document.getElementById('btn-import');
const btnSave = document.getElementById('btn-save');
const btnExport = document.getElementById('btn-export');
const btnExportStatic = document.getElementById('btn-export-static');
const btnUploadIcon = document.getElementById('btn-upload-icon');
const btnUploadMedia = document.getElementById('btn-upload-media');
const btnUploadFloorplan = document.getElementById('btn-upload-minimap');
const btnDeleteFloorplan = document.getElementById('btn-delete-floorplan');
const btnUploadPanorama = document.getElementById('btn-upload-panorama');
const btnGenerateTiles = document.getElementById('btn-generate-tiles');
const btnGenerateAllTiles = document.getElementById('btn-generate-all-tiles');
const btnCancelTiles = document.getElementById('btn-cancel-tiles');
const btnPauseTiles = document.getElementById('btn-pause-tiles');
const btnResumeTiles = document.getElementById('btn-resume-tiles');
const btnTogglePlacement = document.getElementById('btn-toggle-placement');
const btnPreviewHotspot = document.getElementById('btn-preview-hotspot');
const btnSetMainScene = document.getElementById('btn-set-main-scene');
const btnAddSceneLink = document.getElementById('btn-add-scene-link');
const btnDeleteSceneLink = document.getElementById('btn-delete-scene-link');
const btnRemoveAllLinks = document.getElementById('btn-remove-all-links');
const fileImport = document.getElementById('file-import');
const fileIcon = document.getElementById('file-icon');
const fileMedia = document.getElementById('file-media');
const fileFloorplan = document.getElementById('file-floorplan');
const filePanorama = document.getElementById('file-panorama');
const iconSelect = document.getElementById('icon-select');
const mediaList = document.getElementById('media-list');
const floorplanList = document.getElementById('floorplan-list');
const miniMap = document.getElementById('mini-map');
const tilingProgress = document.getElementById('tiling-progress');
const tilingProgressFill = document.getElementById('tiling-progress-fill');
const panoEditor = document.getElementById('pano-editor');
const viewerCanvas = document.getElementById('viewer-canvas');
const hotspotOverlay = document.getElementById('hotspot-overlay');
const hotspotHoverCard = document.getElementById('hotspot-hover-card');
const viewerPlaceholder = document.getElementById('viewer-placeholder');
const previewModal = document.getElementById('hotspot-preview-modal');
const previewModalTitle = document.getElementById('preview-modal-title');
const previewModalBody = document.getElementById('preview-modal-body');
const btnClosePreview = document.getElementById('btn-close-preview');

let dragState = null;
const generatedTiles = new Map();
let tilerWorker = null;
let lastProgressUpdate = 0;
let activeTilingRequestId = null;
let tilingPaused = false;
let editorViewer = null;
let editorScenes = new Map();
let placementMode = false;
let markerFrame = null;
let markerLoopId = null;
let suppressSceneSwitch = false;
let draggingHotspotId = null;
let dragMoved = false;
let dragPointerId = null;
let viewerPointerDown = null;
let suppressNextViewerClick = false;
let renamingSceneId = null;
let hoveredLinkHotspotId = null;

function updateStatus(message) {
  statusLeft.textContent = message;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDraft(project) {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(project, AUTOSAVE_KEY);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    updateStatus('Draft saved locally.');
  } catch (error) {
    console.error(error);
    updateStatus('Draft save failed.');
  }
}

async function loadDraft() {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(AUTOSAVE_KEY);
    return await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

function debounce(fn, wait = 600) {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), wait);
  };
}

const autosave = debounce(() => {
  if (state.project) {
    state.project.project.updatedAt = new Date().toISOString();
    saveDraft(state.project);
  }
}, 700);

function loadProject(project) {
  project.groups = project.groups || [{ id: 'group-main', name: 'Main Group' }];
  if (!project.groups.length) {
    project.groups.push({ id: `group-${Date.now()}`, name: 'Main Group' });
  }
  project.minimap = project.minimap || { enabled: false, floorplans: [] };
  project.minimap.floorplans = project.minimap.floorplans || [];
  project.scenes = project.scenes || [];

  const defaultGroupId = project.groups[0].id;
  project.scenes.forEach((scene) => {
    if (!scene.groupId) {
      scene.groupId = defaultGroupId;
    }
  });
  project.minimap.floorplans.forEach((floorplan) => {
    if (!floorplan.groupId) {
      floorplan.groupId = defaultGroupId;
    }
  });
  project.groups.forEach((group) => {
    const groupScenes = project.scenes.filter((scene) => scene.groupId === group.id);
    if (!groupScenes.length) {
      group.mainSceneId = null;
      return;
    }
    if (!group.mainSceneId || !groupScenes.some((scene) => scene.id === group.mainSceneId)) {
      group.mainSceneId = groupScenes[0].id;
    }
  });

  state.project = project;
  state.selectedGroupId = project.groups[0]?.id || null;
  const firstScene =
    getPreferredSceneForGroup(state.selectedGroupId) ||
    project.scenes[0] ||
    null;
  state.selectedSceneId = firstScene?.id || null;
  state.selectedHotspotId = firstScene?.hotspots?.[0]?.id || null;
  state.selectedFloorplanId = getFloorplanForGroup(state.selectedGroupId)?.id || null;

  projectNameInput.value = project.project.name || 'Untitled';
  projectFovInput.value = project.scenes[0]?.initialViewParameters?.fov || 1.4;
  renderAll();
  updatePlacementButtonLabel();
  initEditorViewer(project);
}

function renderAll() {
  renderSceneGroupOptions();
  renderSceneList();
  renderHotspotList();
  renderLinkEditor();
  renderContentBlocks();
  updateSceneTitle();
  renderIconOptions();
  renderMediaList();
  renderFloorplans();
  switchEditorScene();
}

function updateSceneTitle() {
  const scene = getSelectedScene();
  sceneTitle.textContent = scene ? `Scene: ${scene.name}` : 'Scene: -';
}

function getSelectedScene() {
  return state.project?.scenes.find((scene) => scene.id === state.selectedSceneId) || null;
}

function getSelectedGroup() {
  return state.project?.groups?.find((group) => group.id === state.selectedGroupId) || null;
}

function getGroupById(groupId) {
  if (!groupId) return null;
  return state.project?.groups?.find((group) => group.id === groupId) || null;
}

function getScenesForSelectedGroup() {
  const groupId = state.selectedGroupId;
  return (state.project?.scenes || []).filter((scene) => scene.groupId === groupId);
}

function getPreferredSceneForGroup(groupId) {
  const scenes = (state.project?.scenes || []).filter((scene) => scene.groupId === groupId);
  if (!scenes.length) return null;
  const group = getGroupById(groupId);
  const preferred = scenes.find((scene) => scene.id === group?.mainSceneId);
  return preferred || scenes[0];
}

function getSelectedHotspot() {
  const scene = getSelectedScene();
  if (!scene) return null;
  return scene.hotspots.find((hotspot) => hotspot.id === state.selectedHotspotId) || null;
}

function isSceneLinkHotspot(hotspot) {
  return Boolean((hotspot?.contentBlocks || []).some((block) => block.type === 'scene'));
}

function getSceneLinkHotspots(scene = getSelectedScene()) {
  if (!scene) return [];
  return (scene.hotspots || []).filter((hotspot) => isSceneLinkHotspot(hotspot));
}

function getSceneLinkBlock(hotspot) {
  if (!hotspot) return null;
  return (hotspot.contentBlocks || []).find((block) => block.type === 'scene') || null;
}

function getSelectedLinkHotspot() {
  const selected = getSelectedHotspot();
  return isSceneLinkHotspot(selected) ? selected : null;
}

function renderLinkEditor() {
  if (!hotspotTitleInput || !linkTargetSceneSelect || !linkCommentInput) return;

  const linkHotspot = getSelectedLinkHotspot();
  const scenes = state.project?.scenes || [];
  const canEditLink = Boolean(linkHotspot && placementMode);

  linkTargetSceneSelect.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'None';
  linkTargetSceneSelect.appendChild(none);

  scenes.forEach((scene) => {
    const option = document.createElement('option');
    option.value = scene.id;
    option.textContent = scene.name || scene.id;
    linkTargetSceneSelect.appendChild(option);
  });

  if (!linkHotspot) {
    hotspotTitleInput.value = '';
    linkCommentInput.value = '';
    linkTargetSceneSelect.value = '';
    hotspotTitleInput.disabled = true;
    hotspotTitleInput.readOnly = true;
    linkCommentInput.disabled = true;
    linkTargetSceneSelect.disabled = true;
    return;
  }

  const sceneLinkBlock = getSceneLinkBlock(linkHotspot);
  hotspotTitleInput.disabled = false;
  hotspotTitleInput.readOnly = true;
  linkCommentInput.disabled = !canEditLink;
  linkTargetSceneSelect.disabled = !canEditLink;
  hotspotTitleInput.value = linkHotspot.title || '';
  linkCommentInput.value = sceneLinkBlock?.comment || '';
  linkTargetSceneSelect.value = sceneLinkBlock?.sceneId || '';
}

function getFloorplanForGroup(groupId) {
  if (!groupId) return null;
  return state.project?.minimap?.floorplans?.find((fp) => fp.groupId === groupId) || null;
}

function getSelectedFloorplan() {
  return getFloorplanForGroup(state.selectedGroupId);
}

function selectScene(sceneId) {
  const scene = state.project?.scenes?.find((item) => item.id === sceneId);
  if (!scene) return;

  state.selectedGroupId = scene.groupId || state.selectedGroupId;
  state.selectedSceneId = scene.id;
  state.selectedHotspotId = scene.hotspots[0]?.id || null;
  state.selectedFloorplanId = getFloorplanForGroup(state.selectedGroupId)?.id || null;

  renderSceneGroupOptions();
  updateSceneTitle();
  renderHotspotList();
  renderContentBlocks();
  renderIconOptions();
  renderMediaList();
  renderFloorplans();
  switchEditorScene();

  const sceneButtons = sceneList.querySelectorAll('.scene-item-main');
  sceneButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.sceneId === scene.id);
  });

}

function renderSceneGroupOptions() {
  sceneGroupSelect.innerHTML = '';
  const groups = state.project?.groups || [];
  groups.forEach((group) => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    sceneGroupSelect.appendChild(option);
  });

  sceneGroupSelect.disabled = groups.length === 0;
  const scene = getSelectedScene();
  if (scene?.groupId) {
    sceneGroupSelect.value = scene.groupId;
  } else if (state.selectedGroupId) {
    sceneGroupSelect.value = state.selectedGroupId;
  }
}

function renderSceneList() {
  sceneList.innerHTML = '';
  const scenes = getScenesForSelectedGroup();
  const group = getSelectedGroup();
  if (btnSetMainScene) {
    btnSetMainScene.disabled = scenes.length === 0;
  }
  scenes.forEach((scene) => {
    const row = document.createElement('div');
    row.className = 'scene-item-row';

    const main = document.createElement('button');
    main.className = `list-item scene-item-main${scene.id === state.selectedSceneId ? ' active' : ''}`;
    const isMainScene = group?.mainSceneId === scene.id;
    main.textContent = isMainScene ? `${scene.name} (Main)` : scene.name;
    main.dataset.sceneId = scene.id;
    let clickTimer = null;
    main.addEventListener('click', () => {
      clickTimer = setTimeout(() => {
        selectScene(scene.id);
      }, 220);
    });
    main.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      startInlineSceneRename(scene, main);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'scene-action';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete scene';
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteSceneById(scene.id);
    });

    const orientationBtn = document.createElement('button');
    orientationBtn.className = `scene-action${scene.orientationSaved ? ' orientation-set' : ''}`;
    orientationBtn.type = 'button';
    orientationBtn.title = scene.orientationSaved ? 'Orientation saved' : 'Set orientation';
    orientationBtn.textContent = '◉';
    orientationBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setSceneOrientationById(scene.id);
    });

    row.appendChild(main);
    row.appendChild(orientationBtn);
    row.appendChild(deleteBtn);
    sceneList.appendChild(row);
  });
}

function renameScene(scene, newName) {
  scene.name = (newName || '').trim() || 'Untitled Scene';
  if (scene.id === state.selectedSceneId) {
    updateSceneTitle();
  }
  renderSceneList();
  autosave();
}

function startInlineSceneRename(scene, listButton) {
  if (!scene || !listButton) return;
  if (renamingSceneId && renamingSceneId !== scene.id) {
    renamingSceneId = null;
    renderSceneList();
  }
  renamingSceneId = scene.id;
  listButton.innerHTML = '';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = scene.name || '';
  input.className = 'input';
  input.style.width = '100%';
  listButton.appendChild(input);
  input.focus();
  input.select();

  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    renamingSceneId = null;
    renameScene(scene, input.value);
  };
  const cancel = () => {
    if (committed) return;
    committed = true;
    renamingSceneId = null;
    renderSceneList();
  };

  input.addEventListener('click', (event) => event.stopPropagation());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  });
  input.addEventListener('blur', commit);
}

function initEditorViewer(project) {
  if (!window.Marzipano || !panoEditor) {
    return;
  }

  if (!editorViewer) {
    editorViewer = createEditorViewer(project);
    panoEditor.addEventListener('click', handleViewerClick);
    viewerCanvas.addEventListener('click', handleViewerClick);
    viewerCanvas.addEventListener('mousemove', handleViewerMouseMove);
    viewerCanvas.addEventListener('mouseleave', hideHotspotHoverCard);
    viewerCanvas.addEventListener('pointerdown', onViewerPointerDown, true);
    viewerCanvas.addEventListener('pointerup', onViewerPointerUp, true);
    window.addEventListener('resize', scheduleMarkerRender);
    startMarkerLoop();
  }

  refreshEditorScenes();
}

function createEditorViewer(project) {
  return new Marzipano.Viewer(panoEditor, {
    controls: {
      mouseViewMode: project.settings?.mouseViewMode || 'drag'
    }
  });
}

function resetEditorViewer() {
  updateStatus('Viewer reset requested. Please refresh the page if preview fails.');
}

function refreshEditorScenes() {
  if (!editorViewer || !state.project) return;
  state.project.scenes.forEach((sceneData) => {
    const preview = buildScenePreview(sceneData);
    if (!preview) {
      return;
    }

    const signature = getSceneSignature(sceneData);
    const existing = editorScenes.get(sceneData.id);
    if (existing && existing.signature === signature) {
      existing.data = sceneData;
      return;
    }

    const view = new Marzipano.RectilinearView(
      sceneData.initialViewParameters || { yaw: 0, pitch: 0, fov: 1.4 },
      preview.limiter
    );
    const scene = editorViewer.createScene({
      source: preview.source,
      geometry: preview.geometry,
      view,
      pinFirstLevel: true
    });
    editorScenes.set(sceneData.id, { scene, view, data: sceneData, signature });
  });

  scheduleMarkerRender();
}

function getSceneSignature(sceneData) {
  const src = sceneData?.sourceImage?.dataUrl || '';
  const srcHead = src.slice(0, 128);
  const srcTail = src.slice(-128);
  const tilesPath = sceneData?.tilesPath || '';
  const previewPath = sceneData?.previewPath || '';
  const levels = JSON.stringify(sceneData?.levels || []);
  return `${src.length}|${srcHead}|${srcTail}|${tilesPath}|${previewPath}|${levels}`;
}

function buildScenePreview(sceneData) {
  if (sceneData?.sourceImage?.dataUrl) {
    const width = sceneData.sourceImage.width || sceneData.faceSize || 4096;
    return {
      source: Marzipano.ImageUrlSource.fromString(sceneData.sourceImage.dataUrl),
      geometry: new Marzipano.EquirectGeometry([{ width }]),
      limiter: Marzipano.RectilinearView.limit.traditional(width, Math.PI, Math.PI)
    };
  }

  const levels = (sceneData.levels || []).filter((level) => level.size && level.tileSize);
  const hasSelectable = levels.some((level) => !level.fallbackOnly);
  if (levels.length === 0 || !hasSelectable) {
    return null;
  }

  const tilesPath = sceneData.tilesPath || `tiles/${sceneData.id}`;
  const previewPath = sceneData.previewPath || `${tilesPath}/preview.jpg`;
  return {
    source: Marzipano.ImageUrlSource.fromString(
      `${tilesPath}/{z}/{f}/{y}/{x}.jpg`,
      { cubeMapPreviewUrl: previewPath }
    ),
    geometry: new Marzipano.CubeGeometry(levels),
    limiter: Marzipano.RectilinearView.limit.traditional(sceneData.faceSize || 2048, Math.PI, Math.PI)
  };
}

function switchEditorScene() {
  hideHotspotHoverCard();
  const selected = editorScenes.get(state.selectedSceneId);
  if (!selected) {
    viewerPlaceholder.style.display = 'block';
    panoEditor.style.visibility = 'hidden';
    hotspotOverlay.innerHTML = '';
    return;
  }

  panoEditor.style.visibility = 'visible';
  viewerPlaceholder.style.display = 'none';
  if (suppressSceneSwitch) {
    return;
  }
  try {
    selected.view.setParameters(selected.data.initialViewParameters || { yaw: 0, pitch: 0, fov: 1.4 });
    selected.scene.switchTo();
  } catch (error) {
    console.warn('Viewer switch failed:', error);
    if (String(error?.message || '').includes('Stage not in sync')) {
      updateStatus('Viewer sync error. Reload the page if preview disappears.');
    }
  }
  scheduleMarkerRender();
}

function handleViewerClick(event) {
  if (suppressNextViewerClick) {
    suppressNextViewerClick = false;
    return;
  }

  if (!state.project || !state.selectedHotspotId) {
    if (placementMode) {
      updateStatus('Select a hotspot first.');
      return;
    }
  }
  const active = editorScenes.get(state.selectedSceneId);
  if (!active) return;

  const viewPoint = getViewPointFromEvent(event);
  if (!viewPoint) return;
  const { x, y } = viewPoint;

  if (!placementMode) {
    const markerHit = findMarkerAtScreen(event.clientX, event.clientY, 12);
    if (markerHit) {
      openHotspotPreviewOrFollowLink(markerHit);
      return;
    }
    const hotspot = findHotspotAtScreen(x, y, active, 10);
    if (hotspot) {
      openHotspotPreviewOrFollowLink(hotspot.id);
    }
    return;
  }

  const coords = active.view.screenToCoordinates({ x, y }, {});
  if (!coords || typeof coords.yaw !== 'number' || typeof coords.pitch !== 'number') return;

  const hotspot = getSelectedHotspot();
  if (!hotspot) return;
  hotspot.yaw = coords.yaw;
  hotspot.pitch = coords.pitch;
  updateStatus('Hotspot position updated.');
  autosave();
  scheduleMarkerRender();
}

function onViewerPointerDown(event) {
  if (!event.isPrimary || event.button !== 0) return;
  viewerPointerDown = { x: event.clientX, y: event.clientY };
}

function onViewerPointerUp(event) {
  if (!event.isPrimary || event.button !== 0) return;
  if (!viewerPointerDown) return;
  const dx = event.clientX - viewerPointerDown.x;
  const dy = event.clientY - viewerPointerDown.y;
  const moved = Math.hypot(dx, dy);
  viewerPointerDown = null;
  if (moved > 5) {
    suppressNextViewerClick = true;
    return;
  }

  if (!placementMode) {
    const markerHit = findMarkerAtScreen(event.clientX, event.clientY, 16);
    if (markerHit) {
      openHotspotPreviewOrFollowLink(markerHit);
      suppressNextViewerClick = true;
    }
  }
}

function getHotspotSceneLinkTarget(hotspot) {
  if (!hotspot) return null;
  const block = (hotspot.contentBlocks || []).find((item) => item.type === 'scene' && item.sceneId);
  if (!block) return null;
  return state.project?.scenes?.find((scene) => scene.id === block.sceneId) || null;
}

function openHotspotPreviewOrFollowLink(hotspotId) {
  const scene = getSelectedScene();
  const hotspot = scene?.hotspots?.find((item) => item.id === hotspotId) || null;
  if (!hotspot) return;
  hideHotspotHoverCard();
  const targetScene = getHotspotSceneLinkTarget(hotspot);
  if (targetScene) {
    selectScene(targetScene.id);
    updateStatus(`Go to "${targetScene.name}".`);
    return;
  }
  openHotspotPreview(hotspotId);
}

function findHotspotAtScreen(x, y, active, radius) {
  const scene = getSelectedScene();
  if (!scene) return null;
  const viewWidth = active.view.width();
  const viewHeight = active.view.height();
  const scale = getViewScale(active);
  let closest = null;
  let closestDist = radius * radius;
  const markerOffsetY = -5;

  scene.hotspots.forEach((hotspot) => {
    const coords = active.view.coordinatesToScreen({ yaw: hotspot.yaw, pitch: hotspot.pitch }, {});
    if (!coords || coords.x === null || coords.y === null) return;
    if (coords.x < 0 || coords.y < 0 || coords.x > viewWidth || coords.y > viewHeight) return;
    const cssX = coords.x / scale.x;
    const cssY = coords.y / scale.y + markerOffsetY;
    const dx = cssX - x;
    const dy = cssY - y;
    const dist = dx * dx + dy * dy;
    if (dist <= closestDist) {
      closest = hotspot;
      closestDist = dist;
    }
  });

  return closest;
}

function getLinkHoverDetails(hotspotId) {
  const scene = getSelectedScene();
  if (!scene) return null;
  const hotspot = (scene.hotspots || []).find((item) => item.id === hotspotId) || null;
  if (!hotspot || !isSceneLinkHotspot(hotspot)) return null;
  const targetScene = getHotspotSceneLinkTarget(hotspot);
  const sceneBlock = getSceneLinkBlock(hotspot);
  return {
    linkName: hotspot.linkCode || hotspot.title || hotspot.id,
    targetName: targetScene?.name || targetScene?.id || 'Unassigned target',
    comment: (sceneBlock?.comment || '').trim()
  };
}

function positionHoverCard(clientX, clientY) {
  if (!hotspotHoverCard || hotspotHoverCard.getAttribute('aria-hidden') === 'true') return;
  const rect = viewerCanvas.getBoundingClientRect();
  const margin = 8;
  const offset = 14;
  const cardWidth = hotspotHoverCard.offsetWidth || 220;
  const cardHeight = hotspotHoverCard.offsetHeight || 72;
  let x = clientX - rect.left + offset;
  let y = clientY - rect.top + offset;

  if (x + cardWidth + margin > rect.width) {
    x = rect.width - cardWidth - margin;
  }
  if (y + cardHeight + margin > rect.height) {
    y = rect.height - cardHeight - margin;
  }
  x = Math.max(margin, x);
  y = Math.max(margin, y);

  hotspotHoverCard.style.left = `${x}px`;
  hotspotHoverCard.style.top = `${y}px`;
}

function showHotspotHoverCard(hotspotId, event) {
  if (!hotspotHoverCard) return;
  const details = getLinkHoverDetails(hotspotId);
  if (!details) {
    hideHotspotHoverCard();
    return;
  }

  hoveredLinkHotspotId = hotspotId;
  const commentHtml = details.comment
    ? `<div class="hover-card-comment">${escapeHtml(details.comment)}</div>`
    : '';
  hotspotHoverCard.innerHTML = `
    <div class="hover-card-title">${escapeHtml(details.linkName)}</div>
    <div class="hover-card-target">Go to ${escapeHtml(details.targetName)}</div>
    ${commentHtml}
  `;
  hotspotHoverCard.setAttribute('aria-hidden', 'false');
  hotspotHoverCard.classList.add('visible');
  positionHoverCard(event.clientX, event.clientY);
}

function hideHotspotHoverCard() {
  hoveredLinkHotspotId = null;
  if (!hotspotHoverCard) return;
  hotspotHoverCard.setAttribute('aria-hidden', 'true');
  hotspotHoverCard.classList.remove('visible');
}

function handleViewerMouseMove(event) {
  if (!viewerCanvas || placementMode || !state.selectedSceneId) {
    hideHotspotHoverCard();
    return;
  }

  const markerHit = findMarkerAtScreen(event.clientX, event.clientY, 16);
  if (!markerHit) {
    hideHotspotHoverCard();
    return;
  }

  if (hoveredLinkHotspotId !== markerHit) {
    showHotspotHoverCard(markerHit, event);
    return;
  }

  positionHoverCard(event.clientX, event.clientY);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function scheduleMarkerRender() {
  if (!hotspotOverlay) return;
  if (markerFrame) return;
  markerFrame = requestAnimationFrame(() => {
    markerFrame = null;
    renderHotspotMarkers();
  });
}

function startMarkerLoop() {
  if (markerLoopId) return;
  const loop = (timestamp) => {
    markerLoopId = requestAnimationFrame(loop);
    renderHotspotMarkers();
  };
  markerLoopId = requestAnimationFrame(loop);
}

function renderHotspotMarkers() {
  if (!hotspotOverlay) return;
  hotspotOverlay.innerHTML = '';
  const scene = getSelectedScene();
  const active = editorScenes.get(state.selectedSceneId);
  if (!scene || !active) return;

  const viewWidth = active.view.width();
  const viewHeight = active.view.height();

  scene.hotspots.forEach((hotspot) => {
    const coords = active.view.coordinatesToScreen({ yaw: hotspot.yaw, pitch: hotspot.pitch }, {});
    if (!coords || coords.x === null || coords.y === null) return;
    if (coords.x < 0 || coords.y < 0 || coords.x > viewWidth || coords.y > viewHeight) return;
    const scale = getViewScale(active);

    const marker = document.createElement('div');
    marker.className = `hotspot-marker${hotspot.id === state.selectedHotspotId ? ' active' : ''}`;
    marker.style.left = `${coords.x / scale.x}px`;
    marker.style.top = `${coords.y / scale.y - 5}px`;
    const linkTarget = getHotspotSceneLinkTarget(hotspot);
    marker.title = linkTarget ? `Go to "${linkTarget.name || linkTarget.id}"` : (hotspot.title || hotspot.id);
    marker.dataset.hotspotId = hotspot.id;
    marker.addEventListener('pointerdown', (event) => startMarkerDrag(event, hotspot.id));
    hotspotOverlay.appendChild(marker);
  });
}

function startMarkerDrag(event, hotspotId) {
  if (!placementMode) return;
  if (!event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  draggingHotspotId = hotspotId;
  dragMoved = false;
  dragPointerId = event.pointerId;
  hotspotOverlay.setPointerCapture(event.pointerId);
  hotspotOverlay.addEventListener('pointermove', handleMarkerDrag);
  hotspotOverlay.addEventListener('pointerup', stopMarkerDrag);
  hotspotOverlay.addEventListener('pointercancel', stopMarkerDrag);
}

function handleMarkerDrag(event) {
  if (!draggingHotspotId || event.pointerId !== dragPointerId) return;
  const active = editorScenes.get(state.selectedSceneId);
  if (!active) return;
  const viewPoint = getViewPointFromEvent(event);
  if (!viewPoint) return;
  const coords = active.view.screenToCoordinates(viewPoint, {});
  if (!coords || typeof coords.yaw !== 'number' || typeof coords.pitch !== 'number') return;
  const scene = getSelectedScene();
  const hotspot = scene?.hotspots.find((h) => h.id === draggingHotspotId);
  if (!hotspot) return;
  hotspot.yaw = coords.yaw;
  hotspot.pitch = coords.pitch;
  dragMoved = true;
  scheduleMarkerRender();
}

function stopMarkerDrag(event) {
  if (event.pointerId !== dragPointerId) return;
  hotspotOverlay.releasePointerCapture(event.pointerId);
  hotspotOverlay.removeEventListener('pointermove', handleMarkerDrag);
  hotspotOverlay.removeEventListener('pointerup', stopMarkerDrag);
  hotspotOverlay.removeEventListener('pointercancel', stopMarkerDrag);
  if (draggingHotspotId) {
    autosave();
    updateStatus('Hotspot position updated.');
  }
  draggingHotspotId = null;
  dragPointerId = null;
  setTimeout(() => {
    dragMoved = false;
  }, 0);
}

function openHotspotPreview(hotspotId) {
  const scene = getSelectedScene();
  const hotspot = scene?.hotspots.find((h) => h.id === hotspotId) || null;
  if (!hotspot || !previewModal) return;
  const mediaMap = new Map(
    (state.project?.assets?.media || []).map((m) => [m.id, m.dataUrl || m.path || ''])
  );

  previewModalTitle.textContent = hotspot.title || 'Hotspot';
  previewModalBody.innerHTML = '';
  (hotspot.contentBlocks || []).forEach((block) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'block';

    const heading = document.createElement('h4');
    heading.textContent = block.type || 'content';
    wrapper.appendChild(heading);

    if (block.type === 'text') {
      const p = document.createElement('p');
      p.textContent = block.value || '';
      wrapper.appendChild(p);
    }

    if (block.type === 'image') {
      const src = mediaMap.get(block.assetId) || '';
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = hotspot.title || 'Hotspot image';
        wrapper.appendChild(img);
      }
    }

    if (block.type === 'video') {
      if (block.url) {
        const iframe = document.createElement('iframe');
        iframe.src = block.url;
        iframe.width = '100%';
        iframe.height = '360';
        iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
        iframe.style.border = '0';
        wrapper.appendChild(iframe);
      } else {
        const src = mediaMap.get(block.assetId) || '';
        if (src) {
          const video = document.createElement('video');
          video.controls = true;
          video.src = src;
          wrapper.appendChild(video);
        }
      }
    }

    if (block.type === 'audio') {
      const src = mediaMap.get(block.assetId) || '';
      if (src) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = src;
        wrapper.appendChild(audio);
      }
    }

    if (block.type === 'link') {
      const link = document.createElement('a');
      link.href = block.url || '#';
      link.textContent = block.label || 'Open link';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      wrapper.appendChild(link);
    }

    if (block.type === 'scene') {
      const targetSceneName = getSceneName(block.sceneId || '');
      const p = document.createElement('p');
      p.textContent = block.sceneId ? `Go to scene: ${targetSceneName}` : 'No target scene selected.';
      wrapper.appendChild(p);
      if (block.comment && String(block.comment).trim()) {
        const comment = document.createElement('p');
        comment.textContent = `Comment: ${block.comment}`;
        wrapper.appendChild(comment);
      }
    }

    previewModalBody.appendChild(wrapper);
  });

  previewModal.classList.add('visible');
  previewModal.setAttribute('aria-hidden', 'false');
}

function closeHotspotPreview() {
  if (!previewModal) return;
  previewModal.classList.remove('visible');
  previewModal.setAttribute('aria-hidden', 'true');
}

function updatePlacementButtonLabel() {
  if (!btnTogglePlacement) return;
  btnTogglePlacement.textContent = placementMode ? 'Done' : 'Edit';
}

function togglePlacementMode() {
  placementMode = !placementMode;
  btnTogglePlacement.classList.toggle('active', placementMode);
  updatePlacementButtonLabel();
  renderLinkEditor();
  viewerCanvas.classList.toggle('placement-mode', placementMode);
  if (placementMode) {
    hideHotspotHoverCard();
  }
  updateStatus(
    placementMode
      ? 'Edit mode enabled. Rotate panorama and click to place the selected link hotspot.'
      : 'Edit mode disabled.'
  );
}

function getViewScale(active) {
  const rect = viewerCanvas.getBoundingClientRect();
  const viewWidth = active.view.width();
  const viewHeight = active.view.height();
  const scaleX = rect.width ? viewWidth / rect.width : 1;
  const scaleY = rect.height ? viewHeight / rect.height : 1;
  return { x: scaleX, y: scaleY };
}

function getViewPointFromEvent(event) {
  const active = editorScenes.get(state.selectedSceneId);
  if (!active) return null;
  const rect = viewerCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
  const scale = getViewScale(active);
  return { x: x * scale.x, y: y * scale.y };
}

function findMarkerAtScreen(clientX, clientY, radius) {
  if (!hotspotOverlay) return null;
  const markers = hotspotOverlay.querySelectorAll('.hotspot-marker');
  let closestId = null;
  let closestDist = radius * radius;
  markers.forEach((marker) => {
    const rect = marker.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - clientX;
    const dy = cy - clientY;
    const dist = dx * dx + dy * dy;
    if (dist <= closestDist) {
      closestId = marker.dataset.hotspotId || null;
      closestDist = dist;
    }
  });
  return closestId;
}


function renderHotspotList() {
  if (hotspotList) {
    hotspotList.innerHTML = '';
  }
  if (linkSelect) {
    linkSelect.innerHTML = '';
  }
  const scene = getSelectedScene();
  if (!scene) {
    if (linkSelect) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No scene selected';
      linkSelect.appendChild(option);
      linkSelect.disabled = true;
    }
    if (btnDeleteSceneLink) {
      btnDeleteSceneLink.disabled = true;
    }
    if (btnRemoveAllLinks) {
      btnRemoveAllLinks.disabled = true;
    }
    return;
  }

  const linkHotspots = getSceneLinkHotspots(scene);

  if (linkSelect) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = linkHotspots.length ? 'Select link' : 'No links in this scene';
    linkSelect.appendChild(placeholder);

    linkHotspots.forEach((hotspot) => {
      const option = document.createElement('option');
      option.value = hotspot.id;
      option.textContent = hotspot.linkCode || hotspot.title || hotspot.id;
      if (hotspot.id === state.selectedHotspotId) {
        option.selected = true;
      }
      linkSelect.appendChild(option);
    });

    const selectedIsLink = linkHotspots.some((hotspot) => hotspot.id === state.selectedHotspotId);
    if (!selectedIsLink) {
      linkSelect.value = '';
    }
    linkSelect.disabled = linkHotspots.length === 0;
  }
  if (btnDeleteSceneLink) {
    btnDeleteSceneLink.disabled = linkHotspots.length === 0;
  }
  if (btnRemoveAllLinks) {
    btnRemoveAllLinks.disabled = linkHotspots.length === 0;
  }

  if (hotspotList) {
    scene.hotspots.forEach((hotspot) => {
      const button = document.createElement('button');
      button.className = `list-item${hotspot.id === state.selectedHotspotId ? ' active' : ''}`;
      button.textContent = hotspot.title || hotspot.id;
      button.addEventListener('click', () => {
        state.selectedHotspotId = hotspot.id;
        renderLinkEditor();
        renderContentBlocks();
        renderIconOptions();
        renderHotspotList();
        scheduleMarkerRender();
      });
      hotspotList.appendChild(button);
    });
  }

  scheduleMarkerRender();
}

function renderIconOptions() {
  const icons = state.project?.assets?.icons || [];
  const hotspot = getSelectedHotspot();
  iconSelect.innerHTML = '';

  if (icons.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No icons available';
    iconSelect.appendChild(option);
    return;
  }

  icons.forEach((icon) => {
    const option = document.createElement('option');
    option.value = icon.id;
    option.textContent = icon.name || icon.id;
    if (hotspot && icon.id === hotspot.iconId) {
      option.selected = true;
    }
    iconSelect.appendChild(option);
  });
}

function renderMediaList() {
  mediaList.innerHTML = '';
  const mediaItems = state.project?.assets?.media || [];
  if (mediaItems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'media-item';
    empty.textContent = 'No media assets yet.';
    mediaList.appendChild(empty);
    return;
  }

  mediaItems.forEach((media) => {
    const row = document.createElement('div');
    row.className = 'media-item';
    row.innerHTML = `<strong>${media.name || media.id}</strong><span>${media.type}</span>`;
    mediaList.appendChild(row);
  });
}

function renderFloorplans() {
  floorplanList.innerHTML = '';
  const group = getSelectedGroup();
  if (!group) {
    miniMap.innerHTML = '<div class="mini-map-placeholder">No group selected</div>';
    return;
  }

  const selected = getSelectedFloorplan();
  state.selectedFloorplanId = selected?.id || null;
  miniMap.innerHTML = '';
  if (!selected) {
    miniMap.innerHTML = '<div class="mini-map-placeholder">No floorplan for this group yet</div>';
  } else {
  const canvas = document.createElement('div');
  canvas.className = 'floorplan-canvas';

  const img = document.createElement('img');
  img.className = 'floorplan-image';
  img.alt = selected?.name || 'Floorplan';
  img.src = selected?.dataUrl || selected?.path || '';
  canvas.appendChild(img);

  const nodes = selected?.nodes || [];
  nodes.forEach((node, index) => {
    const dot = document.createElement('div');
    dot.className = `floorplan-node${node.sceneId === state.selectedSceneId ? ' active' : ''}`;
    dot.style.left = `${node.x * 100}%`;
    dot.style.top = `${node.y * 100}%`;
    dot.title = node.sceneId;
    dot.dataset.index = String(index);

    const arrow = document.createElement('div');
    arrow.className = 'arrow';
    arrow.style.transform = `rotate(${node.rotation || 0}deg)`;
    dot.appendChild(arrow);

    const label = document.createElement('div');
    label.className = 'floorplan-label';
    label.textContent = getSceneName(node.sceneId);
    dot.appendChild(label);

    dot.addEventListener('mousedown', (event) => startDrag(event, index));
    dot.addEventListener('click', (event) => event.stopPropagation());
    dot.addEventListener('wheel', (event) => {
      event.preventDefault();
      rotateFloorplanNode(index, event.deltaY > 0 ? 15 : -15);
    });
    dot.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      removeFloorplanNode(index);
    });
    canvas.appendChild(dot);
  });

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    addOrUpdateFloorplanNode(x, y);
  });

  miniMap.appendChild(canvas);
  }

  const groups = state.project?.groups || [];
  groups.forEach((item) => {
    const hasFloorplan = Boolean(getFloorplanForGroup(item.id));
    const button = document.createElement('button');
    button.className = `list-item${item.id === state.selectedGroupId ? ' active' : ''}`;
    button.textContent = `${item.name}${hasFloorplan ? '' : ' (no floorplan)'}`;
    button.addEventListener('click', () => {
      state.selectedGroupId = item.id;
      const groupScenes = getScenesForSelectedGroup();
      state.selectedSceneId = groupScenes[0]?.id || null;
      state.selectedHotspotId = groupScenes[0]?.hotspots?.[0]?.id || null;
      renderAll();
    });
    floorplanList.appendChild(button);
  });
}

function addOrUpdateFloorplanNode(x, y) {
  const scene = getSelectedScene();
  const floorplan = getSelectedFloorplan();
  if (!scene || !floorplan) return;
  if (scene.groupId !== floorplan.groupId) return;

  const existing = floorplan.nodes.find((node) => node.sceneId === scene.id);
  if (existing) {
    existing.x = x;
    existing.y = y;
  } else {
    floorplan.nodes.push({ sceneId: scene.id, x, y, rotation: 0 });
  }

  renderFloorplans();
  autosave();
}

function removeFloorplanNode(index) {
  const floorplan = getSelectedFloorplan();
  if (!floorplan) return;
  floorplan.nodes.splice(index, 1);
  renderFloorplans();
  autosave();
}

function rotateFloorplanNode(index, delta) {
  const floorplan = getSelectedFloorplan();
  if (!floorplan) return;
  const node = floorplan.nodes[index];
  if (!node) return;
  const next = (node.rotation || 0) + delta;
  node.rotation = (next + 360) % 360;
  renderFloorplans();
  autosave();
}

function startDrag(event, index) {
  event.stopPropagation();
  const floorplan = getSelectedFloorplan();
  if (!floorplan) return;
  dragState = { index, floorplanId: floorplan.id };
  window.addEventListener('mousemove', handleDrag);
  window.addEventListener('mouseup', stopDrag);
}

function handleDrag(event) {
  if (!dragState) return;
  const floorplan = getSelectedFloorplan();
  if (!floorplan || floorplan.id !== dragState.floorplanId) return;
  const canvas = miniMap.querySelector('.floorplan-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const node = floorplan.nodes[dragState.index];
  if (!node) return;
  node.x = Math.min(Math.max(x, 0), 1);
  node.y = Math.min(Math.max(y, 0), 1);
  renderFloorplans();
}

function stopDrag() {
  if (!dragState) return;
  dragState = null;
  window.removeEventListener('mousemove', handleDrag);
  window.removeEventListener('mouseup', stopDrag);
  autosave();
}

function getSceneName(sceneId) {
  const scene = state.project?.scenes.find((item) => item.id === sceneId);
  return scene?.name || sceneId;
}

function renderContentBlocks() {
  contentBlocks.innerHTML = '';
  const hotspot = getSelectedHotspot();
  if (!hotspot) {
    return;
  }

  (hotspot.contentBlocks || []).forEach((block, index) => {
    const blockEl = document.createElement('div');
    blockEl.className = 'block';

    const header = document.createElement('div');
    header.className = 'block-header';
    header.innerHTML = `<span>${block.type.toUpperCase()} Block</span>`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn ghost small';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      removeBlock(index);
      autosave();
    });
    header.appendChild(removeBtn);

    const body = document.createElement('div');
    if (block.type === 'text') {
      const textarea = document.createElement('textarea');
      textarea.rows = 3;
      textarea.value = block.value || '';
      textarea.addEventListener('input', (event) => {
        block.value = event.target.value;
        autosave();
      });
      body.appendChild(textarea);
    } else if (block.type === 'link') {
      body.appendChild(createField('Label', block.label || '', (value) => {
        block.label = value;
        autosave();
      }));
      body.appendChild(createField('URL', block.url || '', (value) => {
        block.url = value;
        autosave();
      }));
    } else if (block.type === 'video') {
      body.appendChild(createField('Embed URL (optional)', block.url || '', (value) => {
        block.url = value;
        autosave();
      }));
      body.appendChild(createMediaSelect('Video Asset', 'video', block.assetId || '', (value) => {
        block.assetId = value;
        autosave();
      }));
    } else if (block.type === 'image') {
      body.appendChild(createMediaSelect('Image Asset', 'image', block.assetId || '', (value) => {
        block.assetId = value;
        autosave();
      }));
    } else if (block.type === 'audio') {
      body.appendChild(createMediaSelect('Audio Asset', 'audio', block.assetId || '', (value) => {
        block.assetId = value;
        autosave();
      }));
    } else if (block.type === 'scene') {
      const note = document.createElement('div');
      note.className = 'panel-hint';
      note.textContent = 'Link fields are managed in the Links section.';
      body.appendChild(note);
    } else {
      body.appendChild(createField('Asset ID', block.assetId || '', (value) => {
        block.assetId = value;
        autosave();
      }));
    }

    blockEl.appendChild(header);
    blockEl.appendChild(body);
    contentBlocks.appendChild(blockEl);
  });
}

function createField(label, value, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  const title = document.createElement('label');
  title.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('input', (event) => onChange(event.target.value));
  wrapper.appendChild(title);
  wrapper.appendChild(input);
  return wrapper;
}

function createMediaSelect(label, type, selectedId, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  const title = document.createElement('label');
  title.textContent = label;
  const select = document.createElement('select');

  const mediaItems = (state.project?.assets?.media || []).filter((item) => item.type === type);
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'None';
  select.appendChild(none);

  mediaItems.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name || item.id;
    if (item.id === selectedId) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.addEventListener('change', (event) => onChange(event.target.value));
  wrapper.appendChild(title);
  wrapper.appendChild(select);
  return wrapper;
}

function addScene() {
  const group = getSelectedGroup();
  if (!group) {
    updateStatus('Create a group first.');
    return;
  }
  const name = prompt('Scene name');
  if (!name) return;
  const scene = createSceneRecord(name, group.id);
  state.project.scenes.push(scene);
  ensureMainSceneForGroup(group.id, scene.id);
  state.selectedSceneId = scene.id;
  state.selectedHotspotId = null;
  renderAll();
  autosave();
}

function createSceneRecord(name = 'New Scene', groupId = null) {
  const id = `scene-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return {
    id,
    groupId: groupId || state.selectedGroupId || state.project?.groups?.[0]?.id || null,
    name,
    levels: [{ tileSize: 256, size: 256, fallbackOnly: true }],
    faceSize: 2048,
    initialViewParameters: { yaw: 0, pitch: 0, fov: 1.4 },
    orientationSaved: false,
    hotspots: []
  };
}

function sceneNameFromFile(fileName) {
  return (fileName || 'New Scene').replace(/\.[^/.]+$/, '') || 'New Scene';
}

function setMainSceneForSelectedGroup() {
  const scene = getSelectedScene();
  if (!scene) {
    updateStatus('Select a scene first.');
    return;
  }
  const group = getGroupById(scene.groupId);
  if (!group) {
    updateStatus('No active group found for this scene.');
    return;
  }

  group.mainSceneId = scene.id;
  state.selectedGroupId = group.id;
  renderSceneList();
  renderSceneGroupOptions();
  updateStatus(`"${scene.name || scene.id}" set as main scene for "${group.name}".`);
  autosave();
}

function ensureMainSceneForGroup(groupId, candidateSceneId = null) {
  const group = getGroupById(groupId);
  if (!group) return;
  const groupScenes = (state.project?.scenes || []).filter((scene) => scene.groupId === groupId);
  if (!groupScenes.length) {
    group.mainSceneId = null;
    return;
  }
  if (candidateSceneId && groupScenes.some((scene) => scene.id === candidateSceneId) && !group.mainSceneId) {
    group.mainSceneId = candidateSceneId;
    return;
  }
  if (!group.mainSceneId || !groupScenes.some((scene) => scene.id === group.mainSceneId)) {
    group.mainSceneId = groupScenes[0].id;
  }
}

function addGroup() {
  const name = prompt('Group name');
  if (!name) return;
  const group = {
    id: `group-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    name: name.trim() || 'New Group',
    mainSceneId: null
  };
  state.project.groups.push(group);
  state.selectedGroupId = group.id;
  state.selectedSceneId = null;
  state.selectedHotspotId = null;
  state.selectedFloorplanId = getFloorplanForGroup(group.id)?.id || null;
  renderAll();
  updateStatus(`Group "${group.name}" created. Upload a floorplan for this group.`);
  autosave();
}

function renameSelectedGroup() {
  const group = getSelectedGroup();
  if (!group) {
    updateStatus('Select a group first.');
    return;
  }
  const nextName = prompt('Group name', group.name || '');
  if (nextName == null) return;
  group.name = nextName.trim() || 'Untitled Group';
  renderSceneGroupOptions();
  updateStatus(`Group renamed to "${group.name}".`);
  autosave();
}

function deleteGroup() {
  deleteGroupById(state.selectedGroupId);
}

function deleteGroupById(groupId) {
  const groups = state.project?.groups || [];
  if (groups.length <= 1) {
    updateStatus('At least one group is required.');
    return;
  }
  const group = groups.find((item) => item.id === groupId) || null;
  if (!group) return;
  const fallback = groups.find((item) => item.id !== group.id);
  if (!fallback) return;
  const scenesToDelete = (state.project.scenes || []).filter((scene) => scene.groupId === group.id);
  const sceneCount = scenesToDelete.length;
  const confirmed = window.confirm(`Delete group "${group.name}" and delete ${sceneCount} images/scenes?`);
  if (!confirmed) return;

  scenesToDelete.forEach((scene) => {
    generatedTiles.delete(scene.id);
    editorScenes.delete(scene.id);
  });
  const deletedSceneIds = new Set(scenesToDelete.map((scene) => scene.id));
  state.project.scenes = (state.project.scenes || []).filter((scene) => !deletedSceneIds.has(scene.id));
  clearSceneTargetReferences(deletedSceneIds);

  state.project.minimap.floorplans = (state.project.minimap.floorplans || []).filter((fp) => fp.groupId !== group.id);
  state.project.groups = groups.filter((item) => item.id !== group.id);
  ensureMainSceneForGroup(fallback.id);

  state.selectedGroupId = fallback.id;
  const preferredScene = getPreferredSceneForGroup(state.selectedGroupId);
  state.selectedSceneId = preferredScene?.id || null;
  state.selectedHotspotId = preferredScene?.hotspots?.[0]?.id || null;
  state.selectedFloorplanId = getFloorplanForGroup(fallback.id)?.id || null;
  renderAll();
  updateStatus(`Group "${group.name}" deleted. Removed ${sceneCount} images/scenes.`);
  autosave();
}

function deleteSceneById(sceneId) {
  const sceneIndex = state.project.scenes.findIndex((scene) => scene.id === sceneId);
  if (sceneIndex === -1) return;
  const [removed] = state.project.scenes.splice(sceneIndex, 1);
  if (removed?.id) {
    generatedTiles.delete(removed.id);
    editorScenes.delete(removed.id);
    const floorplans = state.project?.minimap?.floorplans || [];
    floorplans.forEach((floorplan) => {
      floorplan.nodes = (floorplan.nodes || []).filter((node) => node.sceneId !== removed.id);
    });
    clearSceneTargetReferences(new Set([removed.id]));
    ensureMainSceneForGroup(removed.groupId);
  }
  const fallbackScene =
    getPreferredSceneForGroup(state.selectedGroupId) ||
    state.project.scenes[0] ||
    null;
  state.selectedSceneId = fallbackScene?.id || null;
  state.selectedHotspotId = fallbackScene?.hotspots?.[0]?.id || null;
  renderAll();
  autosave();
}

function clearSceneTargetReferences(deletedSceneIds) {
  if (!deletedSceneIds || !deletedSceneIds.size) return;
  (state.project?.scenes || []).forEach((scene) => {
    const hotspots = scene.hotspots || [];
    scene.hotspots = hotspots.filter((hotspot) => {
      const blocks = hotspot.contentBlocks || [];
      let removedLinks = 0;
      const nextBlocks = blocks.filter((block) => {
        const isDeletedTarget = block.type === 'scene' && deletedSceneIds.has(block.sceneId);
        if (isDeletedTarget) {
          removedLinks += 1;
          return false;
        }
        return true;
      });

      if (!removedLinks) {
        return true;
      }

      hotspot.contentBlocks = nextBlocks;
      if (!nextBlocks.some((block) => block.type === 'scene')) {
        delete hotspot.linkCode;
      }

      // If a link-only hotspot has no content left, drop it entirely.
      return nextBlocks.length > 0;
    });

    if (
      scene.id === state.selectedSceneId &&
      state.selectedHotspotId &&
      !scene.hotspots.some((hotspot) => hotspot.id === state.selectedHotspotId)
    ) {
      state.selectedHotspotId = scene.hotspots[0]?.id || null;
    }
  });
}

function deleteAllScenes() {
  const total = state.project?.scenes?.length || 0;
  if (!total) {
    updateStatus('No scenes to delete.');
    return;
  }
  const confirmed = window.confirm(`Delete all ${total} scenes? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  state.project.scenes = [];
  state.selectedSceneId = null;
  state.selectedHotspotId = null;
  (state.project.groups || []).forEach((group) => {
    group.mainSceneId = null;
  });
  generatedTiles.clear();
  editorScenes.clear();

  const floorplans = state.project?.minimap?.floorplans || [];
  floorplans.forEach((floorplan) => {
    floorplan.nodes = [];
  });

  renderAll();
  updateStatus(`Deleted ${total} scenes.`);
  autosave();
}

function addHotspot() {
  const scene = getSelectedScene();
  if (!scene) return;
  const title = prompt('Hotspot title');
  if (!title) return;
  const hotspot = createHotspotRecord(title, []);
  scene.hotspots.push(hotspot);
  state.selectedHotspotId = hotspot.id;
  renderAll();
  scheduleMarkerRender();
  autosave();
}

function createHotspotRecord(title, contentBlocks, extra = null) {
  return {
    id: `hs-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    yaw: 0,
    pitch: 0,
    iconId: state.project.assets.icons[0]?.id || '',
    title: title || 'Hotspot',
    contentBlocks: contentBlocks || [],
    ...(extra || {})
  };
}

function getDefaultLinkTargetSceneId(currentScene) {
  const allScenes = state.project?.scenes || [];
  if (!currentScene) return '';
  const sameGroup = allScenes.find((item) => item.id !== currentScene.id && item.groupId === currentScene.groupId);
  if (sameGroup) return sameGroup.id;
  const anyOther = allScenes.find((item) => item.id !== currentScene.id);
  return anyOther?.id || '';
}

function getNextSceneLinkCode() {
  let maxCode = 0;
  (state.project?.scenes || []).forEach((scene) => {
    (scene.hotspots || []).forEach((hotspot) => {
      const hasSceneLink = (hotspot.contentBlocks || []).some((block) => block.type === 'scene');
      if (!hasSceneLink) return;

      const codeFromField = Number.parseInt(String(hotspot.linkCode || ''), 10);
      if (Number.isFinite(codeFromField)) {
        maxCode = Math.max(maxCode, codeFromField);
        return;
      }

      const titleMatch = String(hotspot.title || '').match(/(\d{4,})/);
      if (titleMatch) {
        const codeFromTitle = Number.parseInt(titleMatch[1], 10);
        if (Number.isFinite(codeFromTitle)) {
          maxCode = Math.max(maxCode, codeFromTitle);
        }
      }
    });
  });

  return String(maxCode + 1).padStart(4, '0');
}

function deleteHotspot() {
  const scene = getSelectedScene();
  if (!scene) return;
  const index = scene.hotspots.findIndex((hotspot) => hotspot.id === state.selectedHotspotId);
  if (index === -1) return;
  scene.hotspots.splice(index, 1);
  state.selectedHotspotId = scene.hotspots[0]?.id || null;
  renderAll();
  scheduleMarkerRender();
  autosave();
}

function addBlock() {
  const hotspot = getSelectedHotspot();
  if (!hotspot) return;
  const type = prompt('Block type: text, image, video, audio, link, scene');
  if (!type) return;
  const normalized = type.trim().toLowerCase();
  const block = { type: normalized };

  if (normalized === 'text') {
    block.value = '';
  } else if (normalized === 'link') {
    block.label = '';
    block.url = '';
  } else if (normalized === 'video') {
    block.url = '';
    block.assetId = '';
  } else if (normalized === 'image' || normalized === 'audio') {
    block.assetId = '';
  } else if (normalized === 'scene' || normalized === 'scene-link' || normalized === 'scenelink') {
    block.type = 'scene';
    block.sceneId = '';
    block.comment = '';
  } else {
    alert('Unknown block type.');
    return;
  }

  hotspot.contentBlocks.push(block);
  renderContentBlocks();
  autosave();
}

function addSceneLinkBlock() {
  const scene = getSelectedScene();
  if (!scene) {
    updateStatus('Select a scene first.');
    return;
  }

  const targetSceneId = getDefaultLinkTargetSceneId(scene);
  const linkCode = getNextSceneLinkCode();
  const hotspot = createHotspotRecord(
    linkCode,
    [{ type: 'scene', sceneId: targetSceneId, comment: '' }],
    { linkCode }
  );
  scene.hotspots.push(hotspot);
  state.selectedHotspotId = hotspot.id;
  // Avoid renderAll() here: it triggers switchEditorScene() and resets current view orientation.
  renderHotspotList();
  renderLinkEditor();
  renderContentBlocks();
  renderIconOptions();
  renderMediaList();
  renderFloorplans();
  scheduleMarkerRender();
  if (!placementMode) {
    togglePlacementMode();
  }
  updateStatus('Link hotspot created. Click the preview to place it.');
  autosave();
}

function deleteSceneLinkBlock() {
  const scene = getSelectedScene();
  if (!scene) {
    updateStatus('Select a scene first.');
    return;
  }

  const selected = getSelectedHotspot();
  let hotspot = selected;
  if (!hotspot || !(hotspot.contentBlocks || []).some((block) => block.type === 'scene')) {
    hotspot = [...(scene.hotspots || [])].reverse().find((item) =>
      (item.contentBlocks || []).some((block) => block.type === 'scene')
    ) || null;
  }

  if (!hotspot) {
    updateStatus('No link hotspot to delete.');
    return;
  }

  const sceneIndex = (scene.hotspots || []).findIndex((item) => item.id === hotspot.id);
  if (sceneIndex === -1) {
    updateStatus('No link hotspot to delete.');
    return;
  }

  const blocks = hotspot.contentBlocks || [];
  const remaining = blocks.filter((block) => block.type !== 'scene');
  if (!remaining.length) {
    scene.hotspots.splice(sceneIndex, 1);
    state.selectedHotspotId = scene.hotspots[0]?.id || null;
  } else {
    hotspot.contentBlocks = remaining;
    state.selectedHotspotId = hotspot.id;
  }

  renderAll();
  scheduleMarkerRender();
  updateStatus('Link hotspot deleted.');
  autosave();
}

function removeAllSceneLinksForCurrentScene() {
  const scene = getSelectedScene();
  if (!scene) {
    updateStatus('Select a scene first.');
    return;
  }

  const before = (scene.hotspots || []).length;
  scene.hotspots = (scene.hotspots || []).filter((hotspot) => !isSceneLinkHotspot(hotspot));
  const removed = before - scene.hotspots.length;
  if (!removed) {
    updateStatus('No links to remove in this scene.');
    return;
  }

  state.selectedHotspotId = scene.hotspots[0]?.id || null;
  renderAll();
  updateStatus(`Removed ${removed} link(s) from current scene.`);
  autosave();
}

function removeBlock(index) {
  const hotspot = getSelectedHotspot();
  if (!hotspot) return;
  hotspot.contentBlocks.splice(index, 1);
  renderContentBlocks();
}

function updateProjectName(value) {
  if (!state.project) return;
  state.project.project.name = value;
  autosave();
}

function handleResize() {
  if (!editorViewer) return;
  editorViewer.updateSize();
}

function exportProject() {
  if (!state.project) return;
  const blob = new Blob([JSON.stringify(state.project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.project.project.name || 'tour-project'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportStaticPackage() {
  if (!state.project) return;
  const project = JSON.parse(JSON.stringify(state.project));

  const assetDownloads = [];

  project.assets.icons.forEach((icon) => {
    if (icon.dataUrl) {
      const fileInfo = dataUrlToFile(icon.dataUrl, icon.name || icon.id);
      icon.path = `icons/${fileInfo.filename}`;
      delete icon.dataUrl;
      assetDownloads.push({ ...fileInfo, folder: 'icons', outputPath: `viewer/icons/${fileInfo.filename}` });
    }
  });

  project.assets.media.forEach((media) => {
    if (media.dataUrl) {
      const fileInfo = dataUrlToFile(media.dataUrl, media.name || media.id);
      media.path = `media/${fileInfo.filename}`;
      delete media.dataUrl;
      assetDownloads.push({ ...fileInfo, folder: 'media', outputPath: `viewer/media/${fileInfo.filename}` });
    }
  });

  (project.minimap?.floorplans || []).forEach((floorplan) => {
    if (floorplan.dataUrl) {
      const fileInfo = dataUrlToFile(floorplan.dataUrl, floorplan.name || floorplan.id);
      floorplan.path = `floorplans/${fileInfo.filename}`;
      delete floorplan.dataUrl;
      assetDownloads.push({ ...fileInfo, folder: 'floorplans', outputPath: `viewer/floorplans/${fileInfo.filename}` });
    }
  });

  const jsonBlob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });

  const tileDownloads = [];
  if (generatedTiles.size > 0) {
    for (const [, tiles] of generatedTiles.entries()) {
      Object.entries(tiles).forEach(([path, dataUrl]) => {
        const fileInfo = dataUrlToFile(dataUrl, path.split('/').pop());
        tileDownloads.push({ ...fileInfo, path, outputPath: `viewer/${path}` });
      });
    }
  }

  let runtimeFiles = [];
  try {
    runtimeFiles = await collectViewerRuntimeFiles();
  } catch (error) {
    console.error(error);
    updateStatus('Static export failed: cannot read viewer runtime files.');
    return;
  }

  if (window.JSZip) {
    exportZipPackage(project, jsonBlob, assetDownloads, tileDownloads, runtimeFiles);
    return;
  }

  if (window.showDirectoryPicker) {
    exportWithFileSystemAccess(project, jsonBlob, assetDownloads, tileDownloads, runtimeFiles);
    return;
  }

  // Fallback: multiple downloads with flattened names.
  downloadBlob(jsonBlob, `${project.project.name || 'tour-project'}-static.json`);
  runtimeFiles.forEach((file) => downloadBlob(file.blob, file.path.replace(/\//g, '_')));
  assetDownloads.forEach((file) => downloadBlob(file.blob, file.outputPath.replace(/\//g, '_')));
  tileDownloads.forEach((file) => downloadBlob(file.blob, file.outputPath.replace(/\//g, '_')));
  updateStatus('Static export: runtime + assets downloaded (no ZIP).');
}

function dataUrlToFile(dataUrl, fallbackName) {
  const [meta, data] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const extension = mime.split('/')[1] || 'bin';
  const filename = sanitizeFilename(fallbackName || 'asset') + '.' + extension;
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([array], { type: mime });
  return { filename, blob };
}

function sanitizeFilename(name) {
  return String(name || 'asset')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .toLowerCase()
    .slice(0, 60);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportZipPackage(project, jsonBlob, assets, tiles, runtimeFiles) {
  const zip = new JSZip();
  zip.file(`${project.project.name || 'tour-project'}-static.json`, await blobToString(jsonBlob));
  zip.file('shared/sample-tour.json', await blobToString(jsonBlob));

  runtimeFiles.forEach((file) => {
    zip.file(file.path, file.blob);
  });

  assets.forEach((asset) => {
    zip.file(asset.outputPath, asset.blob);
  });

  tiles.forEach((tile) => {
    zip.file(tile.outputPath, tile.blob);
  });

  updateStatus('Building ZIP...');
  const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    updateStatus(`ZIP: ${Math.round(metadata.percent)}%`);
  });

  downloadBlob(content, `${project.project.name || 'tour-project'}-static.zip`);
  updateStatus('ZIP export complete.');
}

function blobToString(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

async function exportWithFileSystemAccess(project, jsonBlob, assets, tiles, runtimeFiles) {
  try {
    const root = await window.showDirectoryPicker();

    await writeFile(root, `${project.project.name || 'tour-project'}-static.json`, jsonBlob);
    const sharedDir = await root.getDirectoryHandle('shared', { create: true });
    await writeFile(sharedDir, 'sample-tour.json', jsonBlob);

    for (const file of runtimeFiles) {
      await writePathFile(root, file.path, file.blob);
    }

    for (const asset of assets) {
      await writePathFile(root, asset.outputPath, asset.blob);
    }

    for (const tile of tiles) {
      await writePathFile(root, tile.outputPath, tile.blob);
    }

    updateStatus('Static export complete (folder written).');
  } catch (error) {
    console.error(error);
    updateStatus('Static export failed.');
  }
}

async function writeFile(directoryHandle, filename, blob) {
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function writePathFile(root, path, blob) {
  const parts = path.split('/');
  let dir = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    dir = await dir.getDirectoryHandle(parts[i], { create: true });
  }
  await writeFile(dir, parts[parts.length - 1], blob);
}

async function collectViewerRuntimeFiles() {
  const runtimePaths = [
    'viewer/index.html',
    'viewer/app.js',
    'viewer/styles.css',
    'viewer/vendor/marzipano.js',
    'viewer/vendor/bowser.min.js',
    'viewer/vendor/screenfull.min.js',
    'viewer/vendor/reset.min.css'
  ];
  const files = [];
  for (const path of runtimePaths) {
    const blob = await fetchRuntimeFile(path);
    files.push({ path, blob });
  }
  return files;
}

async function fetchRuntimeFile(path) {
  const response = await fetch(`../${path}`);
  if (!response.ok) {
    throw new Error(`Missing runtime file: ${path}`);
  }
  return await response.blob();
}

async function ensureFolder(root, name) {
  await root.getDirectoryHandle(name, { create: true });
}

function importProjectFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      loadProject(data);
      autosave();
      updateStatus('Project imported.');
    } catch (error) {
      console.error(error);
      updateStatus('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
}

function uploadIconFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const id = `icon-${Date.now()}`;
    state.project.assets.icons.push({
      id,
      name: file.name,
      dataUrl: reader.result
    });
    const hotspot = getSelectedHotspot();
    if (hotspot) {
      hotspot.iconId = id;
    }
    renderIconOptions();
    autosave();
  };
  reader.readAsDataURL(file);
}

function uploadMediaFile(file) {
  const type = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('audio/')
    ? 'audio'
    : file.type.startsWith('video/')
    ? 'video'
    : null;

  if (!type) {
    updateStatus('Unsupported media type.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const id = `${type}-${Date.now()}`;
    state.project.assets.media.push({
      id,
      name: file.name,
      type,
      dataUrl: reader.result
    });
    renderMediaList();
    renderContentBlocks();
    autosave();
  };
  reader.readAsDataURL(file);
}

function uploadFloorplanFile(file) {
  const group = getSelectedGroup();
  if (!group) {
    updateStatus('Select a group first.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const existing = getFloorplanForGroup(group.id);
    const id = existing?.id || `floorplan-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const next = {
      id,
      groupId: group.id,
      name: file.name,
      dataUrl: reader.result,
      nodes: existing?.nodes || []
    };
    state.project.minimap.floorplans = (state.project.minimap.floorplans || []).filter((fp) => fp.groupId !== group.id);
    state.project.minimap.floorplans.push(next);
    state.selectedFloorplanId = id;
    renderFloorplans();
    autosave();
  };
  reader.readAsDataURL(file);
}

function deleteFloorplan() {
  const group = getSelectedGroup();
  if (!group) return;
  const floorplans = state.project.minimap.floorplans || [];
  const index = floorplans.findIndex((fp) => fp.groupId === group.id);
  if (index === -1) return;
  floorplans.splice(index, 1);
  state.selectedFloorplanId = null;
  renderFloorplans();
  autosave();
}

function resetSceneTiles(scene) {
  generatedTiles.delete(scene.id);
  scene.tilesPath = undefined;
  scene.previewPath = undefined;
  scene.levels = [{ tileSize: 256, size: 256, fallbackOnly: true }];
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readImageMetadata(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

function applyPanoramaToScene(scene, file, dataUrl, meta) {
  if (meta) {
    scene.sourceImage = {
      name: file.name,
      dataUrl,
      width: meta.width,
      height: meta.height
    };
  } else {
    scene.sourceImage = {
      name: file.name,
      dataUrl
    };
  }
  resetSceneTiles(scene);
}

async function uploadPanoramaFile(file, options = {}) {
  let scene = options.scene || null;
  if (!scene) {
    const groupId = state.selectedGroupId || state.project?.groups?.[0]?.id || null;
    if (!groupId) {
      updateStatus('Create a group first.');
      return false;
    }
    scene = createSceneRecord(sceneNameFromFile(file.name), groupId);
    state.project.scenes.push(scene);
    ensureMainSceneForGroup(groupId, scene.id);
    state.selectedSceneId = scene.id;
    state.selectedHotspotId = null;
  }
  const dataUrl = await readFileAsDataUrl(file);
  const meta = await readImageMetadata(dataUrl);
  applyPanoramaToScene(scene, file, dataUrl, meta);

  if (!options.skipRender) {
    updateStatus(meta ? 'Panorama loaded. Ready to generate tiles.' : 'Panorama loaded (size unknown). Ready to generate tiles.');
    refreshEditorScenes();
    renderAll();
    autosave();
  }
  return true;
}

async function uploadPanoramaFiles(files) {
  const fileList = Array.from(files || []);
  if (!fileList.length) return;

  if (fileList.length === 1) {
    await uploadPanoramaFile(fileList[0]);
    return;
  }

  let imported = 0;
  const createdSceneIds = [];
  const targetGroupId = state.selectedGroupId || state.project?.groups?.[0]?.id || null;

  for (const file of fileList) {
    const scene = createSceneRecord(sceneNameFromFile(file.name), targetGroupId);
    state.project.scenes.push(scene);
    ensureMainSceneForGroup(targetGroupId, scene.id);
    try {
      await uploadPanoramaFile(file, { scene, skipRender: true });
      createdSceneIds.push(scene.id);
      imported += 1;
    } catch (error) {
      console.error('Panorama upload failed:', file.name, error);
      const index = state.project.scenes.findIndex((entry) => entry.id === scene.id);
      if (index !== -1) {
        state.project.scenes.splice(index, 1);
      }
    }
  }

  if (createdSceneIds.length) {
    const preferredScene = getPreferredSceneForGroup(targetGroupId) || state.project.scenes.find((scene) => scene.id === createdSceneIds[0]) || null;
    state.selectedSceneId = preferredScene?.id || null;
    state.selectedHotspotId = null;
  }

  refreshEditorScenes();
  renderAll();
  updateStatus(`Loaded ${imported}/${fileList.length} panoramas. Double-click a scene name to rename.`);
  autosave();
}

function askTileOptions() {
  const faceInput = prompt('Face size (e.g., 1024, 2048, 4096)', '1024');
  if (faceInput === null) return null;
  const tileInput = prompt('Tile size (e.g., 256, 512)', '512');
  if (tileInput === null) return null;
  return {
    faceSize: Number(faceInput) || 1024,
    tileSize: Number(tileInput) || 512
  };
}

async function generateTilesForScene(options = {}) {
  const scene = options.scene || getSelectedScene();
  if (!scene || !scene.sourceImage?.dataUrl) {
    updateStatus('Upload a 360 image first.');
    return;
  }

  try {
    const tileOptions = options.tileOptions || askTileOptions();
    if (!tileOptions) {
      updateStatus('Tiling cancelled.');
      return;
    }
    const faceSize = tileOptions.faceSize;
    const tileSize = tileOptions.tileSize;
    const sceneLabel = options.sceneLabel ? ` (${options.sceneLabel})` : '';
    updateStatus(`Generating tiles for "${scene.name || scene.id}"${sceneLabel}...`);
    showProgress(0);
    tilingPaused = false;
    const tiles = await buildCubemapTiles(scene.id, scene.sourceImage.dataUrl, faceSize, tileSize);
    generatedTiles.set(scene.id, tiles);

    scene.tilesPath = `tiles/${scene.id}`;
    scene.previewPath = `tiles/${scene.id}/preview.jpg`;
    scene.levels = [
      { tileSize, size: faceSize }
    ];
    scene.faceSize = faceSize;

    if (!options.skipViewerRefresh) {
      // Avoid rebuilding scenes during tiling completion to prevent stage sync errors.
      suppressSceneSwitch = true;
      setTimeout(() => {
        suppressSceneSwitch = false;
        switchEditorScene();
        scheduleMarkerRender();
      }, 250);
    }

    updateStatus(`Tiles generated for "${scene.name || scene.id}". Export static to save files.`);
    showProgress(100, true);
    autosave();
    return true;
  } catch (error) {
    console.error('Tiling error:', error);
    if (error?.message === 'cancelled') {
      updateStatus('Tiling cancelled.');
      showProgress(0, true);
      throw error;
    }
    updateStatus(`Tiling failed${error?.message ? `: ${error.message}` : '.'}`);
    showProgress(0, true);
    throw error;
  }
}

async function generateTilesForAllScenes() {
  if (!state.project?.scenes?.length) {
    updateStatus('No scenes available.');
    return;
  }

  const scenesWithPanorama = state.project.scenes.filter((scene) => scene.sourceImage?.dataUrl);
  if (!scenesWithPanorama.length) {
    updateStatus('No scenes with uploaded 360 image found.');
    return;
  }

  const tileOptions = askTileOptions();
  if (!tileOptions) {
    updateStatus('Tiling cancelled.');
    return;
  }

  const originalSceneId = state.selectedSceneId;
  let completed = 0;

  try {
    for (let i = 0; i < scenesWithPanorama.length; i += 1) {
      const scene = scenesWithPanorama[i];
      await generateTilesForScene({
        scene,
        tileOptions,
        skipViewerRefresh: true,
        sceneLabel: `${i + 1}/${scenesWithPanorama.length}`
      });
      completed += 1;
    }
    updateStatus(`Tiles generated for ${completed}/${scenesWithPanorama.length} scenes.`);
  } catch (error) {
    if (error?.message === 'cancelled') {
      updateStatus(`Tiling cancelled (${completed}/${scenesWithPanorama.length} scenes completed).`);
    } else {
      updateStatus(`Batch tiling failed (${completed}/${scenesWithPanorama.length} completed).`);
    }
  } finally {
    const stillExists = state.project.scenes.some((scene) => scene.id === originalSceneId);
    state.selectedSceneId = stillExists ? originalSceneId : state.project.scenes[0]?.id || null;
    renderSceneList();
    switchEditorScene();
    scheduleMarkerRender();
  }
}

async function buildCubemapTiles(sceneId, dataUrl, faceSize, tileSize) {
  const worker = getTilerWorker();
  if (worker) {
    return new Promise((resolve, reject) => {
      const requestId = `${sceneId}-${Date.now()}`;
      activeTilingRequestId = requestId;
      worker.postMessage({ type: 'start', requestId, sceneId, dataUrl, faceSize, tileSize });

      const handler = (event) => {
        const message = event.data;
        if (message.requestId !== requestId) return;

        if (message.type === 'progress') {
          updateProgress(message.value);
          return;
        }

        if (message.type === 'result') {
          worker.removeEventListener('message', handler);
          updateProgress(100);
          activeTilingRequestId = null;
          resolve(message.tiles);
        }

        if (message.type === 'error') {
          worker.removeEventListener('message', handler);
          activeTilingRequestId = null;
          console.warn('Worker tiling failed:', message.reason || 'unknown');
          updateStatus(`Tiling failed in worker${message.reason ? `: ${message.reason}` : ''}. Falling back to main thread.`);
          buildCubemapTilesMain(sceneId, dataUrl, faceSize, tileSize)
            .then(resolve)
            .catch(reject);
        }
        if (message.type === 'cancelled') {
          worker.removeEventListener('message', handler);
          activeTilingRequestId = null;
          updateStatus('Tiling cancelled.');
          showProgress(0, true);
          reject(new Error('cancelled'));
        }
      };

      worker.addEventListener('message', handler);
    });
  }

  return buildCubemapTilesMain(sceneId, dataUrl, faceSize, tileSize);
}

async function buildCubemapTilesMain(sceneId, dataUrl, faceSize, tileSize) {
  updateStatus('Generating tiles (main thread)...');
  const img = await loadImage(dataUrl);
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = img.width;
  sourceCanvas.height = img.height;
  const sourceCtx = sourceCanvas.getContext('2d');
  sourceCtx.drawImage(img, 0, 0);
  const sourceData = sourceCtx.getImageData(0, 0, img.width, img.height).data;

  const faces = ['f', 'b', 'l', 'r', 'u', 'd'];
  const tiles = {};

  const faceCanvases = faces.map((face) =>
    renderFace(sourceData, img.width, img.height, face, faceSize)
  );
  const preview = document.createElement('canvas');
  preview.width = 512;
  preview.height = 256;
  const ctx = preview.getContext('2d');
  ctx.drawImage(img, 0, 0, preview.width, preview.height);
  tiles[`${sceneTilePath(sceneId)}/preview.jpg`] = preview.toDataURL('image/jpeg', 0.8);

  const tilesPerSide = Math.ceil(faceSize / tileSize);
  faceCanvases.forEach((faceCanvas, faceIndex) => {
    for (let y = 0; y < tilesPerSide; y += 1) {
      for (let x = 0; x < tilesPerSide; x += 1) {
        const tile = document.createElement('canvas');
        tile.width = tileSize;
        tile.height = tileSize;
        const tctx = tile.getContext('2d');
        tctx.drawImage(
          faceCanvas,
          x * tileSize,
          y * tileSize,
          tileSize,
          tileSize,
          0,
          0,
          tileSize,
          tileSize
        );
        const path = `${sceneTilePath(sceneId)}/0/${faces[faceIndex]}/${y}/${x}.jpg`;
        tiles[path] = tile.toDataURL('image/jpeg', 0.85);
      }
    }
  });

  return tiles;
}

function getTilerWorker() {
  if (!window.Worker || !window.OffscreenCanvas) {
    return null;
  }

  if (!tilerWorker) {
    tilerWorker = new Worker('tiler.worker.js');
  }

  return tilerWorker;
}

function updateProgress(value) {
  const now = Date.now();
  if (now - lastProgressUpdate < 120) return;
  lastProgressUpdate = now;
  updateStatus(`Generating tiles: ${Math.round(value)}%`);
  showProgress(value);
}

function pauseTiling() {
  if (!tilerWorker || !activeTilingRequestId) {
    updateStatus('No active tiling task.');
    return;
  }
  tilingPaused = true;
  tilerWorker.postMessage({ type: 'pause', requestId: activeTilingRequestId });
  updateStatus('Tiling paused.');
}

function resumeTiling() {
  if (!tilerWorker || !activeTilingRequestId) {
    updateStatus('No active tiling task.');
    return;
  }
  tilingPaused = false;
  tilerWorker.postMessage({ type: 'resume', requestId: activeTilingRequestId });
  updateStatus('Tiling resumed.');
}

function showProgress(value, done = false) {
  tilingProgress.style.display = 'block';
  tilingProgressFill.style.width = `${Math.max(0, Math.min(100, value))}%`;
  if (done) {
    setTimeout(() => {
      tilingProgress.style.display = 'none';
      tilingProgressFill.style.width = '0%';
    }, 800);
  }
}

function sceneTilePath(sceneId) {
  return `tiles/${sceneId}`;
}

function setSceneOrientationById(sceneId) {
  const scene = state.project?.scenes?.find((item) => item.id === sceneId) || null;
  const active = scene ? editorScenes.get(scene.id) : null;
  if (!scene || !active?.view) {
    updateStatus('Select a scene with a visible preview first.');
    return false;
  }

  const current = active.view.parameters ? active.view.parameters() : null;
  if (!current) {
    updateStatus('Unable to read current view orientation.');
    return false;
  }

  scene.initialViewParameters = {
    yaw: Number(current.yaw) || 0,
    pitch: Number(current.pitch) || 0,
    fov: Number(current.fov) || scene.initialViewParameters?.fov || 1.4
  };
  scene.orientationSaved = true;
  active.data.initialViewParameters = { ...scene.initialViewParameters };
  active.data.orientationSaved = true;
  if (state.selectedSceneId !== scene.id) {
    state.selectedSceneId = scene.id;
    state.selectedHotspotId = scene.hotspots[0]?.id || null;
  }
  renderSceneList();
  updateSceneTitle();
  updateStatus(`Orientation saved for "${scene.name || scene.id}".`);
  autosave();
  return true;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function renderFace(sourceData, sourceWidth, sourceHeight, face, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (2 * (x + 0.5) / size) - 1;
      const v = (2 * (y + 0.5) / size) - 1;
      const dir = faceDirection(face, u, v);
      const theta = Math.atan2(dir.z, dir.x);
      const phi = Math.acos(dir.y);

      const uf = (theta + Math.PI) / (2 * Math.PI);
      const vf = phi / Math.PI;

      const ix = Math.floor(uf * (sourceWidth - 1));
      const iy = Math.floor(vf * (sourceHeight - 1));

      const pixel = samplePixel(sourceData, sourceWidth, ix, iy);
      const idx = (y * size + x) * 4;
      data[idx] = pixel[0];
      data[idx + 1] = pixel[1];
      data[idx + 2] = pixel[2];
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function faceDirection(face, u, v) {
  switch (face) {
    case 'f': return normalize({ x: 1, y: -v, z: -u });
    case 'b': return normalize({ x: -1, y: -v, z: u });
    case 'l': return normalize({ x: u, y: -v, z: 1 });
    case 'r': return normalize({ x: -u, y: -v, z: -1 });
    case 'u': return normalize({ x: u, y: 1, z: v });
    case 'd': return normalize({ x: u, y: -1, z: -v });
    default: return normalize({ x: 1, y: -v, z: -u });
  }
}

function normalize(vec) {
  const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
  return {
    x: vec.x / length,
    y: vec.y / length,
    z: vec.z / length
  };
}

function samplePixel(sourceData, sourceWidth, x, y) {
  const idx = (y * sourceWidth + x) * 4;
  return [
    sourceData[idx],
    sourceData[idx + 1],
    sourceData[idx + 2]
  ];
}

document.getElementById('btn-delete-all-scenes').addEventListener('click', deleteAllScenes);
btnAddGroup.addEventListener('click', addGroup);
btnRenameGroup.addEventListener('click', renameSelectedGroup);
btnDeleteGroup.addEventListener('click', deleteGroup);
document.getElementById('btn-add-hotspot').addEventListener('click', addHotspot);
document.getElementById('btn-delete-hotspot').addEventListener('click', deleteHotspot);
document.getElementById('btn-add-block').addEventListener('click', addBlock);

projectNameInput.addEventListener('input', (event) => updateProjectName(event.target.value));
sceneGroupSelect.addEventListener('change', (event) => {
  state.selectedGroupId = event.target.value;
  const preferredScene = getPreferredSceneForGroup(state.selectedGroupId);
  state.selectedSceneId = preferredScene?.id || null;
  state.selectedHotspotId = preferredScene?.hotspots?.[0]?.id || null;
  state.selectedFloorplanId = getFloorplanForGroup(state.selectedGroupId)?.id || null;
  renderAll();
  autosave();
});

linkTargetSceneSelect.addEventListener('change', (event) => {
  const hotspot = getSelectedLinkHotspot();
  if (!hotspot) return;
  hotspot.contentBlocks = hotspot.contentBlocks || [];
  let block = getSceneLinkBlock(hotspot);
  if (!block) {
    block = { type: 'scene', sceneId: '', comment: '' };
    hotspot.contentBlocks.push(block);
  }
  block.sceneId = event.target.value;
  renderLinkEditor();
  renderContentBlocks();
  autosave();
});

linkCommentInput.addEventListener('input', (event) => {
  const hotspot = getSelectedLinkHotspot();
  if (!hotspot) return;
  hotspot.contentBlocks = hotspot.contentBlocks || [];
  let block = getSceneLinkBlock(hotspot);
  if (!block) {
    block = { type: 'scene', sceneId: '', comment: '' };
    hotspot.contentBlocks.push(block);
  }
  block.comment = event.target.value;
  autosave();
});

iconSelect.addEventListener('change', (event) => {
  const hotspot = getSelectedHotspot();
  if (!hotspot) return;
  hotspot.iconId = event.target.value;
  autosave();
});

linkSelect.addEventListener('change', (event) => {
  const hotspotId = event.target.value;
  if (!hotspotId) return;
  state.selectedHotspotId = hotspotId;
  renderLinkEditor();
  renderContentBlocks();
  renderIconOptions();
  scheduleMarkerRender();
});

btnSave.addEventListener('click', () => saveDraft(state.project));
btnExport.addEventListener('click', exportProject);
btnExportStatic.addEventListener('click', exportStaticPackage);
btnImport.addEventListener('click', () => fileImport.click());
btnUploadIcon.addEventListener('click', () => fileIcon.click());
btnUploadMedia.addEventListener('click', () => fileMedia.click());
btnUploadFloorplan.addEventListener('click', () => fileFloorplan.click());
btnDeleteFloorplan.addEventListener('click', deleteFloorplan);
btnUploadPanorama.addEventListener('click', () => filePanorama.click());
btnGenerateTiles.addEventListener('click', generateTilesForScene);
btnGenerateAllTiles.addEventListener('click', generateTilesForAllScenes);
btnPauseTiles.addEventListener('click', pauseTiling);
btnResumeTiles.addEventListener('click', resumeTiling);
btnTogglePlacement.addEventListener('click', togglePlacementMode);
btnPreviewHotspot.addEventListener('click', () => openHotspotPreview(state.selectedHotspotId));
btnSetMainScene.addEventListener('click', setMainSceneForSelectedGroup);
btnAddSceneLink.addEventListener('click', addSceneLinkBlock);
btnDeleteSceneLink.addEventListener('click', deleteSceneLinkBlock);
btnRemoveAllLinks.addEventListener('click', removeAllSceneLinksForCurrentScene);
btnCancelTiles.addEventListener('click', () => {
  if (tilerWorker && activeTilingRequestId) {
    tilerWorker.postMessage({ type: 'cancel', requestId: activeTilingRequestId });
  }
});
btnClosePreview.addEventListener('click', closeHotspotPreview);
previewModal.addEventListener('click', (event) => {
  if (event.target === previewModal) {
    closeHotspotPreview();
  }
});

fileImport.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    importProjectFile(file);
  }
});

fileIcon.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadIconFile(file);
  }
  fileIcon.value = '';
});

fileMedia.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadMediaFile(file);
  }
  fileMedia.value = '';
});

fileFloorplan.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadFloorplanFile(file);
  }
  fileFloorplan.value = '';
});

filePanorama.addEventListener('change', async (event) => {
  const files = event.target.files;
  if (files?.length) {
    await uploadPanoramaFiles(files);
  }
  filePanorama.value = '';
});

window.addEventListener('resize', handleResize);

async function bootstrap() {
  const draft = await loadDraft();
  if (draft) {
    loadProject(draft);
    updateStatus('Loaded draft from browser storage.');
    return;
  }

  fetch(sampleTourUrl)
    .then((res) => res.json())
    .then(loadProject)
    .catch(() => loadProject(fallbackProject));
}

bootstrap();
