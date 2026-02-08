const LOAD_URL = "/data/maps/rdo_main.json";
const SAVE_URL = "/api/maps/rdo_main";

const MAP_IMAGE_URL = "/assets/rdo-maps.jpeg"; // IMPORTANT: leading slash
// If your site is not served from root, change to "./assets/rdo-maps.jpeg"

const typeColors = {
  house: "blue",
  shop: "red",
  government: "yellow"
};

let selectedType = "house";
let selectedId = null;

let mapData = { version: 1, updatedAt: "", markers: [] };
let markerMap = new Map();

const $ = (id) => document.getElementById(id);

// ---------- Leaflet: Image Map Setup ----------
const map = L.map("map", {
  crs: L.CRS.Simple,     // <— makes it an image coordinate system
  minZoom: -5,
  maxZoom: 3,
  zoomControl: true
});

// Load image to get width/height, then create bounds correctly
const img = new Image();
img.src = MAP_IMAGE_URL;

img.onload = () => {
  const w = img.width;
  const h = img.height;

  // Leaflet CRS.Simple uses [y, x] for latlng, so bounds are:
  const bounds = [[0, 0], [h, w]];

  L.imageOverlay(MAP_IMAGE_URL, bounds).addTo(map);

  // Fit to image
  map.fitBounds(bounds);

  // Optional: keep panning within image
  map.setMaxBounds(bounds);
  map.on("drag", () => map.panInsideBounds(bounds, { animate: false }));

  // Now that map exists, load markers
  loadMarkers();
};

img.onerror = () => {
  alert("Failed to load map image: " + MAP_IMAGE_URL + "\nCheck the path and file name.");
};

// ---------- Icons ----------
function icon(type) {
  return L.divIcon({
    className: "",
    html: `<div class="pin ${typeColors[type]}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

// ---------- Load markers ----------
function loadMarkers() {
  fetch(LOAD_URL)
    .then(r => r.ok ? r.json() : { version: 1, markers: [] })
    .then(j => {
      mapData = j && typeof j === "object" ? j : { version: 1, markers: [] };
      if (!Array.isArray(mapData.markers)) mapData.markers = [];

      mapData.markers.forEach(addMarkerFromData);
    })
    .catch(() => {
      mapData = { version: 1, updatedAt: "", markers: [] };
    });
}

function newId() {
  return "m_" + Math.random().toString(16).slice(2, 10);
}

function addMarkerFromData(m) {
  const lm = L.marker([m.coordinates.lat, m.coordinates.lng], { icon: icon(m.type) }).addTo(map);
  lm.on("click", () => selectMarker(m.id));
  markerMap.set(m.id, lm);
}

function selectMarker(id) {
  selectedId = id;
  const m = mapData.markers.find(x => x.id === id);
  if (!m) return;

  $("name").value = m.name || "";
  $("type").value = m.type;
  $("status").value = m.status || "";
  $("description").value = m.description || "";
  $("lat").value = m.coordinates.lat;
  $("lng").value = m.coordinates.lng;

  $("apply").disabled = false;
}

// ---------- Map click: add marker ----------
map.on("click", (e) => {
  // e.latlng in CRS.Simple is image coords: lat=y, lng=x
  const m = {
    id: newId(),
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
  addMarkerFromData(m);
  selectMarker(m.id);
});

// ---------- Apply (edit marker in memory) ----------
$("apply").onclick = () => {
  const m = mapData.markers.find(x => x.id === selectedId);
  if (!m) return;

  m.name = $("name").value;
  m.status = $("status").value;
  m.description = $("description").value;

  m.coordinates.lat = parseFloat($("lat").value);
  m.coordinates.lng = parseFloat($("lng").value);

  // move marker on map
  markerMap.get(m.id)?.setLatLng([m.coordinates.lat, m.coordinates.lng]);
};

// ---------- Update (Save JSON) ----------
$("update").onclick = () => {
  mapData.updatedAt = new Date().toISOString();

  fetch(SAVE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapData, null, 2)
  });
};

// ---------- Type buttons ----------
document.querySelectorAll(".type").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".type").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedType = btn.dataset.type;
    $("type").value = selectedType;
  };
});

// Keep type input synced at start
$("type").value = selectedType;