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

// Mostra il percorso completo di un treno con tutte le fermate
function showTrainRouteOnMap(fermate) {
  if (!map) initMap();
  clearMap();

  const coords = [];

  // Icone per i vari tipi di fermata
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
  // Pallino rosso pulsante che indica dove si trova il treno in questo momento
  const iconaPosizioneTreno = L.divIcon({
    className: 'train-position-icon',
    html: '<span class="train-position-marker"></span>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  });

  fermate.forEach((fermata, i) => {
    if (!fermata.lat || !fermata.lng) return;
    coords.push([fermata.lat, fermata.lng]);

    // Se il treno si trova qui, usa il pallino rosso, altrimenti l'icona normale
    let icona;
    if (fermata.posizioneTreno) {
      icona = iconaPosizioneTreno;
    } else if (i === 0 || i === fermate.length - 1) {
      icona = iconaTerminale;
    } else {
      icona = iconaFermata;
    }

    const ritardoTesto = fermata.delay > 0 ? ` (+${fermata.delay} min)` :
                         fermata.delay < 0 ? ` (${fermata.delay} min)` : '';

    const popup = `
      <strong>${escapeHtml(fermata.name)}</strong>
      ${fermata.posizioneTreno ? '<br><em>Treno qui</em>' : ''}<br>
      ${fermata.scheduledArrival ? 'Arr: ' + fermata.scheduledArrival : ''}
      ${fermata.scheduledDeparture ? ' Dep: ' + fermata.scheduledDeparture : ''}
      ${ritardoTesto ? '<br><span>' + ritardoTesto + '</span>' : ''}
    `;

    const marker = L.marker([fermata.lat, fermata.lng], { icon: icona })
      .addTo(map)
      .bindPopup(popup);

    // Apre automaticamente il popup sulla posizione del treno
    if (fermata.posizioneTreno) marker.openPopup();

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
