// Gestione della mappa con Leaflet.js
// Mostra la posizione delle stazioni e il percorso dei treni

// ===== VARIABILI GLOBALI MAPPA =====

let map = null;
let mapMarkers = [];
let routePolyline = null;

// ===== FUNZIONI DI INIZIALIZZAZIONE E PULIZIA =====

// Crea la mappa centrata sull'Italia (solo la prima volta)
function initMap() {
  if (map) return;
  // Inizializza la mappa sull'elemento #mapContainer
  map = L.map('mapContainer').setView([41.9028, 12.4964], 6);
  // Aggiunge il layer delle piastrelle (tiles) di OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);
}

// Rimuove tutti i marker e la linea del percorso dalla mappa
function clearMap() {
  // Rimuove ogni marker salvato nell'array
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  // Rimuove la linea del percorso se esistente
  if (routePolyline) {
    map.removeLayer(routePolyline);
    routePolyline = null;
  }
}

// ===== FUNZIONI DI VISUALIZZAZIONE =====

// Mostra il percorso completo di un treno con tutte le fermate
function showTrainRouteOnMap(fermate) {
  if (!map) initMap();
  clearMap();

  const coords = [];

  // Definizione delle icone personalizzate per i vari tipi di fermata
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

  // Itera sulle fermate per posizionare i marker
  fermate.forEach((fermata, i) => {
    if (!fermata.lat || !fermata.lng) return;
    coords.push([fermata.lat, fermata.lng]);

    // Scelta dell'icona in base al tipo di fermata
    let icona;
    if (fermata.posizioneTreno) {
      icona = iconaPosizioneTreno;
    } else if (i === 0 || i === fermate.length - 1) {
      icona = iconaTerminale;
    } else {
      icona = iconaFermata;
    }

    // Costruzione del testo del ritardo per il popup
    const ritardoTesto = fermata.delay > 0 ? ` (+${fermata.delay} min)` :
                         fermata.delay < 0 ? ` (${fermata.delay} min)` : '';

    // HTML del popup informativo
    const popup = `
      <strong>${escapeHtml(fermata.name)}</strong>
      ${fermata.posizioneTreno ? '<br><em>Treno qui</em>' : ''}<br>
      ${fermata.scheduledArrival ? 'Arr: ' + fermata.scheduledArrival : ''}
      ${fermata.scheduledDeparture ? ' Dep: ' + fermata.scheduledDeparture : ''}
      ${ritardoTesto ? '<br><span>' + ritardoTesto + '</span>' : ''}
    `;

    // Creazione e aggiunta del marker alla mappa
    const marker = L.marker([fermata.lat, fermata.lng], { icon: icona })
      .addTo(map)
      .bindPopup(popup);

    // Apre automaticamente il popup sulla posizione attuale del treno
    if (fermata.posizioneTreno) marker.openPopup();

    mapMarkers.push(marker);
  });

  // Disegna la linea tratteggiata (polyline) che collega le fermate
  if (coords.length > 1) {
    routePolyline = L.polyline(coords, {
      color: 'var(--accent, #2563eb)',
      weight: 3,
      opacity: 0.7,
      dashArray: '8 4'
    }).addTo(map);
    // Adatta la visuale della mappa per contenere tutto il percorso
    map.fitBounds(routePolyline.getBounds(), { padding: [30, 30] });
  } else if (coords.length === 1) {
    // Se c'è una sola fermata, centra la mappa su di essa
    map.setView(coords[0], 12);
  }

  // Ricalcola le dimensioni della mappa per risolvere eventuali problemi di rendering in modale
  setTimeout(() => map.invalidateSize(), 100);
}

// ===== UTILITY =====

// Converte testo in HTML sicuro per evitare problemi di sicurezza (XSS)
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
