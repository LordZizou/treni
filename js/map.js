// ============================================================
// BinarioLive - Gestione Mappa (Leaflet.js)
// Questo modulo gestisce la mappa interattiva che mostra:
// 1. La posizione di una stazione selezionata
// 2. Il percorso completo di un treno con tutte le fermate
// Utilizza la libreria Leaflet.js con le mappe di OpenStreetMap.
// ============================================================

// --- Variabili globali della mappa ---
let map = null;              // Istanza della mappa Leaflet (null finche' non viene inizializzata)
let mapMarkers = [];         // Array di tutti i marker (punti) attualmente sulla mappa
let routePolyline = null;    // Linea del percorso treno (polyline) sulla mappa

/**
 * Inizializza la mappa Leaflet.
 * Viene chiamata solo la prima volta che si deve mostrare la mappa.
 * Centra la vista sull'Italia (coordinate di Roma) con zoom 6 (visione nazionale).
 * Aggiunge il layer delle tiles (immagini) di OpenStreetMap.
 */
function initMap() {
  if (map) return;  // Se la mappa esiste gia', non ricreala
  // Crea la mappa nel div con id 'mapContainer', centrata su Roma
  map = L.map('mapContainer').setView([41.9028, 12.4964], 6);
  // Aggiunge il layer di OpenStreetMap come sfondo cartografico
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,  // Zoom massimo consentito
  }).addTo(map);
}

/**
 * Rimuove tutti i marker e la polyline dalla mappa.
 * Viene chiamata prima di aggiungere nuovi elementi,
 * per evitare che si sovrappongano a quelli precedenti.
 */
function clearMap() {
  // Rimuove tutti i marker uno per uno
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  // Rimuove la linea del percorso se presente
  if (routePolyline) {
    map.removeLayer(routePolyline);
    routePolyline = null;
  }
}

/**
 * Mostra una singola stazione sulla mappa con un marker e un popup.
 * Viene chiamata quando l'utente clicca il pulsante "Mappa" nell'interfaccia.
 *
 * @param {string} name - Nome della stazione da mostrare
 * @param {number} lat  - Latitudine della stazione
 * @param {number} lng  - Longitudine della stazione
 */
function showStationOnMap(name, lat, lng) {
  if (!map) initMap();  // Inizializza la mappa se non esiste ancora
  clearMap();           // Pulisce la mappa da elementi precedenti

  // Crea un marker nella posizione della stazione con un popup che mostra il nome
  const marker = L.marker([lat, lng])
    .addTo(map)
    .bindPopup(`<strong>${escapeHtml(name)}</strong>`)
    .openPopup();  // Apre il popup automaticamente
  mapMarkers.push(marker);
  // Centra la mappa sulla stazione con zoom 13 (livello citta')
  map.setView([lat, lng], 13);
  showMapPanel();  // Mostra il pannello della mappa
}

/**
 * Mostra il percorso completo di un treno sulla mappa.
 * Disegna una linea tratteggiata che collega tutte le fermate,
 * con marker diversi per: stazioni intermedie, stazione corrente,
 * prima e ultima fermata.
 *
 * @param {Array} stops - Array di fermate, ciascuna con: name, lat, lng,
 *                        scheduledArrival, scheduledDeparture, actualArrival,
 *                        actualDeparture, delay
 */
function showTrainRouteOnMap(stops) {
  if (!map) initMap();
  clearMap();

  const coords = [];  // Array di coordinate per la polyline

  // Icona per la prima e ultima fermata (partenza/capolinea) - piu' grande e blu
  const trainIcon = L.divIcon({
    className: 'train-map-icon',
    html: '<span class="train-marker"></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],  // Punto di ancoraggio al centro dell'icona
  });

  // Icona per le fermate intermedie - piu' piccola e grigia
  const stationIcon = L.divIcon({
    className: 'station-map-icon',
    html: '<span class="station-marker"></span>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  // Icona per la fermata in cui si trova attualmente il treno - verde con animazione pulsante
  const currentStationIcon = L.divIcon({
    className: 'station-map-icon current',
    html: '<span class="station-marker current"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  // Cicla su tutte le fermate e crea un marker per ciascuna
  stops.forEach((stop, i) => {
    // Salta le fermate senza coordinate GPS
    if (!stop.lat || !stop.lng) return;
    coords.push([stop.lat, stop.lng]);

    // Determina quale icona usare in base alla posizione della fermata
    const isCurrent = stop.actualDeparture && !stop.actualArrival && i > 0;
    const icon = isCurrent ? currentStationIcon :
                 (i === 0 || i === stops.length - 1) ? trainIcon : stationIcon;

    // Prepara il testo del ritardo per il popup
    const delayText = stop.delay > 0 ? ` (+${stop.delay} min)` :
                      stop.delay < 0 ? ` (${stop.delay} min)` : '';

    // Contenuto HTML del popup che appare cliccando sul marker
    const popup = `
      <strong>${escapeHtml(stop.name)}</strong><br>
      ${stop.scheduledArrival ? 'Arr: ' + stop.scheduledArrival : ''}
      ${stop.scheduledDeparture ? ' Dep: ' + stop.scheduledDeparture : ''}
      ${delayText ? '<br><span class="delay-text">' + delayText + '</span>' : ''}
    `;

    // Crea il marker sulla mappa con l'icona e il popup appropriati
    const marker = L.marker([stop.lat, stop.lng], { icon })
      .addTo(map)
      .bindPopup(popup);
    mapMarkers.push(marker);
  });

  // Se ci sono almeno 2 fermate con coordinate, disegna la linea del percorso
  if (coords.length > 1) {
    // Crea una polyline (linea tratteggiata) che collega tutte le fermate
    routePolyline = L.polyline(coords, {
      color: 'var(--accent, #2563eb)',  // Colore del tema (blu)
      weight: 3,                        // Spessore della linea
      opacity: 0.7,                     // Trasparenza
      dashArray: '8 4',                 // Pattern tratteggiato: 8px linea, 4px vuoto
    }).addTo(map);
    // Adatta automaticamente lo zoom per mostrare tutto il percorso
    map.fitBounds(routePolyline.getBounds(), { padding: [30, 30] });
  } else if (coords.length === 1) {
    // Se c'e' solo una fermata, centra su quella
    map.setView(coords[0], 12);
  }

  showMapPanel();
}

/**
 * Mostra il pannello della mappa in basso nella pagina.
 * Aggiunge la classe CSS 'active' che fa espandere il pannello.
 * Dopo 300ms (durata dell'animazione CSS) chiama invalidateSize()
 * per ricalcolare le dimensioni della mappa nel nuovo contenitore.
 */
function showMapPanel() {
  const panel = document.getElementById('mapPanel');
  if (panel) {
    panel.classList.add('active');
    // invalidateSize() e' necessario perche' Leaflet deve ricalcolare
    // le dimensioni quando il contenitore cambia dimensione
    setTimeout(() => map.invalidateSize(), 300);
  }
}

/**
 * Nasconde il pannello della mappa rimuovendo la classe 'active'.
 * L'animazione CSS fa scorrere il pannello verso il basso.
 */
function hideMapPanel() {
  const panel = document.getElementById('mapPanel');
  if (panel) panel.classList.remove('active');
}

/**
 * Converte una stringa in HTML sicuro per prevenire attacchi XSS.
 * Utilizza la proprieta' textContent del DOM che automaticamente
 * effettua l'escaping dei caratteri speciali HTML (<, >, &, ", ').
 *
 * @param {string} str - Stringa da rendere sicura
 * @returns {string} Stringa con caratteri HTML escapati
 */
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
