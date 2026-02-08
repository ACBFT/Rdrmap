const MAP_ID = "rdo_main";
const LOAD_URL = `/api/load?mapId=${encodeURIComponent(MAP_ID)}`;
const SAVE_URL = `/api/save`;

// DOM
const q = document.getElementById("q");
const qClear = document.getElementById("qClear");
const type = document.getElementById("type");
const btnReset = document.getElementById("btnReset");
const btnFocus = document.getElementById("btnFocus");

const loginCta = document.getElementById("loginCta");
const userBox = document.getElementById("userBox");
const userName = document.getElementById("userName");
const btnEditor = document.getElementById("btnEditor");
const btnLogout = document.getElementById("btnLogout");

const left = document.getElementById("left");
const right = document.getElementById("right");
const splitLeft = document.getElementById("splitLeft");
const splitRight = document.getElementById("splitRight");

const results = document.getElementById("results");
const kTotal = document.getElementById("kTotal");
const kShown = document.getElementById("kShown");
const kTypes = document.getElementById("kTypes");

const map = document.getElementById("map");
const mapImg = document.getElementById("mapImg");
const layer = document.getElementById("layer");
const crosshair = document.getElementById("crosshair");

const hudCoords = document.getElementById("hudCoords");
const hudZoom = document.getElementById("hudZoom");
const hudMode = document.getElementById("hudMode");
const hudDirty = document.getElementById("hudDirty");

const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovDesc = document.getElementById("ovDesc");
const ovActions = document.getElementById("ovActions");

const miniView = document.getElementById("miniView");

const tabs = document.querySelectorAll(".tab");
const inspectTab = document.getElementById("inspectTab");
const editorTab = document.getElementById("editorTab");
const tabEditor = document.getElementById("tabEditor");

const insTitle = document.getElementById("insTitle");
const insSub = document.getElementById("insSub");
const insBody = document.getElementById("insBody");

const mName = document.getElementById("mName");
const mType = document.getElementById("mType");
const mNotes = document.getElementById("mNotes");
const btnPlace = document.getElementById("btnPlace");
const btnCancelPlace = document.getElementById("btnCancelPlace");
const selBox = document.getElementById("selBox");
const btnDeleteSel = document.getElementById("btnDeleteSel");
const btnFocusSel = document.getElementById("btnFocusSel");
const editorList = document.getElementById("editorList");

const toolBtns = document.querySelectorAll(".dockBtn[data-tool]");
const toolAdd = document.getElementById("toolAdd");
const toolDel = document.getElementById("toolDel");
const btnUndo = document.getElementById("btnUndo");
const btnSave = document.getElementById("btnSave");

// State
let session = { loggedIn:false, editor:false, user:null };

let markers = [];
let roads = [];
let areas = [];

let filtered = [];
let selectedId = null;

let dirty = false;
let tool = "browse"; // browse | add | delete
let placing = false;
let lastAddedId = null;

// Pan/zoom
let scale = 1, tx = 0, ty = 0;
let isPanning = false;
let panStart = { x:0, y:0, tx:0, ty:0 };

// Helpers
const esc = (s)=>String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
const uniq = (a)=>[...new Set(a)];
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

function showOverlay(title, desc, actionsHtml = ""){
  overlay.classList.remove("isHidden");
  ovTitle.textContent = title;
  ovDesc.textContent = desc;
  ovActions.innerHTML = actionsHtml;
}
function hideOverlay(){ overlay.classList.add("isHidden"); }

function setDirty(v){
  dirty = v;
  hudDirty.style.display = dirty ? "" : "none";
  btnSave.disabled = !(dirty && session.editor);
}

function applyTransform(){
  const t = `translate(${tx}px, ${ty}px) scale(${scale})`;
  mapImg.style.transform = t;
  layer.style.transform = t;
  hudZoom.textContent = `zoom: ${scale.toFixed(2)}`;
  updateMinimapView();
}

function updateMinimapView(){
  // Mini map is fixed 220x140 showing whole image. We fake viewport rectangle by assuming full image size once loaded.
  const w = mapImg.naturalWidth || 1000;
  const h = mapImg.naturalHeight || 700;
  const wrap = map.getBoundingClientRect();

  // Visible world rectangle:
  const vx = (-tx) / scale;
  const vy = (-ty) / scale;
  const vw = wrap.width / scale;
  const vh = wrap.height / scale;

  // Convert to minimap coords (220x140)
  const mw = 220, mh = 140;
  const rx = clamp((vx / w) * mw, 0, mw);
  const ry = clamp((vy / h) * mh, 0, mh);
  const rw = clamp((vw / w) * mw, 10, mw);
  const rh = clamp((vh / h) * mh, 10, mh);

  miniView.style.left = `${rx}px`;
  miniView.style.top = `${ry}px`;
  miniView.style.width = `${rw}px`;
  miniView.style.height = `${rh}px`;
}

function setTool(next){
  tool = next;
  placing = false;
  crosshair.classList.add("isHidden");
  btnCancelPlace.disabled = true;

  toolBtns.forEach(b=>b.classList.toggle("isActive", b.dataset.tool === tool));
  hudMode.textContent = `mode: ${tool}`;

  map.classList.remove("canPan","isPanning");
  if (tool === "browse") map.classList.add("canPan");
}

function normalizeMarkers(arr){
  const a = Array.isArray(arr) ? arr : [];
  return a.map((m, i)=>{
    const id = m.id ?? m._id ?? `m_${i}_${Math.random().toString(16).slice(2)}`;
    const name = m.name ?? m.title ?? `Marker ${i+1}`;
    const type = m.type ?? m.category ?? "Unknown";
    let x = m.x, y = m.y;
    if (typeof x === "string") x = Number(x);
    if (typeof y === "string") y = Number(y);
    return { ...m, id, name, type, x, y };
  });
}

function updateAuthUI(){
  if (session.loggedIn){
    loginCta.style.display = "none";
    userBox.classList.remove("isHidden");
    userName.textContent = session.user?.username ? `@${session.user.username}` : "Logged in";
  } else {
    loginCta.style.display = "";
    userBox.classList.add("isHidden");
  }

  btnEditor.disabled = !session.editor;
  tabEditor.disabled = !session.editor;
  toolAdd.disabled = !session.editor;
  toolDel.disabled = !session.editor;

  btnPlace.disabled = !session.editor;
  btnSave.disabled = !(dirty && session.editor);

  btnDeleteSel.disabled = !(session.editor && selectedId);
  btnUndo.disabled = !(session.editor && lastAddedId);
}

function populateTypeFilter(){
  const types = uniq(markers.map(m=>m.type)).sort((a,b)=>a.localeCompare(b));
  type.innerHTML = `<option value="all">All Types</option>` + types.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");
}

function stats(){
  kTotal.textContent = String(markers.length);
  kShown.textContent = String(filtered.length);
  kTypes.textContent = String(uniq(markers.map(m=>m.type)).length);
}

function renderMarkers(list){
  layer.innerHTML = "";
  for (const it of list){
    if (typeof it.x !== "number" || typeof it.y !== "number") continue;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "marker" + (it.id === selectedId ? " isSel" : "");
    el.style.left = `${it.x - 7}px`;
    el.style.top = `${it.y - 7}px`;
    el.title = `${it.name} • ${it.type}`;
    el.addEventListener("click", (e)=>{
      e.stopPropagation();
      if (tool === "delete" && session.editor){
        removeMarker(it.id);
        return;
      }
      selectMarker(it.id);
    });
    layer.appendChild(el);
  }
}

function renderResults(list){
  results.innerHTML = "";
  if (!list.length){
    results.innerHTML = `
      <div class="item">
        <div class="item__top">
          <div class="item__name">No results</div>
          <span class="badge">—</span>
        </div>
        <div class="item__meta">Try a different search or clear filters.</div>
      </div>`;
    return;
  }

  for (const it of list){
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item__top">
        <div class="item__name">${esc(it.name)}</div>
        <span class="badge">${esc(it.type)}</span>
      </div>
      <div class="item__meta">x:${it.x} y:${it.y}</div>
    `;
    div.addEventListener("click", ()=>selectMarker(it.id));
    results.appendChild(div);
  }
}

function renderEditorList(){
  if (!session.editor){
    editorList.innerHTML = `<div class="item"><div class="item__name">Editor locked</div><div class="item__meta">Sign in as an editor to manage markers.</div></div>`;
    return;
  }
  editorList.innerHTML = "";
  const list = markers.slice().sort((a,b)=>(a.type||"").localeCompare(b.type||"") || (a.name||"").localeCompare(b.name||""));
  for (const it of list){
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item__top">
        <div class="item__name">${esc(it.name)}</div>
        <span class="badge">${esc(it.type)}</span>
      </div>
      <div class="item__meta">x:${it.x} y:${it.y}</div>
    `;
    div.addEventListener("click", ()=>selectMarker(it.id));
    editorList.appendChild(div);
  }
}

function runFilter(){
  const query = (q.value||"").trim().toLowerCase();
  const t = type.value;

  filtered = markers.filter(m=>{
    if (t !== "all" && m.type !== t) return false;
    if (!query) return true;
    const hay = `${m.name} ${m.type} ${m.notes||""}`.toLowerCase();
    return hay.includes(query);
  });

  stats();
  renderResults(filtered);
  renderMarkers(filtered);
}

function selectMarker(id){
  selectedId = id;

  renderMarkers(filtered);
  btnFocus.disabled = !selectedId;
  btnFocusSel.disabled = !selectedId;
  btnDeleteSel.disabled = !(session.editor && selectedId);

  const it = markers.find(m=>m.id===id);
  if (!it) return;

  insTitle.textContent = it.name;
  insSub.textContent = `${it.type} • x:${it.x} y:${it.y}`;

  const pairs = Object.entries(it).slice(0, 80).map(([k,v])=>{
    const vv = (typeof v === "object") ? JSON.stringify(v) : String(v);
    return `<div class="k">${esc(k)}</div><div class="v">${esc(vv)}</div>`;
  }).join("");
  insBody.innerHTML = pairs || `<div class="muted">No details.</div>`;

  selBox.innerHTML = `<b>${esc(it.name)}</b><div class="muted">${esc(it.type)} • x:${it.x} y:${it.y}</div><div class="muted">${it.notes ? esc(it.notes) : ""}</div>`;
}

function focusSelected(){
  const it = markers.find(m=>m.id===selectedId);
  if (!it || typeof it.x !== "number" || typeof it.y !== "number") return;

  const rect = map.getBoundingClientRect();
  const targetX = rect.width * 0.52;
  const targetY = rect.height * 0.54;
  tx = targetX - it.x * scale;
  ty = targetY - it.y * scale;
  applyTransform();
}

function removeMarker(id){
  const idx = markers.findIndex(m=>m.id===id);
  if (idx === -1) return;
  markers.splice(idx, 1);

  if (selectedId === id){
    selectedId = null;
    insTitle.textContent = "Nothing selected";
    insSub.textContent = "Click a marker to see details.";
    insBody.innerHTML = "";
    selBox.textContent = "No marker selected.";
  }

  setDirty(true);
  populateTypeFilter();
  runFilter();
  renderEditorList();
}

function addMarkerAt(wx, wy){
  const name = (mName.value||"").trim();
  const typeVal = (mType.value||"").trim();
  const notes = (mNotes.value||"").trim();

  if (!name || !typeVal){
    alert("Name and Type are required.");
    return;
  }

  const id = `m_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
  const marker = { id, name, type: typeVal, x: Math.round(wx), y: Math.round(wy), notes };
  markers.push(marker);
  lastAddedId = id;

  setDirty(true);
  populateTypeFilter();
  runFilter();
  renderEditorList();
  selectMarker(id);

  btnUndo.disabled = !session.editor;
}

async function loadMe(){
  const r = await fetch("/api/me", { cache:"no-store" });
  if (!r.ok) return;
  const me = await r.json();
  session = { loggedIn:!!me.loggedIn, editor:!!me.editor, user:me.user||null };
}

async function loadMap(){
  showOverlay("Loading map…", "Fetching data from your backend.");
  const r = await fetch(LOAD_URL, { cache:"no-store" });

  if (!r.ok){
    // Clean error overlay with a retry + env hint
    const txt = await r.text().catch(()=> "");
    showOverlay(
      "Map data failed to load",
      `Your /api/load returned ${r.status}. This is backend/env related (usually GITHUB_OWNER/REPO or token access after org transfer).`,
      `<button class="primaryBtn" id="retryBtn">Retry</button>
       <button class="chipBtn" id="openLoadBtn">Open /api/load</button>`
    );
    setTimeout(()=>{
      const retry = document.getElementById("retryBtn");
      const open = document.getElementById("openLoadBtn");
      if (retry) retry.onclick = ()=>loadMap();
      if (open) open.onclick = ()=>window.open(LOAD_URL, "_blank");
    }, 0);
    throw new Error(`Load failed: ${r.status} ${txt.slice(0,120)}`);
  }

  const out = await r.json();
  if (!out?.ok) throw new Error("Load returned not ok");

  const payload = out.payload || { markers:[], roads:[], areas:[] };
  markers = normalizeMarkers(payload.markers || []);
  roads = Array.isArray(payload.roads) ? payload.roads : [];
  areas = Array.isArray(payload.areas) ? payload.areas : [];

  filtered = markers.slice();
  selectedId = null;

  setDirty(false);
  populateTypeFilter();
  runFilter();
  renderEditorList();

  hideOverlay();
}

async function saveMap(){
  if (!session.editor) return;
  showOverlay("Saving…", "Writing updates via /api/save.");

  const payload = { markers, roads, areas };
  const body = { mapId: MAP_ID, payload, message: `Map save ${MAP_ID}` };

  const r = await fetch(SAVE_URL, {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body: JSON.stringify(body)
  });

  const out = await r.json().catch(()=>null);

  if (!r.ok || !out?.ok){
    showOverlay("Save failed", out?.error || `Save failed (${r.status})`, `<button class="primaryBtn" id="closeOv">Close</button>`);
    setTimeout(()=>{ const c=document.getElementById("closeOv"); if(c) c.onclick=hideOverlay; }, 0);
    throw new Error(out?.error || `Save failed: ${r.status}`);
  }

  setDirty(false);
  hideOverlay();
}

async function logout(){
  await fetch("/api/logout", { cache:"no-store" }).catch(()=>{});
  window.location.href = "/";
}

/* -------- Resizable panels -------- */
function makeResizer(handle, side){
  let dragging = false;
  handle.addEventListener("mousedown", ()=> dragging = true);
  window.addEventListener("mouseup", ()=> dragging = false);
  window.addEventListener("mousemove", (e)=>{
    if (!dragging) return;
    const bodyRect = document.querySelector(".body").getBoundingClientRect();
    const x = e.clientX - bodyRect.left;

    if (side === "left"){
      const w = clamp(x, 280, 520);
      document.querySelector(".body").style.gridTemplateColumns = `${w}px 8px 1fr 8px ${right.getBoundingClientRect().width}px`;
    } else {
      const total = bodyRect.width;
      const rightW = clamp(total - x, 320, 640);
      const leftW = left.getBoundingClientRect().width;
      document.querySelector(".body").style.gridTemplateColumns = `${leftW}px 8px 1fr 8px ${rightW}px`;
    }
  });
}

/* -------- Pan/zoom -------- */
function clampScale(s){ return clamp(s, 0.35, 4.0); }
function zoomAt(clientX, clientY, nextScale){
  const rect = map.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const wx = (px - tx) / scale;
  const wy = (py - ty) / scale;

  scale = clampScale(nextScale);
  tx = px - wx * scale;
  ty = py - wy * scale;
  applyTransform();
}

map.addEventListener("wheel", (e)=>{
  e.preventDefault();
  const delta = Math.sign(e.deltaY);
  const factor = delta > 0 ? 0.90 : 1.10;
  zoomAt(e.clientX, e.clientY, scale * factor);
}, { passive:false });

map.addEventListener("pointerdown", (e)=>{
  if (tool !== "browse") return;
  isPanning = true;
  map.classList.add("isPanning");
  map.setPointerCapture(e.pointerId);
  panStart = { x:e.clientX, y:e.clientY, tx, ty };
});
map.addEventListener("pointermove", (e)=>{
  const rect = map.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const wx = (px - tx) / scale;
  const wy = (py - ty) / scale;

  hudCoords.textContent = `x: ${Math.round(wx)} y: ${Math.round(wy)}`;

  if (placing){
    crosshair.style.left = `${px}px`;
    crosshair.style.top = `${py}px`;
  }

  if (!isPanning) return;
  tx = panStart.tx + (e.clientX - panStart.x);
  ty = panStart.ty + (e.clientY - panStart.y);
  applyTransform();
});
map.addEventListener("pointerup", (e)=>{
  isPanning = false;
  map.classList.remove("isPanning");
  try{ map.releasePointerCapture(e.pointerId); }catch{}
});

/* Place marker click */
map.addEventListener("click", (e)=>{
  if (!session.editor) return;

  if (tool === "add" && placing){
    const rect = map.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const wx = (px - tx) / scale;
    const wy = (py - ty) / scale;
    addMarkerAt(wx, wy);

    placing = false;
    crosshair.classList.add("isHidden");
    btnCancelPlace.disabled = true;
    btnPlace.textContent = "Click map to place";
    return;
  }
});

/* -------- Tabs -------- */
tabs.forEach(t=>{
  t.addEventListener("click", ()=>{
    tabs.forEach(x=>x.classList.remove("isActive"));
    t.classList.add("isActive");
    const tab = t.dataset.tab;

    inspectTab.classList.toggle("isHidden", tab !== "inspect");
    editorTab.classList.toggle("isHidden", tab !== "editor");
  });
});

/* -------- Dock tools -------- */
toolBtns.forEach(b=>{
  b.addEventListener("click", ()=>{
    const next = b.dataset.tool;
    if ((next === "add" || next === "delete") && !session.editor) return;
    setTool(next);
  });
});

btnUndo.addEventListener("click", ()=>{
  if (!session.editor || !lastAddedId) return;
  removeMarker(lastAddedId);
  lastAddedId = null;
  btnUndo.disabled = true;
});

btnSave.addEventListener("click", async ()=>{
  try{ await saveMap(); }
  catch(err){ console.error(err); }
});

/* -------- Editor UI -------- */
btnEditor.addEventListener("click", ()=>{
  // Jump right panel to editor tab
  tabs.forEach(x=>x.classList.remove("isActive"));
  document.querySelector('.tab[data-tab="editor"]').classList.add("isActive");
  inspectTab.classList.add("isHidden");
  editorTab.classList.remove("isHidden");
});

btnLogout.addEventListener("click", logout);

btnPlace.addEventListener("click", ()=>{
  if (!session.editor) return;
  setTool("add");
  placing = true;
  crosshair.classList.remove("isHidden");
  btnCancelPlace.disabled = false;
  btnPlace.textContent = "Now click on the map…";
});

btnCancelPlace.addEventListener("click", ()=>{
  placing = false;
  crosshair.classList.add("isHidden");
  btnCancelPlace.disabled = true;
  btnPlace.textContent = "Click map to place";
});

btnDeleteSel.addEventListener("click", ()=>{
  if (!session.editor || !selectedId) return;
  const it = markers.find(m=>m.id===selectedId);
  if (!it) return;
  if (!confirm(`Delete "${it.name}"?`)) return;
  removeMarker(selectedId);
});

btnFocus.addEventListener("click", focusSelected);
btnFocusSel.addEventListener("click", focusSelected);
btnReset.addEventListener("click", ()=>{ scale=1; tx=0; ty=0; applyTransform(); });

/* -------- Search/filter -------- */
q.addEventListener("input", runFilter);
qClear.addEventListener("click", ()=>{ q.value=""; runFilter(); });
type.addEventListener("change", runFilter);

/* -------- Keyboard shortcuts -------- */
window.addEventListener("keydown", (e)=>{
  if (e.key === "r" || e.key === "R") { scale=1; tx=0; ty=0; applyTransform(); }
  if (e.key === "f" || e.key === "F") { if (selectedId) focusSelected(); }
  if (e.key === "1") setTool("browse");
  if (e.key === "2" && session.editor) setTool("add");
  if (e.key === "3" && session.editor) setTool("delete");
  if (e.key === "Escape"){
    placing = false;
    crosshair.classList.add("isHidden");
    btnCancelPlace.disabled = true;
    btnPlace.textContent = "Click map to place";
  }
});

/* -------- Boot -------- */
async function boot(){
  makeResizer(splitLeft, "left");
  makeResizer(splitRight, "right");

  map.classList.add("canPan");
  applyTransform();
  updateMinimapView();

  showOverlay("Loading…", "Initializing session and loading map data.");
  await loadMe();
  updateAuthUI();

  try{
    await loadMap();
  }catch(e){
    console.error(e);
  }
}
boot();