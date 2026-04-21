// Gestione della mappa con Leaflet.js
// Mostra la posizione delle stazioni e il percorso dei treni

let map = null;
let mapMarkers = [];
let routePolyline = null;

// Crea la mappa centrata sull'Italia (solo la prima volta)
function initMap() {
  if (map) return;
  map = L.map('mapContainer').setView([41.9028, 12.4964], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);
}

// Rimuove tutti i marker e la linea del percorso dalla mappa
function clearMap() {
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  if (routePolyline) {
    map.removeLayer(routePolyline);
    routePolyline = null;
  }
}

// Mostra una singola stazione sulla mappa con un marker
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

// Mostra il percorso completo di un treno con tutte le fermate
function showTrainRouteOnMap(fermate) {
  if (!map) initMap();
  clearMap();

  const coords = [];

  // Icone diverse per le varie fermate
  const iconaTerminale = L.divIcon({
    className: 'train-map-icon',
    html: '<span class="train-marker"></span>',
    iconSize: [14, 14], iconAnchor: [7, 7]
  });
  const iconaFermata = L.divIcon({
    className: 'station-map-icon',
    html: '<span class="station-marker"></span>',
    iconSize: [10, 10], iconAnchor: [5, 5]
  });
  const iconaCorrente = L.divIcon({
    className: 'station-map-icon current',
    html: '<span class="station-marker current"></span>',
    iconSize: [16, 16], iconAnchor: [8, 8]
  });

  fermate.forEach((fermata, i) => {
    if (!fermata.lat || !fermata.lng) return;
    coords.push([fermata.lat, fermata.lng]);

    // Sceglie l'icona giusta in base alla posizione del treno
    const eCorrente = fermata.actualDeparture && !fermata.actualArrival && i > 0;
    const icona = eCorrente ? iconaCorrente :
                  (i === 0 || i === fermate.length - 1) ? iconaTerminale : iconaFermata;

    const ritardoTesto = fermata.delay > 0 ? ` (+${fermata.delay} min)` :
                         fermata.delay < 0 ? ` (${fermata.delay} min)` : '';

    const popup = `
      <strong>${escapeHtml(fermata.name)}</strong><br>
      ${fermata.scheduledArrival ? 'Arr: ' + fermata.scheduledArrival : ''}
      ${fermata.scheduledDeparture ? ' Dep: ' + fermata.scheduledDeparture : ''}
      ${ritardoTesto ? '<br><span>' + ritardoTesto + '</span>' : ''}
    `;

    const marker = L.marker([fermata.lat, fermata.lng], { icon: icona })
      .addTo(map)
      .bindPopup(popup);
    mapMarkers.push(marker);
  });

  // Disegna la linea tratteggiata che collega le fermate
  if (coords.length > 1) {
    routePolyline = L.polyline(coords, {
      color: 'var(--accent, #2563eb)',
      weight: 3,
      opacity: 0.7,
      dashArray: '8 4'
    }).addTo(map);
    map.fitBounds(routePolyline.getBounds(), { padding: [30, 30] });
  } else if (coords.length === 1) {
    map.setView(coords[0], 12);
  }

  showMapPanel();
}

// Apre il pannello della mappa in fondo alla pagina
function showMapPanel() {
  const pannello = document.getElementById('mapPanel');
  if (pannello) {
    pannello.classList.add('active');
    // Dopo l'animazione CSS, ricalcola le dimensioni della mappa
    setTimeout(() => map.invalidateSize(), 300);
  }
}

// Chiude il pannello della mappa
function hideMapPanel() {
  const pannello = document.getElementById('mapPanel');
  if (pannello) pannello.classList.remove('active');
}

// Converte testo in HTML sicuro per evitare problemi di sicurezza (XSS)
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
