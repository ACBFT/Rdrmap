<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>RP Map (Builder + Viewer)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>

  <style>
    :root{
      --bg:#0b0d12;
      --panel: rgba(18,18,18,.88);
      --stroke: rgba(255,255,255,.14);
      --text: #fff;
      --muted: rgba(255,255,255,.75);
      --muted2: rgba(255,255,255,.6);
      --accent: #7c3aed;
      --good: #22c55e;
      --warn: #f59e0b;
      --bad: #ef4444;
      --shadow: 0 10px 30px rgba(0,0,0,.35);
      --radius: 14px;
      --radius2: 12px;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      --ui: system-ui, -apple-system, Segoe UI, Roboto, Arial;
    }

    html, body, #map{ height:100%; margin:0; background:var(--bg); }

    /* ===== Panels ===== */
    .panel{
      position: fixed;
      z-index: 9999;
      width: 360px;
      max-width: calc(100vw - 24px);
      background: var(--panel);
      border: 1px solid var(--stroke);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
      color: var(--text);
      font: 13px var(--ui);
      overflow: hidden;
    }

    .panel-header{
      padding: 12px 12px 10px;
      border-bottom: 1px solid var(--stroke);
      display:flex;
      align-items:center;
      justify-content: space-between;
      gap:10px;
    }
    .title{
      display:flex;
      flex-direction: column;
      gap:2px;
    }
    .title b{ font-size: 14px; letter-spacing: .2px; }
    .title span{ font-size: 11px; color: var(--muted2); }

    .pill{
      display:inline-flex;
      gap:8px;
      align-items:center;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--stroke);
      background: rgba(255,255,255,.06);
      font-weight: 900;
      font-size: 12px;
      user-select:none;
    }

    .panel-body{ padding: 12px; }

    .row{ display:flex; gap:8px; margin: 8px 0; }
    .col{ display:flex; flex-direction: column; gap:8px; }

    label.small{
      font-size: 11px;
      color: var(--muted2);
      font-weight: 900;
      letter-spacing:.2px;
      text-transform: uppercase;
    }

    select, input, button, textarea{
      width: 100%;
      box-sizing: border-box;
      padding: 10px 10px;
      border-radius: var(--radius2);
      border: 1px solid var(--stroke);
      background: rgba(255,255,255,.06);
      color: var(--text);
      font: 800 13px var(--ui);
      outline: none;
    }
    input[type="color"]{
      padding: 0;
      height: 42px;
      border-radius: var(--radius2);
    }
    button{
      cursor: pointer;
      transition: 120ms ease;
    }
    button:hover{ background: rgba(255,255,255,.10); }
    button:disabled{ opacity: .5; cursor:not-allowed; }

    textarea{
      height: 140px;
      font: 11px var(--mono);
      font-weight: 600;
      background: rgba(0,0,0,.35);
    }

    .divider{
      height: 1px;
      background: var(--stroke);
      margin: 10px 0;
    }

    .hint{
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }

    /* ===== Left Control Panel ===== */
    #controlPanel{
      top: 10px; left: 10px;
    }

    /* ===== Right Info Panel ===== */
    #infoPanel{
      top: 10px; right: 10px;
      width: 380px;
    }

    .info-empty{
      color: var(--muted);
      font-size: 12px;
      padding: 8px 0;
    }

    .info-kv{
      display:flex;
      gap:10px;
      align-items:flex-start;
      padding: 8px 0;
      border-bottom: 1px dashed rgba(255,255,255,.12);
    }
    .info-kv:last-child{ border-bottom: 0; }
    .info-kv b{
      width: 92px;
      color: var(--muted2);
      font-weight: 900;
      font-size: 11px;
      letter-spacing:.2px;
      text-transform: uppercase;
      flex-shrink:0;
    }
    .info-kv div{
      flex:1;
      font: 600 12px var(--ui);
      color: var(--text);
      word-break: break-word;
    }

    .tag{
      display:inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(255,255,255,.06);
      font-weight: 900;
      font-size: 11px;
      margin-right: 6px;
      margin-bottom: 6px;
      color: rgba(255,255,255,.9);
    }

    /* ===== Bottom Left Edit Bar ===== */
    #editBar{
      position: fixed;
      left: 10px;
      bottom: 10px;
      z-index: 10000;
      display:flex;
      gap:8px;
      align-items:center;
      padding: 10px;
      border-radius: 16px;
      border: 1px solid var(--stroke);
      background: var(--panel);
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
      width: 420px;
      max-width: calc(100vw - 24px);
      color: var(--text);
      font: 13px var(--ui);
    }
    #editBar .left{
      flex:1;
      display:flex;
      flex-direction: column;
      gap:2px;
      min-width: 0;
    }
    #editBar .left b{ font-size: 13px; }
    #editBar .left span{ font-size: 11px; color: var(--muted2); white-space: nowrap; overflow:hidden; text-overflow: ellipsis; }
    #editBar .right{
      display:flex;
      gap:8px;
      flex-shrink:0;
    }
    #editBar button{ width:auto; padding: 10px 12px; }

    /* ===== Layer Checklist ===== */
    .layerList{
      display:flex;
      flex-direction: column;
      gap:8px;
    }
    .layerItem{
      display:flex;
      gap:10px;
      align-items:center;
      padding: 10px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04);
    }
    .layerItem input{ width: 18px; height: 18px; }
    .layerItem b{ font-size: 12px; }
    .layerItem span{ font-size: 11px; color: var(--muted2); margin-left:auto; }

    /* ===== Leaflet popup polish ===== */
    .leaflet-popup-content{ margin: 12px 14px; }
    .leaflet-popup-content b{ font-weight: 900; }

    /* ===== House badge icon ===== */
    .house-badge{
      width: 28px; height: 28px;
      border-radius: 999px;
      background: #111;
      color:#fff;
      display:grid;
      place-items:center;
      border: 2px solid #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,.35);
      font: 900 14px/1 var(--ui);
      user-select:none;
    }
    .badge{
      width: 28px; height: 28px;
      border-radius: 999px;
      display:grid;
      place-items:center;
      border: 2px solid rgba(255,255,255,.95);
      box-shadow: 0 2px 10px rgba(0,0,0,.35);
      font: 900 14px/1 var(--ui);
      user-select:none;
    }

    /* ===== Mobile: stack panels ===== */
    @media (max-width: 920px){
      #infoPanel{ top: auto; bottom: 78px; right: 10px; width: 360px; }
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <!-- ===== LEFT: Control Panel ===== -->
  <aside class="panel" id="controlPanel">
    <div class="panel-header">
      <div class="title">
        <b>RP Map</b>
        <span id="mapSubtitle">Viewer mode • Click things to inspect</span>
      </div>
      <div class="pill" id="savePill">Saved</div>
    </div>

    <div class="panel-body">
      <div class="col">
        <div>
          <label class="small">Search</label>
          <input id="search" placeholder="Search houses, POIs, roads, counties..." />
        </div>

        <div class="row">
          <div style="flex:1">
            <label class="small">Mode</label>
            <select id="mode">
              <option value="inspect">Inspect (Viewer)</option>
              <option value="select" disabled>Select / Move (Editor)</option>
              <option value="marker" disabled>Place Marker (Editor)</option>
              <option value="road" disabled>Draw Road (Editor)</option>
              <option value="area" disabled>Draw Area / County (Editor)</option>
              <option value="erase" disabled>Erase (Editor)</option>
            </select>
          </div>
          <div style="width:120px">
            <label class="small">Color</label>
            <input id="color" type="color" value="#ffffff"/>
          </div>
        </div>

        <div class="row">
          <div style="flex:1">
            <label class="small">Marker Type</label>
            <select id="markerType">
              <option value="house">House #</option>
              <option value="poi">POI</option>
              <option value="shop">Shop</option>
              <option value="sheriff">Sheriff</option>
              <option value="stable">Stable</option>
              <option value="camp">Camp</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div style="width:120px">
            <label class="small">House #</label>
            <input id="houseNumber" type="number" min="1" placeholder="Auto" />
          </div>
        </div>

        <div class="row">
          <button id="finishRoad" disabled>Finish Road</button>
          <button id="undoPoint" disabled>Undo Point</button>
        </div>

        <div class="row">
          <button id="finishArea" disabled>Finish Area</button>
          <button id="closeArea" disabled>Close Loop</button>
        </div>

        <div class="row">
          <button id="deleteSelected" disabled>Delete Selected</button>
          <button id="clearSelection" disabled>Clear Select</button>
        </div>

        <div class="row">
          <button id="resetView">Reset View</button>
          <button id="exportJson">Export</button>
        </div>

        <div class="row">
          <button id="importJson">Import</button>
          <button id="clearAll" disabled>Clear All (Editor)</button>
        </div>

        <div class="divider"></div>

        <label class="small">Layers</label>
        <div class="layerList">
          <div class="layerItem">
            <input id="layerHouses" type="checkbox" checked />
            <b>Houses</b>
            <span>Markers</span>
          </div>
          <div class="layerItem">
            <input id="layerPois" type="checkbox" checked />
            <b>POIs</b>
            <span>Markers</span>
          </div>
          <div class="layerItem">
            <input id="layerRoads" type="checkbox" checked />
            <b>Roads / Streets</b>
            <span>Lines</span>
          </div>
          <div class="layerItem">
            <input id="layerBorders" type="checkbox" checked />
            <b>Borders</b>
            <span>Lines</span>
          </div>
          <div class="layerItem">
            <input id="layerCounties" type="checkbox" checked />
            <b>Counties</b>
            <span>Areas</span>
          </div>
        </div>

        <div class="divider"></div>

        <label class="small">Import / Export Box</label>
        <textarea id="box" placeholder="Paste JSON here to import, or export to back it up."></textarea>

        <div class="hint" style="margin-top:8px">
          Structure is ready for:
          • Vercel autosave + GitHub commits (server-side)<br>
          • Discord “path updates” (webhook/API bridge later)<br>
          For now this is a clean, solid UI shell.
        </div>
      </div>
    </div>
  </aside>

  <!-- ===== RIGHT: Info Panel ===== -->
  <aside class="panel" id="infoPanel">
    <div class="panel-header">
      <div class="title">
        <b>Info</b>
        <span id="infoSubtitle">Click a marker/road/county to view details</span>
      </div>
      <button id="closeInfo" style="width:auto; padding:8px 10px;">Close</button>
    </div>
    <div class="panel-body" id="infoBody">
      <div class="info-empty">Nothing selected yet.</div>
    </div>
  </aside>

  <!-- ===== Bottom-left “Sign in to Edit” ===== -->
  <div id="editBar">
    <div class="left">
      <b id="editTitle">Viewer Mode</b>
      <span id="editSub">Sign in to enable editing tools on this map.</span>
    </div>
    <div class="right">
      <button id="btnSignIn">Sign in to Edit</button>
      <button id="btnSignOut" disabled>Sign out</button>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    /**********************************************************
     * FRONT-END ONLY “SOLID SHELL”
     * - Viewer vs Editor lock
     * - Layers + search + info panel
     * - Placeholder hooks for Vercel + Discord paths later
     **********************************************************/

    // ====== MAP CONFIG (update later) ======
    const MAP_W = 1536;  // your image width
    const MAP_H = 1152;  // your image height
    const MAP_IMAGE_URL = "./assets/rdo-map.jpeg"; // change to your file path

    // ====== LOCAL CACHE KEY (front-end now) ======
    const STORAGE_KEY = "rp_map_shell_v1";

    // ====== DATA MODEL (future-proof) ======
    // roads: { id, kind:'road'|'border', name, color, pts:[[y,x]...], meta:{} }
    // areas: { id, kind:'county'|'area', name, color, pts:[[y,x]...], meta:{} }
    // markers: { id, kind:'house'|'poi'|'shop'..., name, x, y, color, meta:{} }
    let data = {
      markers: [],
      roads: [],
      areas: [],
      meta: { mapId: "default", updatedAt: null }
    };

    // ====== AUTH/EDIT LOCK (front-end stub) ======
    // For now: simple passcode prompt. Later: Vercel auth / Discord role / etc.
    let isEditor = false;

    // ====== Leaflet map ======
    const map = L.map("map", { crs: L.CRS.Simple, minZoom: -2, maxZoom: 3, zoomSnap: 0.25 });
    const bounds = [[0,0],[MAP_H, MAP_W]];
    L.imageOverlay(MAP_IMAGE_URL, bounds).addTo(map);
    map.fitBounds(bounds);

    // ====== Layers ======
    const layerHouses = L.layerGroup().addTo(map);
    const layerPois = L.layerGroup().addTo(map);
    const layerRoads = L.layerGroup().addTo(map);
    const layerBorders = L.layerGroup().addTo(map);
    const layerCounties = L.layerGroup().addTo(map);

    // ====== UI refs ======
    const modeSel = document.getElementById("mode");
    const markerTypeSel = document.getElementById("markerType");
    const houseNumberInp = document.getElementById("houseNumber");
    const colorInp = document.getElementById("color");
    const searchInp = document.getElementById("search");
    const box = document.getElementById("box");

    const savePill = document.getElementById("savePill");
    const mapSubtitle = document.getElementById("mapSubtitle");

    const infoPanel = document.getElementById("infoPanel");
    const infoBody = document.getElementById("infoBody");
    const infoSubtitle = document.getElementById("infoSubtitle");

    // Edit bar
    const btnSignIn = document.getElementById("btnSignIn");
    const btnSignOut = document.getElementById("btnSignOut");
    const editTitle = document.getElementById("editTitle");
    const editSub = document.getElementById("editSub");

    // Buttons
    const btnFinishRoad = document.getElementById("finishRoad");
    const btnUndoPoint = document.getElementById("undoPoint");
    const btnFinishArea = document.getElementById("finishArea");
    const btnCloseArea = document.getElementById("closeArea");
    const btnDeleteSelected = document.getElementById("deleteSelected");
    const btnClearSelection = document.getElementById("clearSelection");
    const btnClearAll = document.getElementById("clearAll");

    // ====== Selection ======
    let selected = null; // { kind:'marker'|'road'|'area', id, layer, dataRef }

    // ====== Drawing state (front-end placeholders) ======
    let drawPts = [];
    let drawLine = null;

    // ====== Helpers ======
    function escapeHtml(s){
      return String(s ?? "")
        .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
        .replaceAll('"',"&quot;").replaceAll("'","&#039;");
    }
    function setSaved(ok){
      savePill.textContent = ok ? "Saved" : "Saving...";
      savePill.style.opacity = ok ? "0.9" : "1";
    }
    function saveLocal(){
      try{
        data.meta.updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setSaved(true);
      }catch{}
    }
    function loadLocal(){
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;
        if (!Array.isArray(parsed.markers) || !Array.isArray(parsed.roads) || !Array.isArray(parsed.areas)) return;
        data = parsed;
      }catch{}
    }

    function setEditorMode(on){
      isEditor = on;

      // Enable/disable editor-only controls
      const editorOnly = [
        "select","marker","road","area","erase"
      ];
      for (const opt of modeSel.options){
        opt.disabled = editorOnly.includes(opt.value) ? !isEditor : false;
      }
      if (!isEditor) modeSel.value = "inspect";

      btnFinishRoad.disabled = !isEditor;
      btnUndoPoint.disabled = !isEditor;
      btnFinishArea.disabled = !isEditor;
      btnCloseArea.disabled = !isEditor;
      btnDeleteSelected.disabled = !isEditor;
      btnClearSelection.disabled = !isEditor;
      btnClearAll.disabled = !isEditor;

      btnSignIn.disabled = isEditor;
      btnSignOut.disabled = !isEditor;

      editTitle.textContent = isEditor ? "Editor Mode" : "Viewer Mode";
      editSub.textContent = isEditor
        ? "Editing enabled. Changes will later sync via Vercel."
        : "Sign in to enable editing tools on this map.";

      mapSubtitle.textContent = isEditor
        ? "Editor mode • Create markers, roads, borders, counties"
        : "Viewer mode • Click things to inspect";
    }

    function iconForMarker(m){
      const color = m.color || "#ffffff";
      if (m.kind === "house"){
        const num = m.houseNumber ?? m.id;
        return L.divIcon({
          className:"",
          html:`<div class="house-badge" style="border-color:${color}">${escapeHtml(num)}</div>`,
          iconSize:[28,28],
          iconAnchor:[14,14]
        });
      }
      const glyph =
        m.kind === "poi" ? "📍" :
        m.kind === "shop" ? "🛒" :
        m.kind === "sheriff" ? "★" :
        m.kind === "stable" ? "🐎" :
        m.kind === "camp" ? "⛺" :
        "•";

      return L.divIcon({
        className:"",
        html:`<div class="badge" style="border-color:${color}; color:${color}; background: rgba(0,0,0,.45)">${glyph}</div>`,
        iconSize:[28,28],
        iconAnchor:[14,14]
      });
    }

    function openInfo(obj){
      // obj is your saved data object (marker/road/area)
      infoPanel.style.display = "block";
      infoSubtitle.textContent = obj.kind ? `${obj.kind.toUpperCase()} • ID ${obj.id}` : "Selected";

      const tags = [];
      if (obj.kind) tags.push(obj.kind);
      if (obj.type) tags.push(obj.type);

      const meta = obj.meta && typeof obj.meta === "object" ? obj.meta : {};

      infoBody.innerHTML = `
        ${tags.length ? `<div style="margin-bottom:8px">${tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}

        <div class="info-kv"><b>Name</b><div>${escapeHtml(obj.name || "(unnamed)")}</div></div>
        <div class="info-kv"><b>Color</b><div>${escapeHtml(obj.color || "#ffffff")}</div></div>

        ${obj.kind === "marker" || obj.x != null ? `
          <div class="info-kv"><b>Coords</b><div>x:${escapeHtml(obj.x)} y:${escapeHtml(obj.y)}</div></div>
        ` : ""}

        ${obj.kind === "house" ? `
          <div class="info-kv"><b>House #</b><div>${escapeHtml(obj.houseNumber ?? obj.id)}</div></div>
        ` : ""}

        ${obj.pts ? `
          <div class="info-kv"><b>Points</b><div>${escapeHtml(obj.pts.length)}</div></div>
        ` : ""}

        <div class="info-kv"><b>Description</b><div>${escapeHtml(meta.description || "")}</div></div>
        <div class="info-kv"><b>Notes</b><div>${escapeHtml(meta.notes || "")}</div></div>
        <div class="info-kv"><b>Links</b><div>${Array.isArray(meta.links) ? meta.links.map(u=>`<div>${escapeHtml(u)}</div>`).join("") : ""}</div></div>

        <div class="info-kv"><b>Raw Meta</b><div><pre style="margin:0; white-space:pre-wrap; font:11px var(--mono); color:rgba(255,255,255,.85)">${escapeHtml(JSON.stringify(meta, null, 2))}</pre></div></div>
      `;
    }

    function clearSelection(){
      selected = null;
      infoBody.innerHTML = `<div class="info-empty">Nothing selected yet.</div>`;
      infoSubtitle.textContent = "Click a marker/road/county to view details";
    }

    // ====== Render (front-end shell) ======
    function render(){
      layerHouses.clearLayers();
      layerPois.clearLayers();
      layerRoads.clearLayers();
      layerBorders.clearLayers();
      layerCounties.clearLayers();

      // Areas (counties)
      for (const a of data.areas){
        const poly = L.polygon(a.pts || [], {
          color: a.color || "#ffffff",
          weight: 3,
          opacity: 0.95,
          fillOpacity: 0.12
        });

        poly.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          selected = { kind:"area", id:a.id, layer: poly, dataRef: a };
          openInfo(a);
        });

        poly.addTo(layerCounties);
      }

      // Roads/Borders
      for (const r of data.roads){
        const line = L.polyline(r.pts || [], {
          color: r.color || "#ffffff",
          weight: (r.kind === "border" ? 5 : 4),
          opacity: 0.95,
          dashArray: (r.kind === "border" ? "10 6" : null)
        });

        line.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          selected = { kind:"road", id:r.id, layer: line, dataRef: r };
          openInfo(r);
        });

        line.addTo(r.kind === "border" ? layerBorders : layerRoads);
      }

      // Markers (houses/pois/etc.)
      for (const m of data.markers){
        const marker = L.marker([m.y, m.x], {
          icon: iconForMarker(m),
          draggable: isEditor && (modeSel.value === "select")
        });

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          selected = { kind:"marker", id:m.id, layer: marker, dataRef: m };
          openInfo(m);
        });

        // later: drag-to-move when editor
        marker.on("dragend", () => {
          if (!isEditor) return;
          const p = marker.getLatLng();
          m.y = Math.round(p.lat);
          m.x = Math.round(p.lng);
          setSaved(false);
          saveLocal();
          render();
        });

        if (m.kind === "house") marker.addTo(layerHouses);
        else marker.addTo(layerPois);
      }
    }

    // ====== Layer toggles ======
    function bindLayerToggle(id, layer){
      const el = document.getElementById(id);
      el.addEventListener("change", () => {
        if (el.checked) layer.addTo(map);
        else map.removeLayer(layer);
      });
    }
    bindLayerToggle("layerHouses", layerHouses);
    bindLayerToggle("layerPois", layerPois);
    bindLayerToggle("layerRoads", layerRoads);
    bindLayerToggle("layerBorders", layerBorders);
    bindLayerToggle("layerCounties", layerCounties);

    // ====== Search (filters by name/kind) ======
    searchInp.addEventListener("input", () => {
      const q = searchInp.value.trim().toLowerCase();
      // simple: rebuild layers and fade non-matching markers (fast enough for now)
      // (later: build an index)
      render();
      if (!q) return;

      // fade markers that don't match
      layerHouses.eachLayer(l => {
        const m = data.markers.find(x => x.x === l.getLatLng().lng && x.y === l.getLatLng().lat);
        const hit = (m?.name || "").toLowerCase().includes(q) || (m?.kind || "").toLowerCase().includes(q);
        const el = l.getElement();
        if (el) el.style.opacity = hit ? "1" : "0.2";
      });
      layerPois.eachLayer(l => {
        const m = data.markers.find(x => x.x === l.getLatLng().lng && x.y === l.getLatLng().lat);
        const hit = (m?.name || "").toLowerCase().includes(q) || (m?.kind || "").toLowerCase().includes(q);
        const el = l.getElement();
        if (el) el.style.opacity = hit ? "1" : "0.2";
      });
    });

    // ====== Viewer map click clears selection ======
    map.on("click", () => {
      if (modeSel.value === "inspect") clearSelection();
    });

    // ====== Basic export/import ======
    document.getElementById("exportJson").onclick = () => {
      box.value = JSON.stringify(data, null, 2);
    };
    document.getElementById("importJson").onclick = () => {
      try{
        const parsed = JSON.parse(box.value);
        if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
        if (!Array.isArray(parsed.markers) || !Array.isArray(parsed.roads) || !Array.isArray(parsed.areas)) {
          throw new Error("JSON must have {markers:[], roads:[], areas:[]}");
        }
        data = parsed;
        setSaved(false);
        saveLocal();
        render();
        alert("Imported!");
      }catch(e){
        alert("Import failed: " + (e?.message || e));
      }
    };

    document.getElementById("resetView").onclick = () => map.fitBounds(bounds);

    document.getElementById("closeInfo").onclick = () => {
      infoPanel.style.display = "none";
    };

    // ====== Sign-in stub (front-end only for now) ======
    btnSignIn.onclick = () => {
      const code = prompt("Editor passcode (temporary):");
      // TEMP: change this to your own code.
      if (code === "1234") {
        setEditorMode(true);
        alert("Editor mode enabled (front-end only).");
        render();
      } else {
        alert("Wrong code.");
      }
    };
    btnSignOut.onclick = () => {
      setEditorMode(false);
      render();
    };

    // ====== Editor buttons are wired but editing logic comes next ======
    // These are placeholders for the next step where we add:
    // - place marker mode
    // - draw road mode
    // - draw area/county mode
    // - erase mode
    btnFinishRoad.onclick = () => alert("Next step: road drawing logic.");
    btnUndoPoint.onclick = () => alert("Next step: undo road/area point.");
    btnFinishArea.onclick = () => alert("Next step: county area finalize.");
    btnCloseArea.onclick = () => alert("Next step: close polygon loop.");
    btnDeleteSelected.onclick = () => alert("Next step: delete selected object.");
    btnClearSelection.onclick = () => clearSelection();
    btnClearAll.onclick = () => {
      if (!isEditor) return;
      if (!confirm("Clear EVERYTHING?")) return;
      data = { markers: [], roads: [], areas: [], meta: { mapId: data?.meta?.mapId || "default", updatedAt: null } };
      setSaved(false);
      saveLocal();
      render();
      clearSelection();
    };

    // ====== Boot ======
    loadLocal();

    // If empty, seed with a couple examples so UI looks alive
    if (data.markers.length === 0 && data.roads.length === 0 && data.areas.length === 0) {
      data.markers.push(
        { id:"house-1", kind:"house", houseNumber: 1, name:"House #1", x: 840, y: 620, color:"#ffffff", meta:{ description:"Example house", notes:"Edit later" } },
        { id:"poi-1", kind:"poi", name:"Valentine", x: 790, y: 430, color:"#22c55e", meta:{ description:"Example POI", notes:"Click to inspect" } }
      );
      data.roads.push(
        { id:"road-1", kind:"road", name:"Main Road", color:"#f59e0b", pts:[[420,780],[520,820],[620,840]], meta:{ notes:"Example road line" } }
      );
      data.areas.push(
        { id:"county-1", kind:"county", name:"Example County", color:"#3b82f6", pts:[[380,620],[360,740],[450,820],[520,700]], meta:{ description:"County/area polygon example" } }
      );
      saveLocal();
    }

    setEditorMode(false);
    render();
    setSaved(true);
  </script>
</body>
</html>
