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
  selectedFloorplanId: null,
  multiSelectedSceneIds: [],
  sceneSelectionAnchorId: null,
  sceneSortKey: 'name',
  sceneSortDirection: 'asc',
  sceneLabelMode: 'name',
  linkTargetAllGroups: false,
  newLinkColorKey: 'yellow'
};

const sceneList = document.getElementById('scene-list');
const sceneGroupSelect = document.getElementById('group-select');
const linkSelect = document.getElementById('link-select');
const linkTargetSceneSelect = document.getElementById('link-target-scene');
const linkTargetAllGroupsToggle = document.getElementById('link-target-all-groups');
const linkCommentInput = document.getElementById('link-comment');
const linkNoteLabel = document.getElementById('link-note-label');
const linkNewColorSelect = document.getElementById('link-new-color');
const contentBlocks = document.getElementById('content-blocks');
const sceneTitle = document.getElementById('scene-title');
const projectNameInput = document.getElementById('project-name');
const projectFovInput = null;
const statusLeft = document.getElementById('status-left');
const btnAddGroup = document.getElementById('btn-add-group');
const btnRenameGroup = document.getElementById('btn-rename-group');
const btnDeleteGroup = document.getElementById('btn-delete-group');
const btnImport = document.getElementById('btn-import');
const btnSave = document.getElementById('btn-save');
const btnExport = document.getElementById('btn-export');
const btnExportStatic = document.getElementById('btn-export-static');
const btnResetProject = document.getElementById('btn-reset-project');
const btnUploadFloorplan = document.getElementById('btn-upload-minimap');
const btnDeleteFloorplan = document.getElementById('btn-delete-floorplan');
const btnUploadPanorama = document.getElementById('btn-upload-panorama');
const btnGenerateTiles = document.getElementById('btn-generate-tiles');
const btnTilesInfo = document.getElementById('btn-tiles-info');
const btnDeleteSelectedScenes = document.getElementById('btn-delete-selected-scenes');
const btnCancelTiles = document.getElementById('btn-cancel-tiles');
const btnPauseTiles = document.getElementById('btn-pause-tiles');
const btnResumeTiles = document.getElementById('btn-resume-tiles');
const btnTogglePlacement = document.getElementById('btn-toggle-placement');
const btnPreviewHotspot = document.getElementById('btn-preview-hotspot');
const btnSetMainScene = document.getElementById('btn-set-main-scene');
const btnSetOrientation = document.getElementById('btn-set-orientation');
const btnAddSceneLink = document.getElementById('btn-add-scene-link');
const btnDeleteSceneLink = document.getElementById('btn-delete-scene-link');
const btnRemoveAllLinks = document.getElementById('btn-remove-all-links');
const btnToggleLinksPanel = document.getElementById('btn-toggle-links-panel');
const linksPanelBody = document.getElementById('links-panel-body');
const btnToggleProjectPanel = document.getElementById('btn-toggle-project-panel');
const projectPanelBody = document.getElementById('project-panel-body');
const btnToggleGroupsPanel = document.getElementById('btn-toggle-groups-panel');
const groupsPanelBody = document.getElementById('groups-panel-body');
const btnToggleScenesPanel = document.getElementById('btn-toggle-scenes-panel');
const scenesPanelBody = document.getElementById('scenes-panel-body');
const btnSceneSortName = document.getElementById('btn-scene-sort-name');
const btnSceneSortUpload = document.getElementById('btn-scene-sort-upload');
const btnSceneLabelMode = document.getElementById('btn-scene-label-mode');
const btnToggleMapPanel = document.getElementById('btn-toggle-map-panel');
const mapPanelBody = document.getElementById('map-panel-body');
const btnToggleSceneActionsPanel = document.getElementById('btn-toggle-scene-actions-panel');
const sceneActionsPanelBody = document.getElementById('scene-actions-panel-body');
const mapWindowBackdrop = document.getElementById('map-window-backdrop');
const layoutRoot = document.querySelector('.layout');
const fileImport = document.getElementById('file-import');
const fileFloorplan = document.getElementById('file-floorplan');
const filePanorama = document.getElementById('file-panorama');
const miniMap = document.getElementById('mini-map');
const btnFloorplanExpand = document.getElementById('btn-floorplan-expand');
const btnFloorplanPlaceScene = document.getElementById('btn-floorplan-place-scene');
const btnFloorplanEdit = document.getElementById('btn-floorplan-edit');
const btnFloorplanSelectAll = document.getElementById('btn-floorplan-select-all');
const btnFloorplanDeleteNode = document.getElementById('btn-floorplan-delete-node');
const btnFloorplanToggleLabels = document.getElementById('btn-floorplan-toggle-labels');
const floorplanColorSelect = document.getElementById('floorplan-color-select');
const btnFloorplanZoomReset = document.getElementById('btn-floorplan-zoom-reset');
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
const deleteLinksScopeModal = document.getElementById('delete-links-scope-modal');
const btnDeleteLinksScene = document.getElementById('btn-delete-links-scene');
const btnDeleteLinksGroup = document.getElementById('btn-delete-links-group');
const btnDeleteLinksCancel = document.getElementById('btn-delete-links-cancel');
const duplicatePanoramaModal = document.getElementById('duplicate-panorama-modal');
const duplicatePanoramaMessage = document.getElementById('duplicate-panorama-message');
const btnDuplicatePanoramaProceed = document.getElementById('btn-duplicate-panorama-proceed');
const btnDuplicatePanoramaAcceptAll = document.getElementById('btn-duplicate-panorama-accept-all');
const btnDuplicatePanoramaSkip = document.getElementById('btn-duplicate-panorama-skip');
const btnDuplicatePanoramaSkipAll = document.getElementById('btn-duplicate-panorama-skip-all');
const btnDuplicatePanoramaList = document.getElementById('btn-duplicate-panorama-list');
const btnDuplicatePanoramaCancel = document.getElementById('btn-duplicate-panorama-cancel');
const duplicatePanoramaListModal = document.getElementById('duplicate-panorama-list-modal');
const duplicatePanoramaListBody = document.getElementById('duplicate-panorama-list-body');
const btnCloseDuplicatePanoramaList = document.getElementById('btn-close-duplicate-panorama-list');
const sceneCommentInput = document.getElementById('scene-comment');

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
const hotspotMarkerElements = new Map();
let hotspotMarkerSceneId = null;
let lastMarkerRenderSignature = null;
let suppressSceneSwitch = false;
let draggingHotspotId = null;
let dragMoved = false;
let dragPointerId = null;
let viewerPointerDown = null;
let suppressNextViewerClick = false;
let renamingSceneId = null;
let hoveredLinkHotspotId = null;
let pendingSceneLinkDraft = null;
let floorplanZoomByGroup = new Map();
let floorplanPlaceMode = false;
let floorplanEditMode = false;
let floorplanSelectAllMode = false;
let floorplanShowLabels = false;
let floorplanMapWindowOpen = false;
let floorplanPanState = null;
let deleteLinksScopeResolver = null;
let duplicatePanoramaResolver = null;
let duplicatePanoramaListEntries = [];

const FLOORPLAN_COLOR_MAP = {
  yellow: '#f0c84b',
  red: '#ef4444',
  cyan: '#22d3ee',
  lightgreen: '#86efac',
  magenta: '#f472b6'
};

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
  floorplanZoomByGroup = new Map();
  project.groups = project.groups || [{ id: 'group-main', name: 'Main Group' }];
  if (!project.groups.length) {
    project.groups.push({ id: `group-${Date.now()}`, name: 'Main Group' });
  }
  project.minimap = project.minimap || { enabled: false, floorplans: [] };
  project.minimap.floorplans = project.minimap.floorplans || [];
  project.scenes = project.scenes || [];
  project.assets = project.assets || {};
  project.assets.media = Array.isArray(project.assets.media) ? project.assets.media : [];

  const defaultGroupId = project.groups[0].id;
  project.scenes.forEach((scene) => {
    if (!scene.groupId) {
      scene.groupId = defaultGroupId;
    }
    scene.alias = typeof scene.alias === 'string' ? scene.alias : '';
    scene.comment = typeof scene.comment === 'string' ? scene.comment : '';
    scene.hotspots = scene.hotspots || [];
    scene.hotspots.forEach((hotspot) => {
      hotspot.contentBlocks = hotspot.contentBlocks || [];
      hotspot.contentBlocks.forEach((block) => {
        if (block.type === 'scene') {
          block.comment = typeof block.comment === 'string' ? block.comment : '';
          if (Object.prototype.hasOwnProperty.call(block, 'alias')) {
            delete block.alias;
          }
        }
      });
    });
  });
  project.minimap.floorplans.forEach((floorplan) => {
    if (!floorplan.groupId) {
      floorplan.groupId = defaultGroupId;
    }
    floorplan.markerColorKey = normalizeFloorplanColorKey(floorplan.markerColorKey || 'yellow');
    floorplan.nodes = (floorplan.nodes || []).map((node) => ({
      ...node,
      colorKey: normalizeFloorplanColorKey(node?.colorKey || floorplan.markerColorKey || 'yellow')
    }));
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
  const fixedLinkCodes = ensureUniqueSceneLinkCodes();

  projectNameInput.value = project.project.name || 'Untitled';
  syncSceneFovInput();
  renderAll();
  updatePlacementButtonLabel();
  initEditorViewer(project);
  if (fixedLinkCodes > 0) {
    updateStatus('Duplicate link codes were fixed automatically.');
  }
}

function renderAll() {
  renderSceneGroupOptions();
  renderSceneList();
  renderSceneCommentField();
  renderHotspotList();
  renderLinkEditor();
  renderContentBlocks();
  updateSceneTitle();
  syncSceneFovInput();
  renderFloorplans();
  switchEditorScene();
}

function updateSceneTitle() {
  const scene = getSelectedScene();
  sceneTitle.textContent = scene ? `Scene: ${scene.name}` : 'Scene: -';
}

function syncSceneFovInput() {
  if (!projectFovInput) return;
  const scene = getSelectedScene();
  if (!scene) {
    projectFovInput.value = '1.4';
    projectFovInput.disabled = true;
    return;
  }
  projectFovInput.disabled = false;
  projectFovInput.value = String(Number(getSelectedSceneFov().toFixed(2)));
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

function getSceneListLabel(scene) {
  if (!scene) return '';
  if (state.sceneLabelMode === 'alias') {
    return String(scene.alias || '').trim();
  }
  return String(scene.name || '').trim();
}

function compareScenesByName(a, b) {
  const nameA = getSceneListLabel(a);
  const nameB = getSceneListLabel(b);
  const cmp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
  if (cmp !== 0) return cmp;
  return String(a?.id || '').localeCompare(String(b?.id || ''), undefined, { sensitivity: 'base', numeric: true });
}

function compareScenesByUploadId(a, b) {
  return String(a?.id || '').localeCompare(String(b?.id || ''), undefined, { sensitivity: 'base', numeric: true });
}

function sortScenesForList(scenes) {
  const list = [...(scenes || [])];
  const key = state.sceneSortKey === 'upload' ? 'upload' : 'name';
  const direction = state.sceneSortDirection === 'desc' ? -1 : 1;
  list.sort((a, b) => {
    const cmp = key === 'upload' ? compareScenesByUploadId(a, b) : compareScenesByName(a, b);
    return cmp * direction;
  });
  return list;
}

function getScenesForSelectedGroup() {
  const groupId = state.selectedGroupId;
  const scenes = (state.project?.scenes || []).filter((scene) => scene.groupId === groupId);
  return sortScenesForList(scenes);
}

function getPreferredSceneForGroup(groupId) {
  const scenes = (state.project?.scenes || []).filter((scene) => scene.groupId === groupId);
  if (!scenes.length) return null;
  const group = getGroupById(groupId);
  const preferred = scenes.find((scene) => scene.id === group?.mainSceneId);
  return preferred || scenes[0];
}

function updateSceneSortButtons() {
  if (btnSceneSortName) {
    const activeName = state.sceneSortKey === 'name';
    btnSceneSortName.classList.toggle('active', activeName);
    const arrow = state.sceneSortDirection === 'asc' ? '↓' : '↑';
    btnSceneSortName.textContent = activeName
      ? `A/Z ${arrow}`
      : 'A/Z';
    btnSceneSortName.title = activeName
      ? `${state.sceneLabelMode === 'alias' ? 'Alias' : 'Name'} order (${state.sceneSortDirection})`
      : `Sort by scene ${state.sceneLabelMode === 'alias' ? 'alias' : 'name'}`;
  }
  if (btnSceneSortUpload) {
    const activeUpload = state.sceneSortKey === 'upload';
    btnSceneSortUpload.classList.toggle('active', activeUpload);
    const arrow = state.sceneSortDirection === 'asc' ? '↓' : '↑';
    btnSceneSortUpload.textContent = activeUpload
      ? `UPLOAD ${arrow}`
      : 'UPLOAD';
    btnSceneSortUpload.title = activeUpload
      ? `Upload order (${state.sceneSortDirection})`
      : 'Sort by scene internal id';
  }
  if (btnSceneLabelMode) {
    const aliasMode = state.sceneLabelMode === 'alias';
    btnSceneLabelMode.classList.toggle('active', aliasMode);
    btnSceneLabelMode.textContent = aliasMode ? 'Alias ON' : 'Alias OFF';
    btnSceneLabelMode.title = aliasMode
      ? 'Scenes list shows alias values'
      : 'Scenes list shows scene names';
  }
}

function toggleSceneSort(sortKey) {
  if (state.sceneSortKey === sortKey) {
    state.sceneSortDirection = state.sceneSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.sceneSortKey = sortKey;
    state.sceneSortDirection = 'asc';
  }
  renderSceneList();
  const modeLabel = state.sceneSortKey === 'upload'
    ? 'upload id'
    : (state.sceneLabelMode === 'alias' ? 'alias' : 'name');
  updateStatus(`Scenes sorted by ${modeLabel} (${state.sceneSortDirection}).`);
}

function toggleSceneLabelMode() {
  state.sceneLabelMode = state.sceneLabelMode === 'alias' ? 'name' : 'alias';
  renderSceneList();
  updateStatus(`Scene list mode: ${state.sceneLabelMode === 'alias' ? 'Alias' : 'Name'}.`);
}

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
  return false;
}

function moveSceneSelectionBy(delta) {
  const scenes = getScenesForSelectedGroup();
  if (!scenes.length) return false;

  let index = scenes.findIndex((scene) => scene.id === state.selectedSceneId);
  if (index < 0) index = 0;
  const nextIndex = Math.min(scenes.length - 1, Math.max(0, index + delta));
  if (nextIndex === index) return true;

  const nextScene = scenes[nextIndex];
  if (!nextScene) return false;
  selectScene(nextScene.id);
  const activeButton = sceneList?.querySelector(`.scene-item-main[data-scene-id="${nextScene.id}"]`);
  activeButton?.scrollIntoView({ block: 'nearest' });
  return true;
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

function getPendingSceneLinkDraftForSelectedScene() {
  if (!pendingSceneLinkDraft) return null;
  return pendingSceneLinkDraft.sceneId === state.selectedSceneId ? pendingSceneLinkDraft : null;
}

function normalizeSceneLinkColorKey(key) {
  return normalizeFloorplanColorKey(key || 'yellow');
}

function getSceneLinkColorHex(colorKey) {
  return FLOORPLAN_COLOR_MAP[normalizeSceneLinkColorKey(colorKey)];
}

function colorLabelFromKey(colorKey) {
  const labels = {
    yellow: 'Yellow',
    red: 'Red',
    cyan: 'Cyan',
    lightgreen: 'Light Green',
    magenta: 'Magenta'
  };
  return labels[colorKey] || colorKey;
}

function renderSceneLinkColorOptions(selectElement, selectedKey) {
  if (!selectElement) return;
  const normalized = normalizeSceneLinkColorKey(selectedKey);
  selectElement.innerHTML = '';
  Object.keys(FLOORPLAN_COLOR_MAP).forEach((key) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = '⬤';
    option.title = colorLabelFromKey(key);
    option.style.color = getSceneLinkColorHex(key);
    selectElement.appendChild(option);
  });
  selectElement.value = normalized;
  selectElement.style.color = getSceneLinkColorHex(normalized);
}

function getLinkTargetSceneOptions(currentSceneId) {
  const allScenes = state.project?.scenes || [];
  const currentScene = allScenes.find((scene) => scene.id === currentSceneId) || null;
  if (state.linkTargetAllGroups) {
    return allScenes.filter((scene) => scene.id !== currentSceneId);
  }
  const currentGroupId = currentScene?.groupId || state.selectedGroupId;
  return allScenes.filter((scene) => scene.id !== currentSceneId && scene.groupId === currentGroupId);
}

function formatTargetSceneOptionLabel(scene, { includeGroup = false } = {}) {
  if (!scene) return '';
  const sceneName = scene.name || scene.id;
  if (!includeGroup) return sceneName;
  const groupName = getGroupById(scene.groupId)?.name || scene.groupId || 'Unknown group';
  return `${sceneName} (${groupName})`;
}

function updateLinkNoteModeUi() {
  if (linkNoteLabel) {
    linkNoteLabel.textContent = 'Comment (optional)';
  }
}

function renderLinkEditor() {
  if (!linkTargetSceneSelect || !linkCommentInput) return;

  const selectedScene = getSelectedScene();
  const linkHotspot = getSelectedLinkHotspot();
  const pendingDraft = getPendingSceneLinkDraftForSelectedScene();
  const scenes = getLinkTargetSceneOptions(state.selectedSceneId);
  const allScenes = state.project?.scenes || [];
  const currentSceneId = state.selectedSceneId;
  const canEditLink = Boolean((linkHotspot || pendingDraft) && placementMode);
  const lockGlobalLinkControls = placementMode;
  const activeColorKey = normalizeSceneLinkColorKey(linkHotspot?.linkColorKey || pendingDraft?.linkColorKey || state.newLinkColorKey);
  if (btnAddSceneLink) btnAddSceneLink.disabled = !selectedScene;
  if (btnDeleteSceneLink) btnDeleteSceneLink.disabled = lockGlobalLinkControls;
  if (btnRemoveAllLinks) btnRemoveAllLinks.disabled = lockGlobalLinkControls;
  if (linkNewColorSelect) linkNewColorSelect.disabled = !canEditLink;
  if (linkTargetAllGroupsToggle) {
    linkTargetAllGroupsToggle.disabled = !canEditLink;
    const flagLabel = linkTargetAllGroupsToggle.closest('.inline-flag');
    flagLabel?.classList.toggle('disabled', !canEditLink);
  }
  renderSceneLinkColorOptions(linkNewColorSelect, activeColorKey);
  updateLinkNoteModeUi();
  linkCommentInput.placeholder = 'Comment (optional)';
  if (linkTargetAllGroupsToggle) {
    linkTargetAllGroupsToggle.checked = Boolean(state.linkTargetAllGroups);
  }

  linkTargetSceneSelect.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'None';
  linkTargetSceneSelect.appendChild(none);

  scenes.forEach((scene) => {
    if (scene.id === currentSceneId) {
      return;
    }
    const option = document.createElement('option');
    option.value = scene.id;
    option.textContent = formatTargetSceneOptionLabel(scene, {
      includeGroup: state.linkTargetAllGroups
    });
    linkTargetSceneSelect.appendChild(option);
  });

  if (!linkHotspot && !pendingDraft) {
    linkCommentInput.value = '';
    linkTargetSceneSelect.value = '';
    linkCommentInput.disabled = true;
    linkTargetSceneSelect.disabled = true;
    return;
  }

  let selectedTarget = '';
  let noteValue = '';

  if (linkHotspot) {
    const sceneLinkBlock = getSceneLinkBlock(linkHotspot);
    if (sceneLinkBlock && typeof sceneLinkBlock.comment !== 'string') {
      sceneLinkBlock.comment = '';
    }
    selectedTarget = sceneLinkBlock?.sceneId || '';
    noteValue = sceneLinkBlock?.comment || '';
  } else if (pendingDraft) {
    selectedTarget = pendingDraft.targetSceneId || '';
    noteValue = pendingDraft.comment || '';
  }

  if (selectedTarget && !scenes.some((scene) => scene.id === selectedTarget)) {
    const targetScene = allScenes.find((scene) => scene.id === selectedTarget);
    if (targetScene) {
      const option = document.createElement('option');
      option.value = targetScene.id;
      option.textContent = state.linkTargetAllGroups
        ? formatTargetSceneOptionLabel(targetScene, { includeGroup: true })
        : `${targetScene.name || targetScene.id} (other group)`;
      linkTargetSceneSelect.appendChild(option);
    }
  }

  linkCommentInput.disabled = !canEditLink;
  linkTargetSceneSelect.disabled = !canEditLink;
  linkCommentInput.value = noteValue;
  linkTargetSceneSelect.value = selectedTarget === currentSceneId ? '' : selectedTarget;
}

function getFloorplanForGroup(groupId) {
  if (!groupId) return null;
  return state.project?.minimap?.floorplans?.find((fp) => fp.groupId === groupId) || null;
}

function getSelectedFloorplan() {
  return getFloorplanForGroup(state.selectedGroupId);
}

function getSelectedFloorplanNode() {
  const floorplan = getSelectedFloorplan();
  const sceneId = state.selectedSceneId;
  if (!floorplan || !sceneId) return null;
  return (floorplan.nodes || []).find((node) => node.sceneId === sceneId) || null;
}

function getSelectedFloorplanNodes() {
  const floorplan = getSelectedFloorplan();
  if (!floorplan) return [];
  const nodes = floorplan.nodes || [];
  if (floorplanSelectAllMode) {
    return nodes.slice();
  }
  const selected = getSelectedFloorplanNode();
  return selected ? [selected] : [];
}

function sceneHasGeneratedTiles(scene) {
  if (!scene) return false;
  const hasPaths = Boolean(scene.tilesPath && scene.previewPath);
  const levels = Array.isArray(scene.levels) ? scene.levels : [];
  const hasRenderableLevel = levels.some((level) => (
    Number.isFinite(Number(level?.size)) &&
    Number(level.size) > 0 &&
    Number.isFinite(Number(level?.tileSize)) &&
    Number(level.tileSize) > 0 &&
    !level?.fallbackOnly
  ));
  return hasPaths && hasRenderableLevel;
}

function renderSceneCommentField() {
  if (!sceneCommentInput) return;
  const scene = getSelectedScene();
  if (!scene) {
    sceneCommentInput.value = '';
    sceneCommentInput.disabled = true;
    return;
  }
  if (typeof scene.comment !== 'string') {
    scene.comment = '';
  }
  sceneCommentInput.disabled = false;
  sceneCommentInput.value = scene.comment;
}

function updateFloorplanDeleteNodeUi() {
  if (!btnFloorplanDeleteNode) return;
  const hasFloorplan = Boolean(getSelectedFloorplan());
  const hasSelectedNodes = getSelectedFloorplanNodes().length > 0;
  btnFloorplanDeleteNode.disabled = !hasFloorplan || !floorplanEditMode || !hasSelectedNodes;
}

function updateFloorplanSelectAllUi() {
  if (!btnFloorplanSelectAll) return;
  const floorplan = getSelectedFloorplan();
  const hasNodes = (floorplan?.nodes || []).length > 0;
  btnFloorplanSelectAll.disabled = !floorplanEditMode || !hasNodes;
  btnFloorplanSelectAll.classList.toggle('active', floorplanSelectAllMode && floorplanEditMode);
  btnFloorplanSelectAll.textContent = floorplanSelectAllMode && floorplanEditMode ? 'All Selected' : 'Select All';
}

function normalizeFloorplanColorKey(key) {
  return Object.prototype.hasOwnProperty.call(FLOORPLAN_COLOR_MAP, key) ? key : 'yellow';
}

function getSelectedFloorplanColorKey() {
  const floorplan = getSelectedFloorplan();
  const selectedNodes = getSelectedFloorplanNodes();
  const keyFromSelection = selectedNodes[0]?.colorKey;
  return normalizeFloorplanColorKey(keyFromSelection || floorplan?.markerColorKey || 'yellow');
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '');
  const value = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r: 240, g: 200, b: 75 };
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

function darkenHex(hex, ratio = 0.22) {
  const rgb = hexToRgb(hex);
  const k = Math.max(0, Math.min(1, 1 - ratio));
  return rgbToHex(rgb.r * k, rgb.g * k, rgb.b * k);
}

function withAlpha(hex, alpha = 0.35) {
  const rgb = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function getContrastTextColor(hex) {
  const rgb = hexToRgb(hex);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance >= 0.62 ? '#111111' : '#f8fafc';
}

function applyFloorplanNodeColorStyles(nodeElement, colorKey) {
  const color = FLOORPLAN_COLOR_MAP[normalizeFloorplanColorKey(colorKey)];
  nodeElement.style.setProperty('--floorplan-marker-color', color);
  nodeElement.style.setProperty('--floorplan-marker-border', darkenHex(color, 0.24));
  nodeElement.style.setProperty('--floorplan-marker-ring', withAlpha(color, 0.35));
  nodeElement.style.setProperty('--floorplan-marker-text', getContrastTextColor(color));
}

function updateFloorplanColorPaletteUi() {
  if (!floorplanColorSelect) return;
  const floorplan = getSelectedFloorplan();
  const selectedKey = getSelectedFloorplanColorKey();
  const disabled = !floorplan || (!floorplanEditMode && !floorplanPlaceMode);
  floorplanColorSelect.innerHTML = '';
  Object.keys(FLOORPLAN_COLOR_MAP).forEach((key) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = '⬤';
    option.title = colorLabelFromKey(key);
    option.style.color = FLOORPLAN_COLOR_MAP[key];
    floorplanColorSelect.appendChild(option);
  });
  floorplanColorSelect.disabled = disabled;
  floorplanColorSelect.value = selectedKey;
  floorplanColorSelect.style.color = FLOORPLAN_COLOR_MAP[selectedKey];
}

function setSelectedFloorplanColor(colorKey) {
  const floorplan = getSelectedFloorplan();
  if (!floorplan) return;
  if (!floorplanEditMode && !floorplanPlaceMode) {
    updateStatus('Enable Place or Edit to change map color.');
    return;
  }
  const nextKey = normalizeFloorplanColorKey(colorKey);
  floorplan.markerColorKey = nextKey;
  const selectedNodes = getSelectedFloorplanNodes();
  if (floorplanEditMode && selectedNodes.length) {
    selectedNodes.forEach((node) => {
      node.colorKey = nextKey;
    });
  }
  renderFloorplans();
  autosave();
}

function getFloorplanZoom(groupId = state.selectedGroupId) {
  if (!groupId) return 1;
  const value = floorplanZoomByGroup.get(groupId);
  return Number.isFinite(value) ? value : 1;
}

function setFloorplanZoom(nextZoom) {
  const groupId = state.selectedGroupId;
  if (!groupId) return;
  const clamped = Math.min(8, Math.max(0.5, nextZoom));
  floorplanZoomByGroup.set(groupId, clamped);
  renderFloorplans();
}

function zoomFloorplanAt(event, groupId) {
  if (!groupId || !miniMap) return;
  event.preventDefault();
  const oldZoom = getFloorplanZoom(groupId);
  const factor = event.deltaY < 0 ? 1.1 : 0.9;
  const nextZoom = Math.min(8, Math.max(0.5, oldZoom * factor));
  if (Math.abs(nextZoom - oldZoom) < 0.0001) return;

  const rect = miniMap.getBoundingClientRect();
  const anchorX = event.clientX - rect.left;
  const anchorY = event.clientY - rect.top;
  const worldX = miniMap.scrollLeft + anchorX;
  const worldY = miniMap.scrollTop + anchorY;

  floorplanZoomByGroup.set(groupId, nextZoom);
  renderFloorplans();
  requestAnimationFrame(() => {
    const appliedZoom = getFloorplanZoom(groupId);
    const scale = appliedZoom / oldZoom;
    miniMap.scrollLeft = (worldX * scale) - anchorX;
    miniMap.scrollTop = (worldY * scale) - anchorY;
  });
}

function startFloorplanPan(event) {
  if (floorplanPlaceMode) return;
  if (event.button !== 0 || !miniMap) return;
  if (event.target.closest('.floorplan-node')) return;
  floorplanPanState = {
    x: event.clientX,
    y: event.clientY,
    scrollLeft: miniMap.scrollLeft,
    scrollTop: miniMap.scrollTop
  };
  miniMap.classList.add('is-panning');
  window.addEventListener('mousemove', handleFloorplanPanMove);
  window.addEventListener('mouseup', stopFloorplanPan);
  event.preventDefault();
}

function handleFloorplanPanMove(event) {
  if (!floorplanPanState || !miniMap) return;
  const dx = event.clientX - floorplanPanState.x;
  const dy = event.clientY - floorplanPanState.y;
  miniMap.scrollLeft = floorplanPanState.scrollLeft - dx;
  miniMap.scrollTop = floorplanPanState.scrollTop - dy;
}

function stopFloorplanPan() {
  floorplanPanState = null;
  if (miniMap) {
    miniMap.classList.remove('is-panning');
  }
  window.removeEventListener('mousemove', handleFloorplanPanMove);
  window.removeEventListener('mouseup', stopFloorplanPan);
}

function updateFloorplanLabelToggleUi() {
  if (!btnFloorplanToggleLabels) return;
  btnFloorplanToggleLabels.classList.toggle('active', floorplanShowLabels);
  btnFloorplanToggleLabels.textContent = floorplanShowLabels ? 'Names ON' : 'Names OFF';
}

function setFloorplanShowLabels(nextMode) {
  floorplanShowLabels = Boolean(nextMode);
  updateFloorplanLabelToggleUi();
  renderFloorplans();
}

function updateFloorplanPlaceUi() {
  if (btnFloorplanPlaceScene) {
    btnFloorplanPlaceScene.classList.toggle('active', floorplanPlaceMode);
    btnFloorplanPlaceScene.textContent = floorplanPlaceMode ? 'Place ON' : 'Place';
  }
}

function updateFloorplanEditUi() {
  if (btnFloorplanEdit) {
    btnFloorplanEdit.classList.toggle('active', floorplanEditMode);
    btnFloorplanEdit.textContent = floorplanEditMode ? 'Edit ON' : 'Edit';
  }
}

function setFloorplanSelectAllMode(nextMode, { silent = false } = {}) {
  if (!floorplanEditMode) {
    floorplanSelectAllMode = false;
    updateFloorplanSelectAllUi();
    return;
  }
  const floorplan = getSelectedFloorplan();
  if (!floorplan || !(floorplan.nodes || []).length) {
    floorplanSelectAllMode = false;
    updateFloorplanSelectAllUi();
    return;
  }
  floorplanSelectAllMode = Boolean(nextMode);
  if (!silent) {
    updateStatus(floorplanSelectAllMode ? 'All map points selected.' : 'All map points unselected.');
  }
  updateFloorplanColorPaletteUi();
  updateFloorplanDeleteNodeUi();
  updateFloorplanSelectAllUi();
  renderFloorplans();
}

function setFloorplanPlaceMode(nextMode) {
  floorplanPlaceMode = Boolean(nextMode);
  if (floorplanPlaceMode) {
    floorplanEditMode = false;
    floorplanSelectAllMode = false;
  }
  if (floorplanPlaceMode) {
    stopFloorplanPan();
  }
  if (miniMap) {
    miniMap.classList.toggle('floorplan-pan-enabled', !floorplanPlaceMode && miniMap.classList.contains('has-floorplan'));
  }
  updateFloorplanPlaceUi();
  updateFloorplanEditUi();
  updateFloorplanColorPaletteUi();
  updateFloorplanDeleteNodeUi();
  updateFloorplanSelectAllUi();
}

function setFloorplanEditMode(nextMode) {
  floorplanEditMode = Boolean(nextMode);
  if (floorplanEditMode) {
    floorplanPlaceMode = false;
  } else {
    floorplanSelectAllMode = false;
  }
  if (miniMap) {
    miniMap.classList.toggle('floorplan-pan-enabled', !floorplanPlaceMode && miniMap.classList.contains('has-floorplan'));
  }
  updateFloorplanPlaceUi();
  updateFloorplanEditUi();
  updateFloorplanColorPaletteUi();
  updateFloorplanDeleteNodeUi();
  updateFloorplanSelectAllUi();
}

function updateMapWindowBounds() {
  if (!floorplanMapWindowOpen || !mapPanelBody) return;
  const sceneRect = viewerCanvas?.getBoundingClientRect();
  const layoutRect = layoutRoot?.getBoundingClientRect();
  const baseRect = sceneRect || layoutRect;
  if (!baseRect) return;

  // Maximise map: full scene height, only 1/3 of scene width.
  const mapWidth = Math.max(160, Math.round(baseRect.width / 3));
  const leftPx = Math.max(8, Math.round(baseRect.right - mapWidth));
  const topPx = Math.max(8, Math.round(baseRect.top));
  const rightPx = Math.max(8, Math.round(window.innerWidth - (leftPx + mapWidth)));
  const bottomPx = Math.max(8, Math.round(window.innerHeight - baseRect.bottom));

  const setInsetVars = (el) => {
    if (!el) return;
    el.style.setProperty('--map-window-top', `${topPx}px`);
    el.style.setProperty('--map-window-right', `${rightPx}px`);
    el.style.setProperty('--map-window-bottom', `${bottomPx}px`);
    el.style.setProperty('--map-window-left', `${leftPx}px`);
  };
  setInsetVars(mapPanelBody);
  setInsetVars(mapWindowBackdrop);
}

function setFloorplanMapWindowOpen(nextMode) {
  floorplanMapWindowOpen = Boolean(nextMode);
  if (mapPanelBody) {
    mapPanelBody.classList.toggle('map-panel-window', floorplanMapWindowOpen);
    if (!floorplanMapWindowOpen) {
      mapPanelBody.style.removeProperty('--map-window-top');
      mapPanelBody.style.removeProperty('--map-window-right');
      mapPanelBody.style.removeProperty('--map-window-bottom');
      mapPanelBody.style.removeProperty('--map-window-left');
    }
  }
  if (mapWindowBackdrop) {
    mapWindowBackdrop.classList.toggle('visible', floorplanMapWindowOpen);
    mapWindowBackdrop.setAttribute('aria-hidden', floorplanMapWindowOpen ? 'false' : 'true');
    if (!floorplanMapWindowOpen) {
      mapWindowBackdrop.style.removeProperty('--map-window-top');
      mapWindowBackdrop.style.removeProperty('--map-window-right');
      mapWindowBackdrop.style.removeProperty('--map-window-bottom');
      mapWindowBackdrop.style.removeProperty('--map-window-left');
    }
  }
  if (btnFloorplanExpand) {
    btnFloorplanExpand.classList.toggle('active', floorplanMapWindowOpen);
    btnFloorplanExpand.textContent = floorplanMapWindowOpen ? 'Minimise' : 'Maximise';
    btnFloorplanExpand.setAttribute('aria-pressed', floorplanMapWindowOpen ? 'true' : 'false');
  }
  if (floorplanMapWindowOpen) {
    updateMapWindowBounds();
  }
}

function selectScene(sceneId) {
  const scene = state.project?.scenes?.find((item) => item.id === sceneId);
  if (!scene) return;
  clearPendingSceneLinkDraft(false);

  state.selectedGroupId = scene.groupId || state.selectedGroupId;
  state.selectedSceneId = scene.id;
  state.selectedHotspotId = scene.hotspots[0]?.id || null;
  state.selectedFloorplanId = getFloorplanForGroup(state.selectedGroupId)?.id || null;
  state.multiSelectedSceneIds = [scene.id];
  state.sceneSelectionAnchorId = scene.id;

  renderSceneGroupOptions();
  updateSceneTitle();
  renderHotspotList();
  renderContentBlocks();
  renderSceneCommentField();
  renderFloorplans();
  switchEditorScene();

  const sceneButtons = sceneList.querySelectorAll('.scene-item-main');
  const multiSelected = new Set(state.multiSelectedSceneIds || []);
  sceneButtons.forEach((button) => {
    const isCurrent = button.dataset.sceneId === scene.id;
    button.classList.toggle('active', isCurrent);
    button.classList.toggle('multi-selected', multiSelected.has(button.dataset.sceneId));
  });

}

function handleSceneMultiSelectClick(sceneId, event, scenesInGroup) {
  const sceneIds = scenesInGroup.map((scene) => scene.id);
  let selected = new Set((state.multiSelectedSceneIds || []).filter((id) => sceneIds.includes(id)));
  if (!selected.size && state.selectedSceneId && sceneIds.includes(state.selectedSceneId)) {
    selected.add(state.selectedSceneId);
  }

  const withCtrl = Boolean(event.ctrlKey || event.metaKey);
  if (event.shiftKey) {
    const anchor = sceneIds.includes(state.sceneSelectionAnchorId)
      ? state.sceneSelectionAnchorId
      : (sceneIds.includes(state.selectedSceneId) ? state.selectedSceneId : sceneId);
    const anchorIndex = sceneIds.indexOf(anchor);
    const currentIndex = sceneIds.indexOf(sceneId);
    if (anchorIndex !== -1 && currentIndex !== -1) {
      const [start, end] = anchorIndex <= currentIndex
        ? [anchorIndex, currentIndex]
        : [currentIndex, anchorIndex];
      const rangeIds = sceneIds.slice(start, end + 1);
      selected = withCtrl ? new Set([...selected, ...rangeIds]) : new Set(rangeIds);
      state.sceneSelectionAnchorId = anchor;
    }
  } else if (withCtrl) {
    if (selected.has(sceneId)) {
      selected.delete(sceneId);
    } else {
      selected.add(sceneId);
    }
    state.sceneSelectionAnchorId = sceneId;
  }

  state.multiSelectedSceneIds = Array.from(selected);
  renderSceneList();
  renderFloorplans();
  const count = state.multiSelectedSceneIds.length;
  updateStatus(count ? `${count} scene(s) selected.` : 'No scene selected for batch actions.');
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
  updateSceneSortButtons();
  const scenes = getScenesForSelectedGroup();
  const group = getSelectedGroup();
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  state.multiSelectedSceneIds = (state.multiSelectedSceneIds || []).filter((id) => sceneIds.has(id));
  if (!state.multiSelectedSceneIds.length && state.selectedSceneId && sceneIds.has(state.selectedSceneId)) {
    state.multiSelectedSceneIds = [state.selectedSceneId];
  }
  const multiSelected = new Set(state.multiSelectedSceneIds);
  if (btnSetMainScene) {
    btnSetMainScene.disabled = scenes.length === 0;
  }
  if (btnSetOrientation) {
    btnSetOrientation.disabled = !Boolean(getSelectedScene());
  }
  if (btnDeleteSelectedScenes) {
    btnDeleteSelectedScenes.disabled = !Boolean(getSelectedScene());
  }
  scenes.forEach((scene) => {
    const row = document.createElement('div');
    row.className = 'scene-item-row';

    const main = document.createElement('button');
    main.className = `list-item scene-item-main${scene.id === state.selectedSceneId ? ' active' : ''}${multiSelected.has(scene.id) ? ' multi-selected' : ''}`;
    const isMainScene = group?.mainSceneId === scene.id;
    const sceneLabel = getSceneListLabel(scene);
    const mainLabel = state.sceneLabelMode === 'name' && isMainScene
      ? `${sceneLabel || scene.name || ''} (Main)`
      : sceneLabel;
    main.textContent = mainLabel || '\u00A0';
    main.dataset.sceneId = scene.id;
    let clickTimer = null;
    main.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        handleSceneMultiSelectClick(scene.id, event, scenes);
        return;
      }
      // Normal click exits multi-select and keeps only the clicked scene.
      state.multiSelectedSceneIds = [scene.id];
      state.sceneSelectionAnchorId = scene.id;
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

    const tilesIndicator = document.createElement('button');
    const tilesReady = sceneHasGeneratedTiles(scene);
    tilesIndicator.className = `scene-action scene-tile-indicator${tilesReady ? ' tile-ready' : ''}`;
    tilesIndicator.type = 'button';
    tilesIndicator.disabled = true;
    tilesIndicator.title = tilesReady ? 'Tiles created' : 'Tiles not created';
    tilesIndicator.setAttribute('aria-label', tilesReady ? 'Tiles created' : 'Tiles not created');
    tilesIndicator.textContent = 'T';

    row.appendChild(main);
    row.appendChild(tilesIndicator);
    row.appendChild(deleteBtn);
    sceneList.appendChild(row);
  });
}

function renameScene(scene, newValue, mode = 'name') {
  if (mode === 'alias') {
    scene.alias = String(newValue || '').trim();
    renderSceneList();
    scheduleMarkerRender();
    autosave();
    return;
  }
  scene.name = (newValue || '').trim() || 'Untitled Scene';
  if (scene.id === state.selectedSceneId) {
    updateSceneTitle();
  }
  renderSceneList();
  scheduleMarkerRender();
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
  const renameMode = state.sceneLabelMode === 'alias' ? 'alias' : 'name';
  input.value = renameMode === 'alias' ? (scene.alias || '') : (scene.name || '');
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
    renameScene(scene, input.value, renameMode);
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
    viewerCanvas.addEventListener('dblclick', handleViewerDoubleClick);
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
    clearHotspotMarkerElements();
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

  if (!state.project) {
    return;
  }
  const hasPendingLink = Boolean(
    pendingSceneLinkDraft &&
    pendingSceneLinkDraft.sceneId === state.selectedSceneId
  );
  if (!state.selectedHotspotId && placementMode && !hasPendingLink) {
    updateStatus('Select a hotspot first.');
    return;
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

  if (hasPendingLink) {
    updateStatus('Double-click on the panorama to place the new link.');
    return;
  }

  const hotspot = getSelectedLinkHotspot();
  if (!hotspot) {
    updateStatus('Select a link first, then drag it or double-click to move it.');
    return;
  }
  updateStatus('Drag the selected link marker or double-click on panorama to move it.');
}

function handleViewerDoubleClick(event) {
  if (!state.project || !placementMode) return;
  const active = editorScenes.get(state.selectedSceneId);
  if (!active) return;

  const viewPoint = getViewPointFromEvent(event);
  if (!viewPoint) return;
  const coords = active.view.screenToCoordinates(viewPoint, {});
  if (!coords || typeof coords.yaw !== 'number' || typeof coords.pitch !== 'number') return;

  const hasPendingLink = Boolean(
    pendingSceneLinkDraft &&
    pendingSceneLinkDraft.sceneId === state.selectedSceneId
  );

  if (hasPendingLink) {
    commitPendingSceneLinkAt(coords, { statusMessage: 'Link created and placed.' });
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const hotspot = getSelectedLinkHotspot();
  if (!hotspot) {
    updateStatus('Select a link first, then double-click to move it.');
    return;
  }

  hotspot.yaw = coords.yaw;
  hotspot.pitch = coords.pitch;
  autosave();
  scheduleMarkerRender();
  updateStatus(`Link ${hotspot.linkCode || hotspot.title || hotspot.id} moved.`);
  event.preventDefault();
  event.stopPropagation();
}

function commitPendingSceneLinkAt(coords, { statusMessage = 'Link created and placed.' } = {}) {
  const draft = pendingSceneLinkDraft;
  const scene = getSelectedScene();
  if (!draft || !scene || draft.sceneId !== scene.id) return false;
  if (!coords || typeof coords.yaw !== 'number' || typeof coords.pitch !== 'number') return false;

  const hotspot = createHotspotRecord(
    draft.linkCode,
    [{
      type: 'scene',
      sceneId: draft.targetSceneId || '',
      comment: draft.comment || ''
    }],
    {
      linkCode: draft.linkCode,
      linkColorKey: normalizeSceneLinkColorKey(draft.linkColorKey || state.newLinkColorKey)
    }
  );
  hotspot.yaw = coords.yaw;
  hotspot.pitch = coords.pitch;
  scene.hotspots.push(hotspot);
  state.selectedHotspotId = hotspot.id;
  clearPendingSceneLinkDraft(false);
  renderHotspotList();
  renderLinkEditor();
  renderContentBlocks();
  renderFloorplans();
  updateStatus(statusMessage);
  autosave();
  scheduleMarkerRender();
  return true;
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

function getSceneLinkDisplayName(hotspot, targetScene = null) {
  const sceneAlias = String(targetScene?.alias || '').trim();
  if (sceneAlias) return sceneAlias;
  return targetScene?.name || targetScene?.id || 'Unassigned target';
}

function openHotspotPreviewOrFollowLink(hotspotId) {
  const scene = getSelectedScene();
  const hotspot = scene?.hotspots?.find((item) => item.id === hotspotId) || null;
  if (!hotspot) return;
  hideHotspotHoverCard();
  const targetScene = getHotspotSceneLinkTarget(hotspot);
  if (targetScene) {
    selectScene(targetScene.id);
    updateStatus(`Go to "${getSceneLinkDisplayName(hotspot, targetScene)}".`);
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
  const targetSceneName = (targetScene?.name || targetScene?.id || 'Unassigned target').trim();
  return {
    linkName: hotspot.linkCode || hotspot.title || hotspot.id,
    linkColor: getSceneLinkColorHex(hotspot.linkColorKey),
    targetSceneName,
    targetName: getSceneLinkDisplayName(hotspot, targetScene),
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
  hotspotHoverCard.style.setProperty('--hover-link-color', details.linkColor || getSceneLinkColorHex('yellow'));
  const commentHtml = details.comment
    ? `<div class="hover-card-comment">${escapeHtml(details.comment)}</div>`
    : '';
  hotspotHoverCard.innerHTML = `
    <div class="hover-card-title">
      <span class="hover-card-link-code">${escapeHtml(details.linkName)}</span>
      <span class="hover-card-scene-name">${escapeHtml(details.targetSceneName)}</span>
    </div>
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
  if (!viewerCanvas || !state.selectedSceneId || draggingHotspotId) {
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

function clearHotspotMarkerElements() {
  hotspotMarkerElements.forEach((marker) => marker.remove());
  hotspotMarkerElements.clear();
  hotspotMarkerSceneId = null;
  lastMarkerRenderSignature = null;
  if (hotspotOverlay) {
    hotspotOverlay.innerHTML = '';
  }
}

function makeMarkerRenderSignature(scene, active) {
  if (!scene || !active) return '';
  const params = active.view?.parameters ? active.view.parameters() : active.data?.initialViewParameters || {};
  const yaw = Number(params.yaw || 0).toFixed(4);
  const pitch = Number(params.pitch || 0).toFixed(4);
  const fov = Number(params.fov || 1.4).toFixed(4);
  return `${scene.id}|${state.selectedHotspotId || ''}|${yaw}|${pitch}|${fov}`;
}

function buildHotspotMarkerElement(hotspotId) {
  const marker = document.createElement('div');
  marker.className = 'hotspot-marker';
  marker.dataset.hotspotId = hotspotId;
  marker.addEventListener('pointerdown', (event) => startMarkerDrag(event, hotspotId));
  hotspotOverlay.appendChild(marker);
  hotspotMarkerElements.set(hotspotId, marker);
  return marker;
}

function updateHotspotMarkerElement(marker, hotspot, active, scale) {
  const coords = active.view.coordinatesToScreen({ yaw: hotspot.yaw, pitch: hotspot.pitch }, {});
  const viewWidth = active.view.width();
  const viewHeight = active.view.height();
  if (!coords || coords.x === null || coords.y === null || coords.x < 0 || coords.y < 0 || coords.x > viewWidth || coords.y > viewHeight) {
    marker.style.display = 'none';
    return;
  }

  marker.style.display = '';
  const isSceneLink = isSceneLinkHotspot(hotspot);
  marker.className = `hotspot-marker${isSceneLink ? ' scene-link-marker' : ''}${hotspot.id === state.selectedHotspotId ? ' active' : ''}`;
  if (isSceneLink) {
    const linkColor = getSceneLinkColorHex(hotspot.linkColorKey);
    marker.style.setProperty('--scene-link-color', linkColor);
    marker.style.setProperty('--scene-link-border', darkenHex(linkColor, 0.24));
    marker.style.setProperty('--scene-link-ring', withAlpha(linkColor, 0.35));
  } else {
    marker.style.removeProperty('--scene-link-color');
    marker.style.removeProperty('--scene-link-border');
    marker.style.removeProperty('--scene-link-ring');
  }
  marker.style.left = `${coords.x / scale.x}px`;
  marker.style.top = `${coords.y / scale.y - 5}px`;
  const linkTarget = getHotspotSceneLinkTarget(hotspot);
  marker.title = linkTarget ? `Go to "${getSceneLinkDisplayName(hotspot, linkTarget)}"` : (hotspot.title || hotspot.id);
}

function scheduleMarkerRender() {
  if (!hotspotOverlay) return;
  if (markerFrame) return;
  markerFrame = requestAnimationFrame(() => {
    markerFrame = null;
    renderHotspotMarkers(true);
  });
}

function startMarkerLoop() {
  if (markerLoopId) return;
  const loop = () => {
    markerLoopId = requestAnimationFrame(loop);
    renderHotspotMarkers();
  };
  markerLoopId = requestAnimationFrame(loop);
}

function renderHotspotMarkers(force = false) {
  if (!hotspotOverlay) return;
  const scene = getSelectedScene();
  const active = editorScenes.get(state.selectedSceneId);
  if (!scene || !active) {
    clearHotspotMarkerElements();
    return;
  }

  if (hotspotMarkerSceneId !== scene.id) {
    clearHotspotMarkerElements();
    hotspotMarkerSceneId = scene.id;
  }

  const renderSignature = makeMarkerRenderSignature(scene, active);
  if (!force && renderSignature === lastMarkerRenderSignature && !draggingHotspotId) {
    return;
  }
  lastMarkerRenderSignature = renderSignature;

  const scale = getViewScale(active);
  const sceneHotspotIds = new Set((scene.hotspots || []).map((hotspot) => hotspot.id));
  sceneHotspotIds.forEach((hotspotId) => {
    if (!hotspotMarkerElements.has(hotspotId)) {
      buildHotspotMarkerElement(hotspotId);
    }
  });

  hotspotMarkerElements.forEach((marker, hotspotId) => {
    if (!sceneHotspotIds.has(hotspotId)) {
      marker.remove();
      hotspotMarkerElements.delete(hotspotId);
      return;
    }
    const hotspot = scene.hotspots.find((item) => item.id === hotspotId);
    if (!hotspot) return;
    updateHotspotMarkerElement(marker, hotspot, active, scale);
  });
}

function startMarkerDrag(event, hotspotId) {
  if (!placementMode) return;
  if (!event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  if (state.selectedHotspotId !== hotspotId) {
    state.selectedHotspotId = hotspotId;
    renderHotspotList();
    renderLinkEditor();
    renderContentBlocks();
    scheduleMarkerRender();
  }
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
  const draggedId = draggingHotspotId;
  if (draggedId && dragMoved) {
    autosave();
    updateStatus('Hotspot position updated.');
  } else if (draggedId && placementMode) {
    const scene = getSelectedScene();
    const hotspot = scene?.hotspots?.find((item) => item.id === draggedId) || null;
    if (hotspot && isSceneLinkHotspot(hotspot)) {
      state.selectedHotspotId = draggedId;
      renderHotspotList();
      renderLinkEditor();
      renderContentBlocks();
      updateStatus(`Link ${hotspot.linkCode || hotspot.title || hotspot.id} selected.`);
    }
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
      const targetScene = state.project?.scenes?.find((sceneItem) => sceneItem.id === block.sceneId) || null;
      const targetSceneName = getSceneName(block.sceneId || '');
      const p = document.createElement('p');
      const sceneAlias = String(targetScene?.alias || '').trim();
      const targetText = sceneAlias || targetSceneName;
      p.textContent = block.sceneId ? `Go to: ${targetText}` : 'No target scene selected.';
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

function setSectionCollapsed(buttonElement, bodyElement, next) {
  if (!buttonElement || !bodyElement) return;
  const collapsed = Boolean(next);
  bodyElement.classList.toggle('collapsed', collapsed);
  buttonElement.textContent = collapsed ? 'Show' : 'Hide';
  buttonElement.setAttribute('aria-expanded', String(!collapsed));
}

function toggleSection(buttonElement, bodyElement) {
  if (!buttonElement || !bodyElement) return;
  const isCollapsed = bodyElement.classList.contains('collapsed');
  setSectionCollapsed(buttonElement, bodyElement, !isCollapsed);
}

function setLinksPanelCollapsed(next) {
  setSectionCollapsed(btnToggleLinksPanel, linksPanelBody, next);
}

function openDeleteLinksScopeModal() {
  if (!deleteLinksScopeModal) return;
  deleteLinksScopeModal.classList.add('visible');
  deleteLinksScopeModal.setAttribute('aria-hidden', 'false');
}

function closeDeleteLinksScopeModal() {
  if (!deleteLinksScopeModal) return;
  deleteLinksScopeModal.classList.remove('visible');
  deleteLinksScopeModal.setAttribute('aria-hidden', 'true');
}

function resolveDeleteLinksScope(value) {
  if (!deleteLinksScopeResolver) return;
  const resolver = deleteLinksScopeResolver;
  deleteLinksScopeResolver = null;
  closeDeleteLinksScopeModal();
  resolver(value);
}

function askDeleteLinksScope() {
  if (!deleteLinksScopeModal || !btnDeleteLinksScene || !btnDeleteLinksGroup || !btnDeleteLinksCancel) {
    const scopeInput = prompt('Type "scene" to delete all links in the current scene, or "group" to delete all links in the current group.');
    if (scopeInput === null) return Promise.resolve(null);
    const scope = String(scopeInput).trim().toLowerCase();
    if (scope !== 'scene' && scope !== 'group') return Promise.resolve('__invalid__');
    return Promise.resolve(scope);
  }
  return new Promise((resolve) => {
    deleteLinksScopeResolver = resolve;
    openDeleteLinksScopeModal();
  });
}

function updatePlacementButtonLabel() {
  if (!btnTogglePlacement) return;
  btnTogglePlacement.textContent = placementMode ? 'Done' : 'Edit';
}

function clearPendingSceneLinkDraft(shouldRender = true) {
  pendingSceneLinkDraft = null;
  if (!shouldRender) return;
  renderHotspotList();
  renderLinkEditor();
  renderContentBlocks();
  scheduleMarkerRender();
}

function togglePlacementMode() {
  const wasPlacementMode = placementMode;
  const hadPendingBeforeToggle = Boolean(pendingSceneLinkDraft);
  placementMode = !placementMode;
  btnTogglePlacement.classList.toggle('active', placementMode);
  updatePlacementButtonLabel();
  if (wasPlacementMode && !placementMode && hadPendingBeforeToggle) {
    clearPendingSceneLinkDraft(true);
  }
  renderLinkEditor();
  viewerCanvas.classList.toggle('placement-mode', placementMode);
  if (placementMode) {
    hideHotspotHoverCard();
  }
  updateStatus(
    placementMode
      ? 'Edit mode enabled. Drag links or double-click panorama to place/move links.'
      : (hadPendingBeforeToggle ? 'Pending link cancelled.' : 'Edit mode disabled.')
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
    if (marker.style.display === 'none') return;
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
  const pendingForScene = pendingSceneLinkDraft && pendingSceneLinkDraft.sceneId === scene.id
    ? pendingSceneLinkDraft
    : null;

  if (linkSelect) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = linkHotspots.length ? 'Select link' : 'No links in this scene';
    linkSelect.appendChild(placeholder);

    if (pendingForScene) {
      const pendingOption = document.createElement('option');
      pendingOption.value = '__pending__';
      pendingOption.textContent = `${pendingForScene.linkCode} (new)`;
      pendingOption.selected = true;
      linkSelect.appendChild(pendingOption);
    }

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
    if (!selectedIsLink && !pendingForScene) {
      linkSelect.value = '';
    }
    linkSelect.disabled = linkHotspots.length === 0 && !pendingForScene;
  }
  if (btnDeleteSceneLink) {
    btnDeleteSceneLink.disabled = linkHotspots.length === 0;
  }
  if (btnRemoveAllLinks) {
    btnRemoveAllLinks.disabled = linkHotspots.length === 0;
  }

  scheduleMarkerRender();
}

function renderFloorplans() {
  stopFloorplanPan();
  const group = getSelectedGroup();
  const setFloorplanControlsState = ({ hasFloorplan = false, hasSceneSelection = false } = {}) => {
    if (btnFloorplanPlaceScene) btnFloorplanPlaceScene.disabled = !hasFloorplan || !hasSceneSelection;
    if (btnFloorplanEdit) btnFloorplanEdit.disabled = !hasFloorplan;
    if (btnFloorplanSelectAll) btnFloorplanSelectAll.disabled = true;
    if (btnFloorplanDeleteNode) btnFloorplanDeleteNode.disabled = true;
    if (btnFloorplanToggleLabels) btnFloorplanToggleLabels.disabled = !hasFloorplan;
    if (btnFloorplanZoomReset) btnFloorplanZoomReset.disabled = !hasFloorplan;
  };
  if (!group) {
    miniMap.classList.remove('has-floorplan');
    miniMap.classList.remove('floorplan-pan-enabled');
    miniMap.innerHTML = '<div class="mini-map-placeholder"></div>';
    setFloorplanControlsState();
    setFloorplanPlaceMode(false);
    setFloorplanEditMode(false);
    updateFloorplanColorPaletteUi();
    return;
  }

  const selected = getSelectedFloorplan();
  const hasSceneSelection = Boolean(getSelectedScene());
  state.selectedFloorplanId = selected?.id || null;
  miniMap.innerHTML = '';
  if (!selected) {
    miniMap.classList.remove('has-floorplan');
    miniMap.classList.remove('floorplan-pan-enabled');
    miniMap.innerHTML = '<div class="mini-map-placeholder"></div>';
    setFloorplanControlsState();
    setFloorplanPlaceMode(false);
    setFloorplanEditMode(false);
    updateFloorplanColorPaletteUi();
  } else {
  miniMap.classList.add('has-floorplan');
  miniMap.classList.toggle('floorplan-pan-enabled', !floorplanPlaceMode);
  setFloorplanControlsState({ hasFloorplan: true, hasSceneSelection });
  if (!hasSceneSelection) {
    setFloorplanPlaceMode(false);
  }
  const canvas = document.createElement('div');
  canvas.className = 'floorplan-canvas';
  canvas.style.setProperty('--floorplan-zoom', String(getFloorplanZoom(group.id)));

  const img = document.createElement('img');
  img.className = 'floorplan-image';
  img.alt = selected?.name || 'Floorplan';
  img.src = selected?.dataUrl || selected?.path || '';
  canvas.appendChild(img);

  const nodes = selected?.nodes || [];
  const selectedSceneIds = new Set(
    (state.multiSelectedSceneIds || []).filter((sceneId) =>
      (state.project?.scenes || []).some((scene) => scene.id === sceneId && scene.groupId === group.id)
    )
  );
  if (!selectedSceneIds.size && state.selectedSceneId) {
    selectedSceneIds.add(state.selectedSceneId);
  }
  nodes.forEach((node, index) => {
    const dot = document.createElement('div');
    const isActive = floorplanSelectAllMode || selectedSceneIds.has(node.sceneId);
    dot.className = `floorplan-node${isActive ? ' active' : ''}`;
    dot.style.left = `${node.x * 100}%`;
    dot.style.top = `${node.y * 100}%`;
    dot.dataset.index = String(index);
    applyFloorplanNodeColorStyles(dot, node.colorKey || selected.markerColorKey);

    const label = document.createElement('div');
    label.className = 'floorplan-label';
    if (floorplanShowLabels) {
      label.classList.add('visible');
    }
    label.textContent = getSceneName(node.sceneId);
    dot.appendChild(label);

    dot.addEventListener('mousedown', (event) => startDrag(event, index));
    dot.addEventListener('click', (event) => {
      event.stopPropagation();
      if (floorplanSelectAllMode) {
        floorplanSelectAllMode = false;
      }
      if (state.selectedSceneId !== node.sceneId) {
        selectScene(node.sceneId);
      } else {
        renderFloorplans();
      }
    });
    dot.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (!floorplanEditMode) {
        updateStatus('Enable Edit to modify map points.');
        return;
      }
      removeFloorplanNode(index);
    });
    canvas.appendChild(dot);
  });

  canvas.addEventListener('click', (event) => {
    if (!floorplanPlaceMode) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    addFloorplanNode(x, y);
  });
  canvas.addEventListener('wheel', (event) => zoomFloorplanAt(event, group.id), { passive: false });
  canvas.addEventListener('mousedown', startFloorplanPan);

  miniMap.appendChild(canvas);
  }
  updateFloorplanLabelToggleUi();
  updateFloorplanColorPaletteUi();
  updateFloorplanDeleteNodeUi();
  updateFloorplanSelectAllUi();
}

function addFloorplanNode(x, y) {
  const scene = getSelectedScene();
  const floorplan = getSelectedFloorplan();
  if (!scene || !floorplan) return;
  if (scene.groupId !== floorplan.groupId) return;

  const existing = floorplan.nodes.find((node) => node.sceneId === scene.id);
  if (existing) {
    updateStatus(`Scene "${scene.name}" is already on the map.`);
    return;
  }
  const selectedColor = normalizeFloorplanColorKey(
    floorplanColorSelect?.value || floorplan.markerColorKey || 'yellow'
  );
  floorplan.nodes.push({ sceneId: scene.id, x, y, rotation: 0, colorKey: selectedColor });

  renderFloorplans();
  updateStatus(`Scene "${scene.name}" placed on map.`);
  autosave();
}

function removeFloorplanNode(index) {
  const floorplan = getSelectedFloorplan();
  if (!floorplan) return;
  floorplan.nodes.splice(index, 1);
  renderFloorplans();
  autosave();
}

function deleteSelectedFloorplanNode() {
  if (!floorplanEditMode) {
    updateStatus('Enable Edit to delete map points.');
    return;
  }
  const floorplan = getSelectedFloorplan();
  if (!floorplan) return;
  if (floorplanSelectAllMode) {
    const total = (floorplan.nodes || []).length;
    if (!total) {
      updateStatus('No map points to delete.');
      return;
    }
    floorplan.nodes = [];
    floorplanSelectAllMode = false;
    renderFloorplans();
    updateStatus(`Deleted ${total} map point(s).`);
    autosave();
    return;
  }
  const scene = getSelectedScene();
  if (!scene) return;
  const index = (floorplan.nodes || []).findIndex((node) => node.sceneId === scene.id);
  if (index === -1) {
    updateStatus('Selected scene is not placed on the map.');
    return;
  }
  floorplan.nodes.splice(index, 1);
  renderFloorplans();
  updateStatus(`Map point removed for scene "${scene.name}".`);
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
  if (!floorplanEditMode) {
    return;
  }
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
    alias: '',
    comment: '',
    levels: [{ tileSize: 256, size: 256, fallbackOnly: true }],
    faceSize: 2048,
    initialViewParameters: { yaw: 0, pitch: 0, fov: getSelectedSceneFov() },
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

function normalizeGroupName(name) {
  return String(name || '').trim().toLowerCase();
}

function hasDuplicateGroupName(nextName, currentGroupId = null) {
  const normalized = normalizeGroupName(nextName);
  if (!normalized) return false;
  return (state.project?.groups || []).some((group) =>
    group.id !== currentGroupId && normalizeGroupName(group.name) === normalized
  );
}

function addGroup() {
  const name = prompt('Group name');
  if (!name) return;
  const trimmedName = name.trim() || 'New Group';
  if (hasDuplicateGroupName(trimmedName)) {
    alert(`Group name "${trimmedName}" already exists. Choose a different name.`);
    updateStatus(`Group not created: "${trimmedName}" already exists.`);
    return;
  }
  const group = {
    id: `group-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    name: trimmedName,
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
  const trimmedName = nextName.trim() || 'Untitled Group';
  if (hasDuplicateGroupName(trimmedName, group.id)) {
    alert(`Group name "${trimmedName}" already exists. Choose a different name.`);
    updateStatus(`Rename cancelled: "${trimmedName}" already exists.`);
    return;
  }
  group.name = trimmedName;
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
  const deletedSceneIds = new Set(scenesToDelete.map((scene) => scene.id));
  const floorplansForGroup = (state.project.minimap.floorplans || []).filter((fp) => fp.groupId === group.id);
  const mapCount = floorplansForGroup.length;
  const mapNodeCount = floorplansForGroup.reduce((total, fp) => total + ((fp.nodes || []).length), 0);
  let inboundSceneLinkCount = 0;
  (state.project.scenes || []).forEach((scene) => {
    if (scene.groupId === group.id) return;
    (scene.hotspots || []).forEach((hotspot) => {
      (hotspot.contentBlocks || []).forEach((block) => {
        if (block.type === 'scene' && deletedSceneIds.has(block.sceneId)) {
          inboundSceneLinkCount += 1;
        }
      });
    });
  });

  const warningLines = [
    `Delete group "${group.name}"?`,
    '',
    'This action will:',
    `- Delete ${sceneCount} image/scene(s) in this group`,
    mapCount ? `- Delete ${mapCount} map file(s) linked to this group` : '- No map file linked to this group',
    mapNodeCount ? `- Remove ${mapNodeCount} map point(s)` : '- No map points to remove',
    inboundSceneLinkCount
      ? `- Remove ${inboundSceneLinkCount} scene-link reference(s) from other groups/scenes`
      : '- No incoming scene-link references from other groups/scenes',
    '',
    'This cannot be undone.'
  ];
  const confirmed = window.confirm(warningLines.join('\n'));
  if (!confirmed) return;

  scenesToDelete.forEach((scene) => {
    generatedTiles.delete(scene.id);
    editorScenes.delete(scene.id);
  });
  if (pendingSceneLinkDraft && deletedSceneIds.has(pendingSceneLinkDraft.sceneId)) {
    clearPendingSceneLinkDraft(false);
  }
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
  if (pendingSceneLinkDraft?.sceneId === removed?.id) {
    clearPendingSceneLinkDraft(false);
  }
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

function deleteSelectedScenes() {
  if (!state.project?.scenes?.length) {
    updateStatus('No scenes available.');
    return;
  }

  const selectedIds = new Set(
    (state.multiSelectedSceneIds || [])
      .filter(Boolean)
      .filter((sceneId) => state.project.scenes.some((scene) => scene.id === sceneId))
  );
  if (!selectedIds.size && state.selectedSceneId) {
    selectedIds.add(state.selectedSceneId);
  }
  if (!selectedIds.size) {
    updateStatus('Select at least one scene.');
    return;
  }

  const scenesToDelete = (state.project.scenes || []).filter((scene) => selectedIds.has(scene.id));
  if (!scenesToDelete.length) {
    updateStatus('Select at least one scene.');
    return;
  }

  const deletedSceneIds = new Set(scenesToDelete.map((scene) => scene.id));
  const confirmed = window.confirm(
    `Delete ${scenesToDelete.length} selected scene(s)? This removes their tiles and map points, and clears links targeting them. This cannot be undone.`
  );
  if (!confirmed) return;

  if (pendingSceneLinkDraft && deletedSceneIds.has(pendingSceneLinkDraft.sceneId)) {
    clearPendingSceneLinkDraft(false);
  }

  scenesToDelete.forEach((scene) => {
    generatedTiles.delete(scene.id);
    editorScenes.delete(scene.id);
  });

  state.project.scenes = (state.project.scenes || []).filter((scene) => !deletedSceneIds.has(scene.id));
  clearSceneTargetReferences(deletedSceneIds);

  (state.project?.minimap?.floorplans || []).forEach((floorplan) => {
    floorplan.nodes = (floorplan.nodes || []).filter((node) => !deletedSceneIds.has(node.sceneId));
  });

  const affectedGroups = new Set(scenesToDelete.map((scene) => scene.groupId).filter(Boolean));
  affectedGroups.forEach((groupId) => ensureMainSceneForGroup(groupId));

  const fallbackScene =
    getPreferredSceneForGroup(state.selectedGroupId) ||
    state.project.scenes[0] ||
    null;
  state.selectedSceneId = fallbackScene?.id || null;
  state.selectedHotspotId = fallbackScene?.hotspots?.[0]?.id || null;
  state.multiSelectedSceneIds = state.selectedSceneId ? [state.selectedSceneId] : [];
  state.sceneSelectionAnchorId = state.selectedSceneId || null;

  renderAll();
  updateStatus(`Deleted ${scenesToDelete.length} selected scene(s).`);
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
  const group = getSelectedGroup();
  if (!group) {
    updateStatus('Select a group first.');
    return;
  }

  const scenesInGroup = (state.project?.scenes || []).filter((scene) => scene.groupId === group.id);
  const total = scenesInGroup.length;
  if (!total) {
    updateStatus(`No images to delete in "${group.name}".`);
    return;
  }
  const confirmed = window.confirm(`Delete all ${total} image(s) in group "${group.name}"? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  const deletedSceneIds = new Set(scenesInGroup.map((scene) => scene.id));
  if (pendingSceneLinkDraft && deletedSceneIds.has(pendingSceneLinkDraft.sceneId)) {
    clearPendingSceneLinkDraft(false);
  }

  state.project.scenes = (state.project.scenes || []).filter((scene) => !deletedSceneIds.has(scene.id));
  clearSceneTargetReferences(deletedSceneIds);

  scenesInGroup.forEach((scene) => {
    generatedTiles.delete(scene.id);
    editorScenes.delete(scene.id);
  });

  const floorplans = (state.project?.minimap?.floorplans || []).filter((floorplan) => floorplan.groupId === group.id);
  floorplans.forEach((floorplan) => {
    floorplan.nodes = (floorplan.nodes || []).filter((node) => !deletedSceneIds.has(node.sceneId));
  });

  group.mainSceneId = null;
  ensureMainSceneForGroup(group.id);

  const fallbackScene = getPreferredSceneForGroup(group.id);
  state.selectedSceneId = fallbackScene?.id || null;
  state.selectedHotspotId = fallbackScene?.hotspots?.[0]?.id || null;
  state.multiSelectedSceneIds = state.selectedSceneId ? [state.selectedSceneId] : [];
  state.sceneSelectionAnchorId = state.selectedSceneId || null;

  renderAll();
  updateStatus(`Deleted ${total} image(s) from group "${group.name}".`);
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
    title: title || 'Hotspot',
    contentBlocks: contentBlocks || [],
    ...(extra || {})
  };
}

function getDefaultLinkTargetSceneId(currentScene) {
  if (!currentScene) return '';
  const options = getLinkTargetSceneOptions(currentScene.id);
  return options[0]?.id || '';
}

function normalizeLinkCode(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return String(parsed).padStart(4, '0');
}

function ensureUniqueSceneLinkCodes() {
  if (!state.project) return 0;
  const used = new Set();
  let next = 1;
  let changes = 0;

  const reserve = (code) => {
    used.add(code);
    const numeric = Number.parseInt(code, 10);
    if (Number.isFinite(numeric) && numeric >= next) {
      next = numeric + 1;
    }
  };

  (state.project.scenes || []).forEach((scene) => {
    (scene.hotspots || []).forEach((hotspot) => {
      if (!isSceneLinkHotspot(hotspot)) return;

      let code = normalizeLinkCode(hotspot.linkCode || hotspot.title);
      if (!code || used.has(code)) {
        while (used.has(String(next).padStart(4, '0'))) {
          next += 1;
        }
        code = String(next).padStart(4, '0');
        next += 1;
        changes += 1;
      }

      reserve(code);
      if (hotspot.linkCode !== code) {
        hotspot.linkCode = code;
        changes += 1;
      }
      if (hotspot.title !== code) {
        hotspot.title = code;
        changes += 1;
      }
    });
  });

  return changes;
}

function getNextSceneLinkCode() {
  ensureUniqueSceneLinkCodes();
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

  if (pendingSceneLinkDraft && pendingSceneLinkDraft.sceneId !== scene.id) {
    clearPendingSceneLinkDraft(false);
  }

  if (pendingSceneLinkDraft && pendingSceneLinkDraft.sceneId === scene.id) {
    renderHotspotList();
    renderLinkEditor();
    updateStatus(`Link ${pendingSceneLinkDraft.linkCode} is not placed yet. Double-click to place it first, or press Done to cancel.`);
    return;
  }

  const targetSceneId = getDefaultLinkTargetSceneId(scene);
  const linkCode = getNextSceneLinkCode();
  pendingSceneLinkDraft = {
    sceneId: scene.id,
    linkCode,
    targetSceneId,
    comment: '',
    linkColorKey: normalizeSceneLinkColorKey(state.newLinkColorKey)
  };
  state.selectedHotspotId = null;

  if (!placementMode) {
    togglePlacementMode();
  }
  renderHotspotList();
  renderLinkEditor();
  renderContentBlocks();
  updateStatus(`New link ${linkCode} ready. Double-click on the panorama to place it. Press Done to cancel.`);
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

async function removeAllSceneLinksForCurrentScene() {
  const scope = await askDeleteLinksScope();
  if (scope === null) {
    updateStatus('Delete All cancelled.');
    return;
  }
  if (scope !== 'scene' && scope !== 'group') {
    updateStatus('Invalid choice. Type exactly "scene" or "group".');
    return;
  }

  const removeLinksFromScene = (scene) => {
    if (!scene) return 0;
    const before = (scene.hotspots || []).length;
    scene.hotspots = (scene.hotspots || []).filter((hotspot) => !isSceneLinkHotspot(hotspot));
    return before - scene.hotspots.length;
  };

  if (scope === 'scene') {
    const scene = getSelectedScene();
    if (!scene) {
      updateStatus('Select a scene first.');
      return;
    }
    if (pendingSceneLinkDraft?.sceneId === scene.id) {
      clearPendingSceneLinkDraft(false);
    }
    const removed = removeLinksFromScene(scene);
    if (!removed) {
      updateStatus('No links to remove in current scene.');
      return;
    }
    state.selectedHotspotId = scene.hotspots[0]?.id || null;
    renderAll();
    updateStatus(`Removed ${removed} link(s) from current scene.`);
    autosave();
    return;
  }

  const groupId = state.selectedGroupId;
  if (!groupId) {
    updateStatus('Select a group first.');
    return;
  }
  const groupScenes = (state.project?.scenes || []).filter((scene) => scene.groupId === groupId);
  if (!groupScenes.length) {
    updateStatus('No scenes in current group.');
    return;
  }
  const existingLinksInGroup = groupScenes.reduce((total, scene) => {
    return total + getSceneLinkHotspots(scene).length;
  }, 0);
  if (!existingLinksInGroup) {
    updateStatus('No links to remove in current group.');
    return;
  }
  const confirmDeleteGroupLinks = window.confirm(
    `Delete all ${existingLinksInGroup} link(s) in current group? This cannot be undone.`
  );
  if (!confirmDeleteGroupLinks) {
    updateStatus('Delete All cancelled.');
    return;
  }
  if (pendingSceneLinkDraft) {
    const pendingScene = state.project?.scenes?.find((scene) => scene.id === pendingSceneLinkDraft.sceneId);
    if (pendingScene?.groupId === groupId) {
      clearPendingSceneLinkDraft(false);
    }
  }

  let removed = 0;
  groupScenes.forEach((scene) => {
    removed += removeLinksFromScene(scene);
  });

  if (!removed) {
    updateStatus('No links to remove in current group.');
    return;
  }

  const selectedScene = getSelectedScene();
  state.selectedHotspotId = selectedScene?.hotspots?.[0]?.id || null;
  renderAll();
  updateStatus(`Removed ${removed} link(s) from current group.`);
  autosave();
}

function removeBlock(index) {
  const hotspot = getSelectedHotspot();
  if (!hotspot) return;
  hotspot.contentBlocks.splice(index, 1);
  renderContentBlocks();
}

function clampFov(value) {
  return Math.max(0.1, Math.min(Math.PI - 0.01, value));
}

function getSelectedSceneFov() {
  const scene = getSelectedScene();
  const sceneValue = Number(scene?.initialViewParameters?.fov);
  if (Number.isFinite(sceneValue)) {
    return clampFov(sceneValue);
  }
  const inputValue = Number(projectFovInput?.value);
  if (Number.isFinite(inputValue)) {
    return clampFov(inputValue);
  }
  return 1.4;
}

function applySelectedSceneFov(fov) {
  const scene = getSelectedScene();
  if (!scene) return;
  const safeFov = clampFov(fov);

  scene.initialViewParameters = {
    yaw: Number(scene.initialViewParameters?.yaw) || 0,
    pitch: Number(scene.initialViewParameters?.pitch) || 0,
    fov: safeFov
  };
  const sceneEntry = editorScenes.get(scene.id);
  if (sceneEntry?.data) {
    sceneEntry.data.initialViewParameters = { ...scene.initialViewParameters };
  }

  const active = editorScenes.get(scene.id);
  if (active?.view) {
    const current = active.view.parameters ? active.view.parameters() : active.data?.initialViewParameters;
    active.view.setParameters({
      yaw: Number(current?.yaw) || 0,
      pitch: Number(current?.pitch) || 0,
      fov: safeFov
    });
    scheduleMarkerRender();
  }
}

function updateProjectFov(value, { commit = false } = {}) {
  const scene = getSelectedScene();
  if (!scene) return;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    if (commit && projectFovInput) {
      projectFovInput.value = String(Number(getSelectedSceneFov().toFixed(2)));
    }
    return;
  }

  const safeFov = clampFov(parsed);
  applySelectedSceneFov(safeFov);

  if (commit && projectFovInput) {
    projectFovInput.value = String(Number(safeFov.toFixed(2)));
    updateStatus(`Scene FOV set to ${safeFov.toFixed(2)}.`);
    autosave();
  }
}

function updateProjectName(value) {
  if (!state.project) return;
  state.project.project.name = value;
  autosave();
}

function createResetProjectPayload() {
  const now = new Date().toISOString();
  const source = state.project || fallbackProject;
  return {
    project: {
      name: source?.project?.name || 'Sample Tour',
      version: source?.project?.version || '1.0',
      createdAt: source?.project?.createdAt || now,
      updatedAt: now
    },
    settings: {
      ...(source?.settings || fallbackProject.settings || {})
    },
    groups: [
      {
        id: `group-${Date.now()}`,
        name: 'Main Group',
        mainSceneId: null
      }
    ],
    scenes: [],
    assets: {
      media: []
    },
    minimap: {
      enabled: false,
      image: '',
      nodes: [],
      floorplans: []
    }
  };
}

function resetProjectWithConfirmation() {
  if (!state.project) return;
  const warningMessage = [
    'Project reset will permanently remove:',
    '- all scenes and groups content',
    '- all generated tiles',
    '- all hotspots and links',
    '- all map/floorplan data',
    '- all uploaded media',
    '',
    'Type "reset" to continue:'
  ].join('\n');
  const input = window.prompt(warningMessage);
  if (input === null) {
    updateStatus('Project reset cancelled.');
    return;
  }
  if (String(input).trim().toLowerCase() !== 'reset') {
    updateStatus('Project reset aborted (confirmation word mismatch).');
    return;
  }

  if (tilerWorker && activeTilingRequestId) {
    tilerWorker.postMessage({ type: 'cancel', requestId: activeTilingRequestId });
    activeTilingRequestId = null;
    tilingPaused = false;
    showProgress(0, true);
  }

  generatedTiles.clear();
  editorScenes.clear();
  clearPendingSceneLinkDraft(false);
  clearHotspotMarkerElements();
  hideHotspotHoverCard();

  const payload = createResetProjectPayload();
  loadProject(payload);
  autosave();
  updateStatus('Project reset complete.');
}

function handleResize() {
  if (editorViewer) {
    editorViewer.updateSize();
  }
  if (floorplanMapWindowOpen) {
    updateMapWindowBounds();
  }
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
      nodes: existing?.nodes || [],
      markerColorKey: normalizeFloorplanColorKey(existing?.markerColorKey || 'yellow')
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
  const confirmed = window.confirm(`Delete map for group "${group.name}"?`);
  if (!confirmed) {
    updateStatus('Map delete cancelled.');
    return;
  }
  floorplans.splice(index, 1);
  state.selectedFloorplanId = null;
  renderFloorplans();
  updateStatus(`Map deleted for group "${group.name}".`);
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

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function computeFileHash(file) {
  try {
    if (!window.crypto?.subtle) return '';
    const buffer = await readFileAsArrayBuffer(file);
    const digest = await window.crypto.subtle.digest('SHA-256', buffer);
    const bytes = new Uint8Array(digest);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.warn('Hash generation failed:', error);
    return '';
  }
}

function readImageMetadata(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

function isDuplicatePanoramaInGroup(groupId, dataUrl, hash) {
  const scenes = (state.project?.scenes || []).filter((scene) => scene.groupId === groupId);
  return scenes.some((scene) => {
    const source = scene.sourceImage;
    if (!source) return false;
    if (hash && source.hash && source.hash === hash) return true;
    if (dataUrl && source.dataUrl && source.dataUrl === dataUrl) return true;
    return false;
  });
}

function normalizePanoramaFileName(name) {
  return String(name || '').trim().toLowerCase();
}

function getDuplicateMatchesInOtherGroups(groupId, { dataUrl = '', hash = '', fileName = '' } = {}) {
  const normalizedFileName = normalizePanoramaFileName(fileName);
  const scenes = state.project?.scenes || [];
  let matches = [];

  if (hash) {
    matches = scenes.filter((scene) =>
      scene?.sourceImage &&
      scene.groupId !== groupId &&
      String(scene.sourceImage.hash || '').trim() === hash
    );
  }
  if (!matches.length && dataUrl) {
    matches = scenes.filter((scene) =>
      scene?.sourceImage &&
      scene.groupId !== groupId &&
      scene.sourceImage.dataUrl &&
      scene.sourceImage.dataUrl === dataUrl
    );
  }
  if (!matches.length && normalizedFileName) {
    matches = scenes.filter((scene) =>
      scene?.sourceImage &&
      scene.groupId !== groupId &&
      normalizePanoramaFileName(scene.sourceImage.name) === normalizedFileName
    );
  }

  const uniqueByScene = new Map();
  matches.forEach((scene) => {
    const group = getGroupById(scene.groupId);
    uniqueByScene.set(scene.id, {
      sceneId: scene.id,
      sceneName: scene.name || scene.id,
      groupId: scene.groupId,
      groupName: group?.name || scene.groupId || 'Unknown Group'
    });
  });
  return Array.from(uniqueByScene.values());
}

function findDuplicatePanoramaInOtherGroups(groupId, dataUrl, hash, fileName = '') {
  const matches = getDuplicateMatchesInOtherGroups(groupId, { dataUrl, hash, fileName });
  return matches[0] || null;
}

async function precomputeCrossGroupDuplicates(fileList, groupId) {
  const duplicateByFile = new Map();
  const hashByFile = new Map();
  const dataUrlByFile = new Map();
  const entries = [];

  for (const file of fileList) {
    const hash = await computeFileHash(file);
    if (hash) {
      hashByFile.set(file, hash);
    }

    let matches = getDuplicateMatchesInOtherGroups(groupId, { hash, fileName: file.name });
    let dataUrl = '';
    if (!matches.length) {
      dataUrl = await readFileAsDataUrl(file);
      dataUrlByFile.set(file, dataUrl);
      matches = getDuplicateMatchesInOtherGroups(groupId, { dataUrl, hash, fileName: file.name });
    }

    if (!matches.length) continue;
    duplicateByFile.set(file, matches);
    entries.push({
      fileName: file.name,
      matches
    });
  }

  return {
    entries,
    totalDuplicates: entries.length,
    skipAll: false,
    proceedAll: false,
    duplicateByFile,
    hashByFile,
    dataUrlByFile
  };
}

function formatDuplicatePanoramaList(entries = []) {
  return entries.map((entry, index) => ({
    index: index + 1,
    fileName: entry.fileName || 'Unknown file',
    matches: (entry.matches || []).map((match) => ({
      groupName: match.groupName || match.groupId || 'Unknown group',
      sceneName: match.sceneName || match.sceneId || 'Unknown scene'
    }))
  }));
}

function getDuplicateGroupSummary(entries = []) {
  const groupToFiles = new Map();
  entries.forEach((entry) => {
    const fileKey = String(entry.fileName || '').trim();
    const seenGroups = new Set();
    (entry.matches || []).forEach((match) => {
      const groupName = String(match.groupName || match.groupId || 'Unknown Group').trim();
      if (!groupName || seenGroups.has(groupName)) return;
      seenGroups.add(groupName);
      if (!groupToFiles.has(groupName)) {
        groupToFiles.set(groupName, new Set());
      }
      groupToFiles.get(groupName).add(fileKey);
    });
  });
  return Array.from(groupToFiles.entries())
    .map(([groupName, files]) => ({ groupName, count: files.size }))
    .sort((a, b) => b.count - a.count || a.groupName.localeCompare(b.groupName, undefined, { sensitivity: 'base' }));
}

function openDuplicatePanoramaListModal(entries = []) {
  if (!duplicatePanoramaListModal || !duplicatePanoramaListBody) return;
  const rows = formatDuplicatePanoramaList(entries);
  const groupSummary = getDuplicateGroupSummary(entries);
  const summaryHtml = groupSummary.length
    ? `
      <div class="duplicate-list-item">
        <div class="duplicate-file">Groups summary</div>
        ${groupSummary.map((item) => `<div>${escapeHtml(item.groupName)}: ${item.count}</div>`).join('')}
      </div>
    `
    : '';
  if (!rows.length) {
    duplicatePanoramaListBody.innerHTML = '<div class="panel-hint">No duplicate images found.</div>';
  } else {
    duplicatePanoramaListBody.innerHTML = `
      <div class="duplicate-list">
        ${summaryHtml}
        ${rows.map((row) => `
          <div class="duplicate-list-item">
            <div class="duplicate-file">${row.index}. ${escapeHtml(row.fileName)}</div>
            ${row.matches.map((match) => `
              <div>Group: ${escapeHtml(match.groupName)}</div>
              <div>Scene: ${escapeHtml(match.sceneName)}</div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }
  duplicatePanoramaListModal.classList.add('visible');
  duplicatePanoramaListModal.setAttribute('aria-hidden', 'false');
}

function closeDuplicatePanoramaListModal() {
  if (!duplicatePanoramaListModal) return;
  duplicatePanoramaListModal.classList.remove('visible');
  duplicatePanoramaListModal.setAttribute('aria-hidden', 'true');
}

function openDuplicatePanoramaModal(fileName, duplicateInfo, context = null) {
  if (!duplicatePanoramaModal || !duplicatePanoramaMessage) return;
  const sceneName = duplicateInfo?.sceneName || duplicateInfo?.sceneId || 'Unknown Scene';
  const groupName = duplicateInfo?.groupName || duplicateInfo?.groupId || 'Unknown Group';
  const duplicateCount = Math.max(1, Number(context?.totalDuplicates) || context?.entries?.length || 1);
  const groupSummary = getDuplicateGroupSummary(context?.entries || []);
  const groupSummaryLines = groupSummary.length
    ? ['Groups involved:', ...groupSummary.map((item) => `- ${item.groupName}: ${item.count}`), '']
    : [];
  duplicatePanoramaMessage.textContent = [
    `${duplicateCount} Image(s) already exist in other groups.`,
    '',
    ...groupSummaryLines,
    `Current file: "${fileName}"`,
    `Group: ${groupName}`,
    `Scene: ${sceneName}`,
    '',
    'Choose what to do:'
  ].join('\n');
  duplicatePanoramaListEntries = Array.isArray(context?.entries) ? [...context.entries] : [];
  duplicatePanoramaModal.classList.add('visible');
  duplicatePanoramaModal.setAttribute('aria-hidden', 'false');
}

function closeDuplicatePanoramaModal() {
  if (!duplicatePanoramaModal) return;
  duplicatePanoramaModal.classList.remove('visible');
  duplicatePanoramaModal.setAttribute('aria-hidden', 'true');
  closeDuplicatePanoramaListModal();
}

function resolveDuplicatePanoramaChoice(choice) {
  if (!duplicatePanoramaResolver) return;
  const resolver = duplicatePanoramaResolver;
  duplicatePanoramaResolver = null;
  closeDuplicatePanoramaModal();
  resolver(choice);
}

async function askCrossGroupDuplicateAction(fileName, duplicateInfo, context = { entries: [], skipAll: false }) {
  if (
    duplicatePanoramaModal &&
    duplicatePanoramaMessage &&
    btnDuplicatePanoramaProceed &&
    btnDuplicatePanoramaAcceptAll &&
    btnDuplicatePanoramaSkip &&
    btnDuplicatePanoramaCancel
  ) {
    return new Promise((resolve) => {
      duplicatePanoramaResolver = resolve;
      openDuplicatePanoramaModal(fileName, duplicateInfo, context);
    });
  }

  const sceneName = duplicateInfo?.sceneName || duplicateInfo?.sceneId || 'Unknown Scene';
  const groupName = duplicateInfo?.groupName || duplicateInfo?.groupId || 'Unknown Group';
  while (true) {
    const choice = prompt(
      [
        `Image "${fileName}" already exists in another group.`,
        `Group: ${groupName}`,
        `Scene: ${sceneName}`,
        '',
        'Type one option:',
        '- proceed',
        '- accept all',
        '- skip',
        '- skip all',
        '- list',
        '- cancel'
      ].join('\n'),
      'skip'
    );
    if (choice === null) return 'cancel';
    const normalized = String(choice).trim().toLowerCase();
    if (normalized === 'list') {
      const rows = formatDuplicatePanoramaList(context.entries);
      alert(rows.length
        ? rows.map((row) => `${row.index}. ${row.fileName}\n${row.matches.map((match) => `   Group: ${match.groupName}\n   Scene: ${match.sceneName}`).join('\n')}`).join('\n')
        : 'No duplicate images found.');
      continue;
    }
    if (normalized === 'accept all' || normalized === 'acceptall') {
      return 'accept-all';
    }
    if (normalized === 'proceed' || normalized === 'skip' || normalized === 'skip all' || normalized === 'skipall' || normalized === 'cancel') {
      if (normalized === 'skip all' || normalized === 'skipall') return 'skip-all';
      return normalized;
    }
    alert('Invalid option. Type exactly: proceed, accept all, skip, skip all, list, or cancel.');
  }
}

function applyPanoramaToScene(scene, file, dataUrl, meta, hash = '') {
  if (meta) {
    scene.sourceImage = {
      name: file.name,
      dataUrl,
      hash,
      width: meta.width,
      height: meta.height
    };
  } else {
    scene.sourceImage = {
      name: file.name,
      dataUrl,
      hash
    };
  }
  resetSceneTiles(scene);
}

async function uploadPanoramaFile(file, options = {}) {
  const groupId = options.groupId || options.scene?.groupId || state.selectedGroupId || state.project?.groups?.[0]?.id || null;
  if (!groupId) {
    updateStatus('Create a group first.');
    return { ok: false, duplicate: false };
  }

  const dataUrl = options.dataUrl || await readFileAsDataUrl(file);
  const meta = options.meta || await readImageMetadata(dataUrl);
  const hash = options.hash || await computeFileHash(file);

  if (isDuplicatePanoramaInGroup(groupId, dataUrl, hash)) {
    if (!options.suppressDuplicateStatus) {
      alert(`Image "${file.name}" already exists in this group.`);
      updateStatus(`Image "${file.name}" ignored: already exists in this group.`);
    }
    return { ok: false, duplicate: true, duplicateScope: 'same-group' };
  }

  const duplicateInOtherGroup =
    (options.precomputedDuplicateMatchesInOtherGroup?.[0] || null) ||
    findDuplicatePanoramaInOtherGroups(groupId, dataUrl, hash, file.name);
  if (duplicateInOtherGroup) {
    const duplicateBatchContext = options.duplicateBatchContext || { entries: [], totalDuplicates: 1, skipAll: false };

    let action = 'skip';
    if (duplicateBatchContext.skipAll) {
      action = 'skip-all';
    } else if (duplicateBatchContext.proceedAll) {
      action = 'proceed';
    } else {
      action = await askCrossGroupDuplicateAction(file.name, duplicateInOtherGroup, duplicateBatchContext);
    }
    if (action === 'cancel') {
      updateStatus('Upload cancelled.');
      return { ok: false, cancelled: true };
    }
    if (action === 'accept-all') {
      duplicateBatchContext.proceedAll = true;
      action = 'proceed';
    }
    if (action === 'skip-all') {
      duplicateBatchContext.skipAll = true;
      updateStatus(`Image "${file.name}" skipped (Skip All active).`);
      return { ok: false, duplicate: true, duplicateScope: 'other-group' };
    }
    if (action === 'skip') {
      updateStatus(`Image "${file.name}" skipped: already exists in group "${duplicateInOtherGroup.groupName}".`);
      return { ok: false, duplicate: true, duplicateScope: 'other-group' };
    }
  }

  let scene = options.scene || null;
  if (!scene) {
    scene = createSceneRecord(sceneNameFromFile(file.name), groupId);
    state.project.scenes.push(scene);
    ensureMainSceneForGroup(groupId, scene.id);
    state.selectedSceneId = scene.id;
    state.selectedHotspotId = null;
  }
  applyPanoramaToScene(scene, file, dataUrl, meta, hash);

  if (!options.skipRender) {
    updateStatus(meta ? 'Panorama loaded. Ready to generate tiles.' : 'Panorama loaded (size unknown). Ready to generate tiles.');
    refreshEditorScenes();
    renderAll();
    autosave();
  }
  return { ok: true, duplicate: false, sceneId: scene.id };
}

async function uploadPanoramaFiles(files) {
  const fileList = Array.from(files || []);
  if (!fileList.length) return;

  let imported = 0;
  let cancelled = false;
  const ignoredSameGroup = [];
  const ignoredOtherGroup = [];
  const createdSceneIds = [];
  const targetGroupId = state.selectedGroupId || state.project?.groups?.[0]?.id || null;
  const duplicateBatchContext = await precomputeCrossGroupDuplicates(fileList, targetGroupId);

  for (const file of fileList) {
    try {
      const result = await uploadPanoramaFile(file, {
        groupId: targetGroupId,
        dataUrl: duplicateBatchContext.dataUrlByFile.get(file) || undefined,
        skipRender: true,
        suppressDuplicateStatus: true,
        duplicateBatchContext,
        hash: duplicateBatchContext.hashByFile.get(file) || '',
        precomputedDuplicateMatchesInOtherGroup: duplicateBatchContext.duplicateByFile.get(file) || null
      });
      if (result?.duplicate) {
        if (result.duplicateScope === 'other-group') {
          ignoredOtherGroup.push(file.name);
        } else {
          ignoredSameGroup.push(file.name);
        }
        continue;
      }
      if (result?.cancelled) {
        cancelled = true;
        break;
      }
      if (result?.ok && result.sceneId) {
        createdSceneIds.push(result.sceneId);
        imported += 1;
      }
    } catch (error) {
      console.error('Panorama upload failed:', file.name, error);
    }
  }

  if (createdSceneIds.length) {
    const preferredScene = getPreferredSceneForGroup(targetGroupId) || state.project.scenes.find((scene) => scene.id === createdSceneIds[0]) || null;
    state.selectedSceneId = preferredScene?.id || null;
    state.selectedHotspotId = null;
  }

  refreshEditorScenes();
  renderAll();
  const ignoredCount = ignoredSameGroup.length + ignoredOtherGroup.length;
  if (ignoredCount) {
    const scopes = [];
    if (ignoredSameGroup.length) scopes.push(`same group: ${ignoredSameGroup.length}`);
    if (ignoredOtherGroup.length) scopes.push(`other groups skipped: ${ignoredOtherGroup.length}`);
    const cancelPart = cancelled ? ' Upload stopped by user.' : '';
    const scopesPart = scopes.length ? ` (${scopes.join(', ')})` : '';
    updateStatus(`Loaded ${imported}/${fileList.length} panoramas. Ignored duplicates: ${ignoredCount}${scopesPart}.${cancelPart}`);
  } else {
    updateStatus(cancelled
      ? `Loaded ${imported}/${fileList.length} panoramas. Upload stopped by user.`
      : `Loaded ${imported}/${fileList.length} panoramas. Double-click a scene name to rename.`);
  }
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

function highestPowerOfTwoAtOrBelow(value) {
  const n = Math.floor(Number(value) || 0);
  if (n < 1) return 1;
  return 2 ** Math.floor(Math.log2(n));
}

async function showTileSizingInfo() {
  const scene = getSelectedScene();
  if (!scene || !scene.sourceImage?.dataUrl) {
    updateStatus('Select a scene with an uploaded 360 image first.');
    return;
  }

  let width = Number(scene.sourceImage.width) || 0;
  let height = Number(scene.sourceImage.height) || 0;
  if (!width || !height) {
    const meta = await readImageMetadata(scene.sourceImage.dataUrl);
    if (meta?.width && meta?.height) {
      width = meta.width;
      height = meta.height;
      scene.sourceImage.width = width;
      scene.sourceImage.height = height;
    }
  }

  if (!width || !height) {
    updateStatus('Could not detect image resolution for this scene.');
    return;
  }

  const maxUsefulFaceRaw = Math.max(256, Math.floor(Math.min(width / 4, height / 2)));
  const maxUsefulFacePow2 = highestPowerOfTwoAtOrBelow(maxUsefulFaceRaw);
  const maxUsefulTile = Math.max(256, highestPowerOfTwoAtOrBelow(maxUsefulFacePow2 / 4));
  const suggestedFaceSizes = [512, 1024, 2048, 4096, 8192].filter((v) => v <= maxUsefulFacePow2);
  const suggestedTileSizes = [256, 512, 1024, 2048].filter((v) => v <= maxUsefulTile);

  const lines = [
    `Scene: ${scene.name || scene.id}`,
    `Source image: ${width} x ${height}`,
    '',
    `Max useful face size (no upscaling): ${maxUsefulFaceRaw}px`,
    `Recommended face size (power of 2): ${maxUsefulFacePow2}px`,
    `Max useful tile size: ${maxUsefulTile}px`,
    '',
    `Suggested face sizes: ${suggestedFaceSizes.length ? suggestedFaceSizes.join(', ') : maxUsefulFacePow2}`,
    `Suggested tile sizes: ${suggestedTileSizes.length ? suggestedTileSizes.join(', ') : maxUsefulTile}`,
    '',
    'Note: larger tiles create fewer files but reduce zoom detail granularity.'
  ];

  alert(lines.join('\n'));
  updateStatus(`Tile info ready for "${scene.name || scene.id}".`);
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

function getTileSelectionScenes() {
  const scenes = state.project?.scenes || [];
  const selectedIds = (state.multiSelectedSceneIds || []).filter(Boolean);
  if (selectedIds.length) {
    const selectedSet = new Set(selectedIds);
    return scenes.filter((scene) => selectedSet.has(scene.id));
  }
  const selectedScene = getSelectedScene();
  return selectedScene ? [selectedScene] : [];
}

async function generateTilesForSelectedScenes() {
  if (!state.project?.scenes?.length) {
    updateStatus('No scenes available.');
    return;
  }

  const selectedScenes = getTileSelectionScenes();
  if (!selectedScenes.length) {
    updateStatus('Select at least one scene.');
    return;
  }

  const alreadyTiled = selectedScenes.filter((scene) => sceneHasGeneratedTiles(scene));
  const scenesToProcess = selectedScenes.filter((scene) => !sceneHasGeneratedTiles(scene));
  const scenesWithPanorama = scenesToProcess.filter((scene) => scene.sourceImage?.dataUrl);
  const skippedNoPanorama = scenesToProcess.length - scenesWithPanorama.length;

  if (!scenesWithPanorama.length) {
    if (alreadyTiled.length && !skippedNoPanorama) {
      updateStatus(`All selected scenes already have tiles. Skipped: ${alreadyTiled.length}.`);
      renderSceneList();
      return;
    }
    if (alreadyTiled.length && skippedNoPanorama) {
      updateStatus(`No new scenes to tile. Already tiled: ${alreadyTiled.length}. Without image: ${skippedNoPanorama}.`);
      renderSceneList();
      return;
    }
    updateStatus('Selected scenes have no uploaded 360 image.');
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
    const skippedParts = [];
    if (alreadyTiled.length) skippedParts.push(`already tiled: ${alreadyTiled.length}`);
    if (skippedNoPanorama) skippedParts.push(`without image: ${skippedNoPanorama}`);
    const skippedPart = skippedParts.length ? ` Skipped ${skippedParts.join(', ')}.` : '';
    updateStatus(`Tiles generated for ${completed}/${scenesWithPanorama.length} selected scenes.${skippedPart}`);
  } catch (error) {
    if (error?.message === 'cancelled') {
      updateStatus(`Tiling cancelled (${completed}/${scenesWithPanorama.length} selected scenes completed).`);
    } else {
      updateStatus(`Selected tiling failed (${completed}/${scenesWithPanorama.length} completed).`);
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
projectFovInput?.addEventListener('input', (event) => updateProjectFov(event.target.value));
projectFovInput?.addEventListener('change', (event) => updateProjectFov(event.target.value, { commit: true }));
btnResetProject?.addEventListener('click', resetProjectWithConfirmation);
sceneCommentInput?.addEventListener('input', (event) => {
  const scene = getSelectedScene();
  if (!scene) return;
  scene.comment = event.target.value || '';
  autosave();
});
linkTargetAllGroupsToggle?.addEventListener('change', (event) => {
  state.linkTargetAllGroups = Boolean(event.target.checked);
  renderLinkEditor();
});
sceneGroupSelect.addEventListener('change', (event) => {
  clearPendingSceneLinkDraft(false);
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
  const selectedTarget = event.target.value === state.selectedSceneId ? '' : event.target.value;
  if (hotspot) {
    hotspot.contentBlocks = hotspot.contentBlocks || [];
    let block = getSceneLinkBlock(hotspot);
    if (!block) {
      block = { type: 'scene', sceneId: '', comment: '' };
      hotspot.contentBlocks.push(block);
    }
    block.sceneId = selectedTarget;
    renderLinkEditor();
    renderContentBlocks();
    autosave();
    return;
  }
  const pendingDraft = getPendingSceneLinkDraftForSelectedScene();
  if (pendingDraft) {
    pendingDraft.targetSceneId = selectedTarget;
  }
  renderLinkEditor();
});

linkNewColorSelect?.addEventListener('change', (event) => {
  const next = normalizeSceneLinkColorKey(event.target.value);
  state.newLinkColorKey = next;
  const hotspot = getSelectedLinkHotspot();
  if (hotspot && placementMode) {
    hotspot.linkColorKey = next;
    autosave();
  }
  if (pendingSceneLinkDraft) {
    pendingSceneLinkDraft.linkColorKey = next;
  }
  renderLinkEditor();
  scheduleMarkerRender();
});

linkCommentInput.addEventListener('input', (event) => {
  const hotspot = getSelectedLinkHotspot();
  if (hotspot) {
    hotspot.contentBlocks = hotspot.contentBlocks || [];
    let block = getSceneLinkBlock(hotspot);
    if (!block) {
      block = { type: 'scene', sceneId: '', comment: '' };
      hotspot.contentBlocks.push(block);
    }
    block.comment = event.target.value;
    autosave();
    return;
  }
  const pendingDraft = getPendingSceneLinkDraftForSelectedScene();
  if (pendingDraft) {
    pendingDraft.comment = event.target.value;
  }
});

linkSelect.addEventListener('change', (event) => {
  const hotspotId = event.target.value;
  if (!hotspotId) return;
  if (hotspotId === '__pending__') {
    state.selectedHotspotId = null;
    renderLinkEditor();
    renderContentBlocks();
    scheduleMarkerRender();
    return;
  }
  state.selectedHotspotId = hotspotId;
  renderLinkEditor();
  renderContentBlocks();
  scheduleMarkerRender();
});

btnSave.addEventListener('click', () => saveDraft(state.project));
btnExport.addEventListener('click', exportProject);
btnExportStatic.addEventListener('click', exportStaticPackage);
btnImport.addEventListener('click', () => fileImport.click());
btnUploadFloorplan.addEventListener('click', () => fileFloorplan.click());
btnDeleteFloorplan.addEventListener('click', deleteFloorplan);
btnFloorplanPlaceScene?.addEventListener('click', () => {
  if (btnFloorplanPlaceScene.disabled) return;
  setFloorplanPlaceMode(!floorplanPlaceMode);
});
btnFloorplanEdit?.addEventListener('click', () => {
  if (btnFloorplanEdit.disabled) return;
  setFloorplanEditMode(!floorplanEditMode);
});
btnFloorplanSelectAll?.addEventListener('click', () => {
  if (btnFloorplanSelectAll.disabled) return;
  setFloorplanSelectAllMode(!floorplanSelectAllMode);
});
btnFloorplanDeleteNode?.addEventListener('click', () => {
  if (btnFloorplanDeleteNode.disabled) return;
  deleteSelectedFloorplanNode();
});
btnFloorplanToggleLabels?.addEventListener('click', () => {
  if (btnFloorplanToggleLabels.disabled) return;
  setFloorplanShowLabels(!floorplanShowLabels);
});
btnFloorplanExpand?.addEventListener('click', () => {
  setFloorplanMapWindowOpen(!floorplanMapWindowOpen);
});
floorplanColorSelect?.addEventListener('change', (event) => {
  const colorKey = event.target.value || 'yellow';
  setSelectedFloorplanColor(colorKey);
});
btnFloorplanZoomReset?.addEventListener('click', () => {
  setFloorplanZoom(1);
});
btnUploadPanorama.addEventListener('click', () => filePanorama.click());
btnGenerateTiles.addEventListener('click', generateTilesForSelectedScenes);
btnTilesInfo?.addEventListener('click', showTileSizingInfo);
btnDeleteSelectedScenes?.addEventListener('click', deleteSelectedScenes);
btnPauseTiles.addEventListener('click', pauseTiling);
btnResumeTiles.addEventListener('click', resumeTiling);
btnTogglePlacement.addEventListener('click', togglePlacementMode);
btnPreviewHotspot.addEventListener('click', () => openHotspotPreview(state.selectedHotspotId));
btnSetMainScene.addEventListener('click', setMainSceneForSelectedGroup);
btnSetOrientation?.addEventListener('click', () => {
  if (!state.selectedSceneId) {
    updateStatus('Select a scene first.');
    return;
  }
  setSceneOrientationById(state.selectedSceneId);
});
btnAddSceneLink.addEventListener('click', addSceneLinkBlock);
btnDeleteSceneLink.addEventListener('click', deleteSceneLinkBlock);
btnRemoveAllLinks.addEventListener('click', removeAllSceneLinksForCurrentScene);
btnToggleLinksPanel?.addEventListener('click', () => {
  toggleSection(btnToggleLinksPanel, linksPanelBody);
});
btnToggleProjectPanel?.addEventListener('click', () => {
  toggleSection(btnToggleProjectPanel, projectPanelBody);
});
btnToggleGroupsPanel?.addEventListener('click', () => {
  toggleSection(btnToggleGroupsPanel, groupsPanelBody);
});
btnToggleScenesPanel?.addEventListener('click', () => {
  toggleSection(btnToggleScenesPanel, scenesPanelBody);
});
btnSceneSortName?.addEventListener('click', () => toggleSceneSort('name'));
btnSceneSortUpload?.addEventListener('click', () => toggleSceneSort('upload'));
btnSceneLabelMode?.addEventListener('click', toggleSceneLabelMode);
btnToggleMapPanel?.addEventListener('click', () => {
  if (floorplanMapWindowOpen) {
    setFloorplanMapWindowOpen(false);
  }
  toggleSection(btnToggleMapPanel, mapPanelBody);
});
btnToggleSceneActionsPanel?.addEventListener('click', () => {
  toggleSection(btnToggleSceneActionsPanel, sceneActionsPanelBody);
});
btnCancelTiles.addEventListener('click', () => {
  if (tilerWorker && activeTilingRequestId) {
    tilerWorker.postMessage({ type: 'cancel', requestId: activeTilingRequestId });
  }
});
btnClosePreview.addEventListener('click', closeHotspotPreview);
btnDeleteLinksScene?.addEventListener('click', () => resolveDeleteLinksScope('scene'));
btnDeleteLinksGroup?.addEventListener('click', () => resolveDeleteLinksScope('group'));
btnDeleteLinksCancel?.addEventListener('click', () => resolveDeleteLinksScope(null));
btnDuplicatePanoramaProceed?.addEventListener('click', () => resolveDuplicatePanoramaChoice('proceed'));
btnDuplicatePanoramaAcceptAll?.addEventListener('click', () => resolveDuplicatePanoramaChoice('accept-all'));
btnDuplicatePanoramaSkip?.addEventListener('click', () => resolveDuplicatePanoramaChoice('skip'));
btnDuplicatePanoramaSkipAll?.addEventListener('click', () => resolveDuplicatePanoramaChoice('skip-all'));
btnDuplicatePanoramaList?.addEventListener('click', () => openDuplicatePanoramaListModal(duplicatePanoramaListEntries));
btnDuplicatePanoramaCancel?.addEventListener('click', () => resolveDuplicatePanoramaChoice('cancel'));
btnCloseDuplicatePanoramaList?.addEventListener('click', closeDuplicatePanoramaListModal);
previewModal.addEventListener('click', (event) => {
  if (event.target === previewModal) {
    closeHotspotPreview();
  }
});
deleteLinksScopeModal?.addEventListener('click', (event) => {
  if (event.target === deleteLinksScopeModal) {
    resolveDeleteLinksScope(null);
  }
});
duplicatePanoramaModal?.addEventListener('click', (event) => {
  if (event.target === duplicatePanoramaModal) {
    resolveDuplicatePanoramaChoice('cancel');
  }
});
duplicatePanoramaListModal?.addEventListener('click', (event) => {
  if (event.target === duplicatePanoramaListModal) {
    closeDuplicatePanoramaListModal();
  }
});
mapWindowBackdrop?.addEventListener('click', () => {
  setFloorplanMapWindowOpen(false);
});
window.addEventListener('keydown', (event) => {
  const blockingModalOpen =
    previewModal?.classList.contains('visible') ||
    deleteLinksScopeModal?.classList.contains('visible') ||
    duplicatePanoramaModal?.classList.contains('visible') ||
    duplicatePanoramaListModal?.classList.contains('visible');
  if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !isTypingTarget(event.target) && !blockingModalOpen) {
    const moved = moveSceneSelectionBy(event.key === 'ArrowDown' ? 1 : -1);
    if (moved) {
      event.preventDefault();
      return;
    }
  }
  if (event.key === 'Escape' && duplicatePanoramaListModal?.classList.contains('visible')) {
    closeDuplicatePanoramaListModal();
    return;
  }
  if (event.key === 'Escape' && duplicatePanoramaModal?.classList.contains('visible')) {
    resolveDuplicatePanoramaChoice('cancel');
    return;
  }
  if (event.key === 'Escape' && floorplanMapWindowOpen) {
    setFloorplanMapWindowOpen(false);
  }
});

fileImport.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    importProjectFile(file);
  }
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
setSectionCollapsed(btnToggleProjectPanel, projectPanelBody, false);
setSectionCollapsed(btnToggleGroupsPanel, groupsPanelBody, false);
setSectionCollapsed(btnToggleScenesPanel, scenesPanelBody, false);
setSectionCollapsed(btnToggleMapPanel, mapPanelBody, false);
setSectionCollapsed(btnToggleSceneActionsPanel, sceneActionsPanelBody, false);
setLinksPanelCollapsed(false);
setFloorplanMapWindowOpen(false);

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
