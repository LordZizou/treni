let map = null;
let mapMarkers = [];
let routePolyline = null;

function initMap() {
  if (map) return;
  map = L.map('mapContainer').setView([41.9028, 12.4964], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);
}

function clearMap() {
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  if (routePolyline) {
    map.removeLayer(routePolyline);
    routePolyline = null;
  }
}

function showStationOnMap(name, lat, lng) {
  if (!map) initMap();
  clearMap();

  const marker = L.marker([lat, lng])
    .addTo(map)
    .bindPopup(`<strong>${escapeHtml(name)}</strong>`)
    .openPopup();
  mapMarkers.push(marker);
  map.setView([lat, lng], 13);
  showMapPanel();
}

function showTrainRouteOnMap(stops) {
  if (!map) initMap();
  clearMap();

  const coords = [];
  const trainIcon = L.divIcon({
    className: 'train-map-icon',
    html: '<span class="train-marker"></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const stationIcon = L.divIcon({
    className: 'station-map-icon',
    html: '<span class="station-marker"></span>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  const currentStationIcon = L.divIcon({
    className: 'station-map-icon current',
    html: '<span class="station-marker current"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  stops.forEach((stop, i) => {
    if (!stop.lat || !stop.lng) return;
    coords.push([stop.lat, stop.lng]);

    const isCurrent = stop.actualDeparture && !stop.actualArrival && i > 0;
    const icon = isCurrent ? currentStationIcon :
                 (i === 0 || i === stops.length - 1) ? trainIcon : stationIcon;

    const delayText = stop.delay > 0 ? ` (+${stop.delay} min)` :
                      stop.delay < 0 ? ` (${stop.delay} min)` : '';

    const popup = `
      <strong>${escapeHtml(stop.name)}</strong><br>
      ${stop.scheduledArrival ? 'Arr: ' + stop.scheduledArrival : ''}
      ${stop.scheduledDeparture ? ' Dep: ' + stop.scheduledDeparture : ''}
      ${delayText ? '<br><span class="delay-text">' + delayText + '</span>' : ''}
    `;

    const marker = L.marker([stop.lat, stop.lng], { icon })
      .addTo(map)
      .bindPopup(popup);
    mapMarkers.push(marker);
  });

  if (coords.length > 1) {
    routePolyline = L.polyline(coords, {
      color: 'var(--accent, #2563eb)',
      weight: 3,
      opacity: 0.7,
      dashArray: '8 4',
    }).addTo(map);
    map.fitBounds(routePolyline.getBounds(), { padding: [30, 30] });
  } else if (coords.length === 1) {
    map.setView(coords[0], 12);
  }

  showMapPanel();
}

function showMapPanel() {
  const panel = document.getElementById('mapPanel');
  if (panel) {
    panel.classList.add('active');
    setTimeout(() => map.invalidateSize(), 300);
  }
}

function hideMapPanel() {
  const panel = document.getElementById('mapPanel');
  if (panel) panel.classList.remove('active');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
