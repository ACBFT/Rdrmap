/* =====================================================
   A Cowboy's Frontier – Map Editor (FINAL STABLE)
   ===================================================== */

const MAP_IMAGE_URL = "./assets/rdo-maps.jpeg";
const DATA_URL = "./data/maps/rdo_map.json";

const TYPE_COLORS = {
  house: "blue",
  shop: "red",
  government: "yellow"
};

const MARKER_MIN_ZOOM = -1;

// ---- State ----
let map;
let mapData = { version: 1, updatedAt: "", markers: [] };
let leafletMarkers = new Map();
let selectedId = null;
let selectedType = "house";

// ---- DOM helper ----
const $ = (id) => document.getElementById(id);

// ---- DOM refs ----
const elApply = $("apply");
const elUpdate = $("update");
const elName = $("name");
const elType = $("type");
const elStatus = $("status");
const elDesc = $("description");
const elLat = $("lat");
const elLng = $("lng");

// ---- Init map ----
map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -5,
  maxZoom: 4
});

map.getContainer().style.cursor = "crosshair";

// ---- Load image ----
const img = new Image();
img.src = MAP_IMAGE_URL;

img.onload = () => {
  const bounds = [[0, 0], [img.height, img.width]];
  L.imageOverlay(MAP_IMAGE_URL, bounds).addTo(map);
  map.fitBounds(bounds);
  map.setMaxBounds(bounds);
  loadData();
};

img.onerror = () => alert("Map image failed to load.");

// ---- Marker icon ----
function markerIcon(type) {
  return L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin ${TYPE_COLORS[type]}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

// ---- Load JSON ----
async function loadData() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error();
    const json = await res.json();
    if (!Array.isArray(json.markers)) throw new Error();

    mapData = json;
    mapData.markers.forEach(addMarker);
    updateMarkerVisibility();
  } catch {
    mapData = { version: 1, updatedAt: "", markers: [] };
  }
}

// ---- Add marker ----
function addMarker(m) {
  const lm = L.marker([m.coordinates.lat, m.coordinates.lng], {
    icon: markerIcon(m.type),
    draggable: true
  });

  lm.on("click", () => selectMarker(m.id));

  lm.on("dragend", () => {
    const p = lm.getLatLng();
    m.coordinates.lat = p.lat;
    m.coordinates.lng = p.lng;
    if (selectedId === m.id) {
      elLat.value = p.lat;
      elLng.value = p.lng;
    }
  });

  leafletMarkers.set(m.id, lm);
  updateSingleMarkerVisibility(lm);
}

// ---- Select marker ----
function selectMarker(id) {
  const m = mapData.markers.find(x => x.id === id);
  if (!m) return;

  selectedId = id;

  elName.value = m.name || "";
  elType.value = m.type;
  elStatus.value = m.status || "";
  elDesc.value = m.description || "";
  elLat.value = m.coordinates.lat;
  elLng.value = m.coordinates.lng;

  elApply.disabled = false;
}

// ---- Map click = create marker ----
map.on("click", (e) => {
  const m = {
    id: crypto.randomUUID(),
    name: "",
    type: selectedType,
    status: "",
    description: "",
    coordinates: {
      lat: e.latlng.lat,
      lng: e.latlng.lng
    }
  };

  mapData.markers.push(m);
  addMarker(m);
  selectMarker(m.id);
});

// ---- APPLY (FIXED + TYPE CHANGE SUPPORT) ----
elApply.onclick = () => {
  if (!selectedId) return;

  const m = mapData.markers.find(x => x.id === selectedId);
  if (!m) return;

  const lat = Number(elLat.value);
  const lng = Number(elLng.value);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    alert("Coordinates must be numbers.");
    return;
  }

  m.name = elName.value;
  m.type = elType.value;
  m.status = elStatus.value;
  m.description = elDesc.value;
  m.coordinates.lat = lat;
  m.coordinates.lng = lng;

  const lm = leafletMarkers.get(m.id);
  if (lm) {
    lm.setLatLng([lat, lng]);
    lm.setIcon(markerIcon(m.type)); // 🔥 update color
  }
};

// ---- UPDATE (DOWNLOAD JSON) ----
elUpdate.onclick = () => {
  mapData.updatedAt = new Date().toISOString();

  const blob = new Blob(
    [JSON.stringify(mapData, null, 2)],
    { type: "application/json" }
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "rdo_map.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ---- Zoom-based visibility ----
function updateSingleMarkerVisibility(lm) {
  if (map.getZoom() >= MARKER_MIN_ZOOM) {
    if (!map.hasLayer(lm)) lm.addTo(map);
  } else {
    if (map.hasLayer(lm)) map.removeLayer(lm);
  }
}

function updateMarkerVisibility() {
  leafletMarkers.forEach(updateSingleMarkerVisibility);
}

map.on("zoomend", updateMarkerVisibility);

// ---- Type buttons (for NEW markers only) ----
document.querySelectorAll("button.type").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("button.type").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedType = btn.dataset.type;
  };
});

// ---- Init ----
elApply.disabled = true;