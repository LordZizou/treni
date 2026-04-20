// ============================================================
// BinarioLive - Sistema di internazionalizzazione (i18n)
// Gestisce il supporto bilingue Italiano/Inglese.
// Ogni chiave corrisponde a un testo dell'interfaccia,
// e viene usata negli elementi HTML tramite l'attributo data-i18n.
// La lingua scelta viene salvata in localStorage per persistere
// tra le sessioni del browser.
// ============================================================

// Dizionario delle traduzioni: contiene tutte le stringhe dell'interfaccia
// in italiano (it) e inglese (en). Per aggiungere una nuova lingua,
// basta aggiungere un nuovo oggetto con le stesse chiavi.
const I18N = {
  // --- Traduzioni Italiano ---
  it: {
    appName: 'BinarioLive',
    tagline: 'Monitoraggio treni in tempo reale',
    searchStation: 'Cerca stazione...',
    searchTrain: 'Cerca numero treno...',
    departures: 'Partenze',
    arrivals: 'Arrivi',
    train: 'Treno',
    destination: 'Destinazione',
    origin: 'Provenienza',
    scheduled: 'Previsto',
    actual: 'Effettivo',
    delay: 'Ritardo',
    status: 'Stato',
    platform: 'Binario',
    onTime: 'In orario',
    delayed: 'In ritardo',
    cancelled: 'Soppresso',
    departed: 'Partito',
    notDeparted: 'Non partito',
    arrived: 'Arrivato',
    minutes: 'min',
    trainRoute: 'Percorso treno',
    station: 'Stazione',
    arrivalTime: 'Arrivo',
    departureTime: 'Partenza',
    recentStations: 'Stazioni recenti',
    noResults: 'Nessun risultato trovato',
    loading: 'Caricamento...',
    liveTrains: 'Treni circolanti',
    stats: 'Statistiche',
    weather: 'Meteo',
    temperature: 'Temperatura',
    humidity: 'Umidità',
    wind: 'Vento',
    dark: 'Scuro',
    light: 'Chiaro',
    language: 'Lingua',
    map: 'Mappa',
    trainOnMap: 'Treno sulla mappa',
    stationMap: 'Mappa stazione',
    noTrainsFound: 'Nessun treno trovato',
    trainDetails: 'Dettagli treno',
    category: 'Categoria',
    from: 'Da',
    to: 'A',
    lastUpdate: 'Ultimo aggiornamento',
    close: 'Chiudi',
    searchByTrain: 'Cerca per numero treno',
    searchByStation: 'Cerca per stazione',
    weatherUnavailable: 'Meteo non disponibile',
    early: 'In anticipo',
    regularTrain: 'Treno regionale',
    showOnMap: 'Mostra sulla mappa',
    stops: 'fermate',
  },
  // --- Traduzioni Inglese ---
  en: {
    appName: 'BinarioLive',
    tagline: 'Real-time train monitoring',
    searchStation: 'Search station...',
    searchTrain: 'Search train number...',
    departures: 'Departures',
    arrivals: 'Arrivals',
    train: 'Train',
    destination: 'Destination',
    origin: 'Origin',
    scheduled: 'Scheduled',
    actual: 'Actual',
    delay: 'Delay',
    status: 'Status',
    platform: 'Platform',
    onTime: 'On time',
    delayed: 'Delayed',
    cancelled: 'Cancelled',
    departed: 'Departed',
    notDeparted: 'Not departed',
    arrived: 'Arrived',
    minutes: 'min',
    trainRoute: 'Train route',
    station: 'Station',
    arrivalTime: 'Arrival',
    departureTime: 'Departure',
    recentStations: 'Recent stations',
    noResults: 'No results found',
    loading: 'Loading...',
    liveTrains: 'Trains running',
    stats: 'Statistics',
    weather: 'Weather',
    temperature: 'Temperature',
    humidity: 'Humidity',
    wind: 'Wind',
    dark: 'Dark',
    light: 'Light',
    language: 'Language',
    map: 'Map',
    trainOnMap: 'Train on map',
    stationMap: 'Station map',
    noTrainsFound: 'No trains found',
    trainDetails: 'Train details',
    category: 'Category',
    from: 'From',
    to: 'To',
    lastUpdate: 'Last update',
    close: 'Close',
    searchByTrain: 'Search by train number',
    searchByStation: 'Search by station',
    weatherUnavailable: 'Weather unavailable',
    early: 'Early',
    regularTrain: 'Regional train',
    showOnMap: 'Show on map',
    stops: 'stops',
  },
};

// Lingua corrente: carica dal localStorage oppure usa italiano come default
let currentLang = localStorage.getItem('bl_lang') || 'it';

/**
 * Funzione di traduzione: data una chiave, restituisce il testo
 * nella lingua corrente. Se la chiave non esiste nella lingua corrente,
 * cerca in italiano come fallback. Se non esiste nemmeno li', restituisce la chiave stessa.
 *
 * @param {string} key - La chiave di traduzione (es. 'departures')
 * @returns {string} Il testo tradotto nella lingua corrente
 */
function t(key) {
  return I18N[currentLang]?.[key] ?? I18N.it[key] ?? key;
}

/**
 * Cambia la lingua dell'interfaccia.
 * Salva la scelta in localStorage per mantenerla nelle sessioni future,
 * aggiorna l'attributo lang dell'HTML e riapplica tutte le traduzioni.
 *
 * @param {string} lang - Codice lingua ('it' oppure 'en')
 */
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('bl_lang', lang);
  document.documentElement.lang = lang;  // Aggiorna l'attributo lang del tag <html>
  updateAllTranslations();               // Riapplica tutte le traduzioni nell'interfaccia
}

/**
 * Aggiorna tutti gli elementi dell'interfaccia che hanno l'attributo data-i18n.
 * Per ogni elemento trovato:
 * - Se e' un campo di input/textarea: aggiorna il placeholder
 * - Altrimenti: aggiorna il testo visibile (textContent)
 *
 * Esempio HTML: <span data-i18n="departures">Partenze</span>
 * Dopo il cambio lingua in EN diventa: <span data-i18n="departures">Departures</span>
 */
function updateAllTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = t(key);  // Per gli input aggiorna il placeholder
    } else {
      el.textContent = t(key);  // Per gli altri elementi aggiorna il testo
    }
  });
}
