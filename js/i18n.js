// Gestione bilingue italiano/inglese.
// Ogni testo dell'interfaccia ha una chiave (es. 'departures')
// e viene tradotto nella lingua scelta dall'utente.

// ===== DIZIONARIO TRADUZIONI =====

const I18N = {
  // Traduzioni in Italiano
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
    news: 'Notizie',
    Sereno: 'Sereno',
    'Poco nuvoloso': 'Poco nuvoloso',
    Nuvoloso: 'Nuvoloso',
    'Molto nuvoloso': 'Molto nuvoloso',
    Coperto: 'Coperto',
    Nebbia: 'Nebbia',
    'Pioggia leggera': 'Pioggia leggera',
    Pioggia: 'Pioggia',
    'Pioggia forte': 'Pioggia forte',
    Temporale: 'Temporale',
    Neve: 'Neve',
    Variabile: 'Variabile',
  },
  // Traduzioni in Inglese
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
    news: 'News',
    Sereno: 'Clear',
    'Poco nuvoloso': 'Partly Cloudy',
    Nuvoloso: 'Cloudy',
    'Molto nuvoloso': 'Mostly Cloudy',
    Coperto: 'Overcast',
    Nebbia: 'Fog',
    'Pioggia leggera': 'Light Rain',
    Pioggia: 'Rain',
    'Pioggia forte': 'Heavy Rain',
    Temporale: 'Thunderstorm',
    Neve: 'Snow',
    Variabile: 'Variable',
  }
};

// ===== STATO INTERNAZIONALIZZAZIONE =====

// Lingua attuale: letta dal localStorage o italiano di default
let currentLang = localStorage.getItem('bl_lang') || 'it';

// ===== FUNZIONI DI TRADUZIONE =====

// Restituisce il testo nella lingua corrente, con fallback all'italiano
function t(key) {
  return I18N[currentLang]?.[key] ?? I18N.it[key] ?? key;
}

// Cambia la lingua e aggiorna tutti i testi della pagina
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('bl_lang', lang);
  document.documentElement.lang = lang;
  updateAllTranslations();
}

// Aggiorna tutti gli elementi HTML che hanno l'attributo data-i18n
function updateAllTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    // Gestione specifica per i placeholder degli input
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = t(key);
    } else {
      el.textContent = t(key);
    }
  });
}
