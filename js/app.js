// Logica principale di BinarioLive
// Gestisce la ricerca stazioni, il caricamento dei treni e il meteo

const API = 'api/proxy.php';
const SOGLIA_RITARDO = 10;     // Minuti: se un treno supera questa soglia, mostra notifica
let stazioneCorrente = null;
let tabCorrente = 'departures';
let timerStazione = null;
let timerTreno = null;

// Avvio: quando la pagina è pronta, inizializza tema, lingua e eventi
document.addEventListener('DOMContentLoaded', () => {
  inizializzaTema();
  inizializzaLingua();
  collegaEventi();
  mostraStazioniRecenti();
  updateAllTranslations();
  aggiornaCampo();
  caricaNews();
  setInterval(aggiornaCampo, 60000); // aggiorna il contatore ogni minuto
});

// ===== TEMA CHIARO / SCURO =====

function inizializzaTema() {
  const tema = localStorage.getItem('bl_theme') || 'light';
  document.documentElement.setAttribute('data-theme', tema);
}

function cambiaTema() {
  const temaCorrente = document.documentElement.getAttribute('data-theme');
  const nuovoTema = temaCorrente === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nuovoTema);
  localStorage.setItem('bl_theme', nuovoTema);
}

// ===== LINGUA =====

function inizializzaLingua() {
  const lingua = localStorage.getItem('bl_lang') || 'it';
  currentLang = lingua;
  document.documentElement.lang = lingua;
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lingua);
  });
}

// ===== EVENTI =====

function collegaEventi() {
  // Toggle tema
  document.getElementById('themeToggle').addEventListener('click', cambiaTema);

  // Pulsanti lingua
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setLang(btn.dataset.lang);
      if (stazioneCorrente) caricaTreni();
    });
  });

  // Campo ricerca stazione: aspetta 250ms prima di fare la ricerca
  const campoStazione = document.getElementById('stationSearch');
  campoStazione.addEventListener('input', () => {
    clearTimeout(timerStazione);
    timerStazione = setTimeout(() => autocompletaStazione(campoStazione.value), 250);
  });
  campoStazione.addEventListener('focus', () => {
    if (campoStazione.value.length >= 2) autocompletaStazione(campoStazione.value);
  });

  // Campo ricerca treno
  const campoTreno = document.getElementById('trainSearch');
  campoTreno.addEventListener('input', () => {
    clearTimeout(timerTreno);
    timerTreno = setTimeout(() => autocompletaTreno(campoTreno.value), 300);
  });
  campoTreno.addEventListener('focus', () => {
    if (campoTreno.value.length >= 1) autocompletaTreno(campoTreno.value);
  });

  // Chiudi i dropdown quando si clicca fuori
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
      document.querySelectorAll('.autocomplete-list').forEach(l => l.classList.remove('show'));
    }
  });

  // Chiudi modal con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      chiudiModal();
    }
  });

  // Pulsanti tab Partenze / Arrivi
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabCorrente = btn.dataset.tab;
      if (stazioneCorrente) caricaTreni();
    });
  });
}

// ===== AUTOCOMPLETAMENTO STAZIONE =====

async function autocompletaStazione(query) {
  const lista = document.getElementById('stationList');
  if (query.length < 2) { lista.classList.remove('show'); return; }
  try {
    const risposta = await fetch(`${API}?action=autocomplete&q=${encodeURIComponent(query)}`);
    const stazioni = await risposta.json();
    mostraDropdown(lista, stazioni, selezionaStazione);
  } catch {
    lista.classList.remove('show');
  }
}

// Mostra il dropdown con i risultati dell'autocompletamento
function mostraDropdown(contenitore, elementi, allaClick) {
  if (!elementi.length) { contenitore.classList.remove('show'); return; }
  contenitore.innerHTML = elementi.map((el, i) => `
    <div class="autocomplete-item" data-index="${i}">
      <span>&#128651; ${escapeHtml(el.name)}</span>
      <span class="station-code">${escapeHtml(el.code)}</span>
    </div>
  `).join('');
  contenitore.classList.add('show');
  contenitore.querySelectorAll('.autocomplete-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      allaClick(elementi[i]);
      contenitore.classList.remove('show');
    });
  });
}

// Quando l'utente clicca su una stazione: carica treni, meteo e coordinate mappa
async function selezionaStazione(stazione) {
  stazioneCorrente = stazione;
  document.getElementById('stationSearch').value = stazione.name;
  document.getElementById('stationList').classList.remove('show');
  salvaStazioneRecente(stazione);
  mostraStazioniRecenti();
  caricaTreni();
  caricaMeteo(stazione.code);
  logRicerca(stazione.code, stazione.name, tabCorrente === 'departures' ? 'departure' : 'arrival');

  // Recupera le coordinate GPS per il pulsante mappa
  try {
    const risposta = await fetch(`${API}?action=stationDetail&code=${stazione.code}`);
    const coords = await risposta.json();
    if (coords.lat && coords.lng) {
      stazioneCorrente.lat = coords.lat;
      stazioneCorrente.lng = coords.lng;
    }
  } catch { /* senza coordinate la mappa non sarà disponibile */ }
}

// ===== RICERCA TRENO PER NUMERO =====

async function autocompletaTreno(query) {
  const lista = document.getElementById('trainList');
  if (query.length < 1) { lista.classList.remove('show'); return; }
  try {
    const risposta = await fetch(`${API}?action=searchTrain&num=${encodeURIComponent(query)}`);
    const treni = await risposta.json();
    if (!treni.length) { lista.classList.remove('show'); return; }

    lista.innerHTML = treni.map((treno, i) => `
      <div class="autocomplete-item" data-index="${i}">
        <span>&#128646; ${escapeHtml(treno.display)}</span>
      </div>
    `).join('');
    lista.classList.add('show');

    lista.querySelectorAll('.autocomplete-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        document.getElementById('trainSearch').value = treni[i].display;
        lista.classList.remove('show');
        caricaPercorsoTreno(treni[i].trainNum, treni[i].originCode, treni[i].depDate);
      });
    });
  } catch {
    lista.classList.remove('show');
  }
}

// ===== TABELLA TRENI =====

async function caricaTreni() {
  if (!stazioneCorrente) return;

  const corpo = document.getElementById('trainTableBody');
  const testa = document.getElementById('trainTableHead');
  corpo.innerHTML = `<tr><td colspan="6"><div class="loading-spinner"><div class="spinner"></div> ${t('loading')}</div></td></tr>`;

  // Costruisce la data nel formato che accetta Trenitalia
  const ora = new Date();
  const giorni = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const mesi = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = n => String(n).padStart(2, '0');
  const dataStr = `${giorni[ora.getDay()]} ${mesi[ora.getMonth()]} ${pad(ora.getDate())} ${ora.getFullYear()} ${pad(ora.getHours())}:${pad(ora.getMinutes())}:${pad(ora.getSeconds())} GMT+0200`;

  const azione = tabCorrente === 'departures' ? 'departures' : 'arrivals';
  const colonnaDestinazioneOrigine = tabCorrente === 'departures' ? t('destination') : t('origin');

  testa.innerHTML = `
    <th>${t('train')}</th>
    <th>${colonnaDestinazioneOrigine}</th>
    <th>${t('scheduled')}</th>
    <th class="col-hide-mobile">${t('actual')}</th>
    <th>${t('platform')}</th>
    <th>${t('status')}</th>
  `;

  try {
    const risposta = await fetch(`${API}?action=${azione}&code=${stazioneCorrente.code}&date=${encodeURIComponent(dataStr)}`);
    const treni = await risposta.json();

    if (!Array.isArray(treni) || !treni.length) {
      corpo.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">&#128646;</div><div class="empty-state-text">${t('noTrainsFound')}</div></div></td></tr>`;
      aggiornaStat([]);
      return;
    }

    corpo.innerHTML = treni.map(treno => creaRigaTreno(treno)).join('');

    // Clic su una riga apre il percorso del treno
    corpo.querySelectorAll('tr[data-train]').forEach(riga => {
      riga.addEventListener('click', () => {
        caricaPercorsoTreno(riga.dataset.train, riga.dataset.origin, riga.dataset.dep);
      });
    });

    aggiornaStat(treni);

    // Notifica toast per i treni con ritardo sopra la soglia
    treni.forEach(treno => {
      const ritardo = treno.ritardo ?? 0;
      if (ritardo >= SOGLIA_RITARDO) {
        mostraNotifica(`${t('train')} ${treno.numeroTreno || ''} +${ritardo} ${t('minutes')} ${t('delayed').toLowerCase()}`);
      }
    });
  } catch {
    corpo.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-text">Errore nel caricamento</div></div></td></tr>`;
  }
}

// Crea l'HTML di una singola riga della tabella treni
function creaRigaTreno(treno) {
  const categoria = treno.categoriaDescrizione || treno.categoria || '';
  const classCategoria = getClasseCategoria(treno.categoria || categoria);
  const numero = treno.numeroTreno || '';
  const destinazione = tabCorrente === 'departures' ? (treno.destinazione || '') : (treno.origine || '');
  const previsto = formattaOra(tabCorrente === 'departures' ? treno.orarioPartenza : treno.orarioArrivo);
  const effettivo = formattaOra(tabCorrente === 'departures' ? treno.compOrarioPartenza : treno.compOrarioArrivo);
  const ritardo = treno.ritardo ?? 0;
  const binario = treno.binarioEffettivo || treno.binarioProgrammatoPartenzaDescrizione || '-';
  const codOrigine = treno.codOrigine || '';
  const dataPartenza = treno.dataPartenzaTreno || '';

  // Badge colorato per lo stato
  let stato;
  if (treno.provvedimento === 1 || treno.subTitle?.includes('oppresso')) {
    stato = `<span class="status-badge status-cancelled">&#10005; ${t('cancelled')}</span>`;
  } else if (ritardo > 0) {
    stato = `<span class="status-badge status-delayed">&#9201; +${ritardo} ${t('minutes')}</span>`;
  } else if (ritardo < 0) {
    stato = `<span class="status-badge status-early">&#10003; ${ritardo} ${t('minutes')}</span>`;
  } else {
    stato = `<span class="status-badge status-on-time">&#10003; ${t('onTime')}</span>`;
  }

  return `
    <tr data-train="${numero}" data-origin="${escapeHtml(codOrigine)}" data-dep="${dataPartenza}">
      <td><div class="train-number"><span class="train-category ${classCategoria}">${escapeHtml(categoria)}</span> ${numero}</div></td>
      <td>${escapeHtml(destinazione)}</td>
      <td>${previsto}</td>
      <td class="col-hide-mobile">${effettivo || '-'}</td>
      <td>${escapeHtml(String(binario))}</td>
      <td>${stato}</td>
    </tr>
  `;
}

// ===== PERCORSO TRENO =====

async function caricaPercorsoTreno(numero, codOrigine, dataPartenza) {
  apriModal();
  const corpo = document.getElementById('modalBody');
  corpo.innerHTML = `<div class="loading-spinner"><div class="spinner"></div> ${t('loading')}</div>`;
  document.getElementById('modalTitle').textContent = `${t('trainRoute')} ${numero}`;

  let url = `${API}?action=trainRoute&trainNum=${numero}&originCode=${codOrigine}`;
  if (dataPartenza) url += `&depDate=${encodeURIComponent(dataPartenza)}`;

  try {
    const risposta = await fetch(url);
    const dati = await risposta.json();
    if (dati.error) {
      corpo.innerHTML = `<div class="empty-state"><div class="empty-state-text">${dati.error}</div></div>`;
      return;
    }
    mostraPercorsoTreno(dati, corpo);
  } catch {
    corpo.innerHTML = `<div class="empty-state"><div class="empty-state-text">Errore nel caricamento</div></div>`;
  }
}

// Renderizza il percorso del treno nella modale con la timeline delle fermate
function mostraPercorsoTreno(dati, contenitore) {
  const categoria = dati.categoria || '';
  const descCategoria = dati.categoriaDescrizione || dati.categoria || '';
  const numero = dati.numeroTreno || '';
  const da = dati.origine || '';
  const a = dati.destinazione || '';
  const ritardo = dati.ritardo ?? 0;
  const ultimoRilevamento = dati.stazioneUltimoRilevamento || '';
  const fermate = dati.fermate || [];

  const badgeRitardo = ritardo > 0
    ? `<span class="status-badge status-delayed">+${ritardo} ${t('minutes')}</span>`
    : ritardo < 0
      ? `<span class="status-badge status-early">${ritardo} ${t('minutes')}</span>`
      : `<span class="status-badge status-on-time">${t('onTime')}</span>`;

  let html = `
    <div class="route-info-bar">
      <div class="route-info-item">
        <span class="route-info-label">${t('train')}:</span>
        <span class="train-category ${getClasseCategoria(categoria)}">${escapeHtml(descCategoria)}</span> ${numero}
      </div>
      <div class="route-info-item"><span class="route-info-label">${t('from')}:</span> ${escapeHtml(da)}</div>
      <div class="route-info-item"><span class="route-info-label">${t('to')}:</span> ${escapeHtml(a)}</div>
      <div class="route-info-item">${badgeRitardo}</div>
      ${ultimoRilevamento ? `<div class="route-info-item"><span class="route-info-label">${t('lastUpdate')}:</span> ${escapeHtml(ultimoRilevamento)}</div>` : ''}
    </div>

    <div class="route-timeline">
  `;

  // Dati delle fermate (le coordinate vengono aggiunte dopo)
  const datiPerMappa = [];

  // Trova l'ultima fermata con dati reali (= posizione attuale del treno)
  let indicePosizione = -1;
  fermate.forEach((fermata, i) => {
    if (fermata.actualFermataType === 1 || fermata.arrivoReale != null || fermata.partenzaReale != null) {
      indicePosizione = i;
    }
  });

  fermate.forEach((fermata, i) => {
    const isPrima = i === 0;
    const isUltima = i === fermate.length - 1;
    const passata = fermata.actualFermataType === 1 || fermata.arrivoReale != null || fermata.partenzaReale != null;
    const eCorrente = i === indicePosizione && !isUltima;

    let classe = '';
    if (isPrima) classe = 'first visited';
    else if (isUltima) classe = 'last' + (passata ? ' visited' : '');
    else if (eCorrente) classe = 'current';
    else if (passata) classe = 'visited';

    const arrPrevisto = formattaOra(fermata.arrivo_teorico);
    const depPrevisto = formattaOra(fermata.partenza_teorica);
    const arrReale = formattaOra(fermata.arrivoReale);
    const depReale = formattaOra(fermata.partenzaReale);
    const ritardoFermata = fermata.ritardoArrivo ?? fermata.ritardoPartenza ?? 0;

    let testoRitardo = '';
    if (ritardoFermata > 0) testoRitardo = `<span class="route-stop-delay delay-positive">+${ritardoFermata}'</span>`;
    else if (ritardoFermata < 0) testoRitardo = `<span class="route-stop-delay delay-negative">${ritardoFermata}'</span>`;
    else if (passata) testoRitardo = `<span class="route-stop-delay delay-zero">0'</span>`;

    const binario = fermata.binarioEffettivoArrivoDescrizione || fermata.binarioEffettivoPartenzaDescrizione || fermata.binarioProgrammatoArrivoDescrizione || '';

    html += `
      <div class="route-stop ${classe}" style="animation-delay: ${i * 0.05}s">
        <div class="route-stop-name">${escapeHtml(fermata.stazione || '')}</div>
        <div class="route-stop-times">
          ${!isPrima && arrPrevisto ? `<span>${t('arrivalTime')}: ${arrPrevisto}${arrReale ? ' → ' + arrReale : ''}</span>` : ''}
          ${!isUltima && depPrevisto ? `<span>${t('departureTime')}: ${depPrevisto}${depReale ? ' → ' + depReale : ''}</span>` : ''}
          ${isPrima && depPrevisto ? `<span>${t('departureTime')}: ${depPrevisto}${depReale ? ' → ' + depReale : ''}</span>` : ''}
          ${isUltima && arrPrevisto ? `<span>${t('arrivalTime')}: ${arrPrevisto}${arrReale ? ' → ' + arrReale : ''}</span>` : ''}
          ${testoRitardo}
          ${binario ? `<span>&#128678; ${binario}</span>` : ''}
        </div>
      </div>
    `;

    datiPerMappa.push({
      codiceFermata: fermata.id || '',
      name: fermata.stazione,
      scheduledArrival: arrPrevisto,
      scheduledDeparture: depPrevisto,
      actualArrival: arrReale,
      actualDeparture: depReale,
      delay: ritardoFermata,
      posizioneTreno: eCorrente  // true se il treno si trova qui
    });
  });

  html += '</div>';
  contenitore.innerHTML = html;

  // Recupera le coordinate GPS delle fermate in background
  window._fermateCorrente = [];
  caricaCoordinateFermate(datiPerMappa);
}

// Recupera le coordinate GPS di tutte le fermate tramite la chiamata batch
async function caricaCoordinateFermate(fermate) {
  const codici = fermate.map(f => f.codiceFermata).filter(Boolean);
  if (!codici.length) return;

  try {
    const risposta = await fetch(`${API}?action=stationDetail&codes=${codici.join(',')}`);
    const coordinate = await risposta.json();

    // Aggiunge lat e lng a ogni fermata che ha le coordinate
    const fermateConCoordinate = [];
    fermate.forEach(fermata => {
      const coords = coordinate[fermata.codiceFermata];
      if (coords && coords.lat && coords.lng) {
        fermateConCoordinate.push({
          name: fermata.name,
          lat: coords.lat,
          lng: coords.lng,
          scheduledArrival: fermata.scheduledArrival,
          scheduledDeparture: fermata.scheduledDeparture,
          actualArrival: fermata.actualArrival,
          actualDeparture: fermata.actualDeparture,
          delay: fermata.delay,
          posizioneTreno: fermata.posizioneTreno || false
        });
      }
    });

    window._fermateCorrente = fermateConCoordinate;

    // Mostra automaticamente sulla mappa se ci sono coordinate
    if (fermateConCoordinate.length > 0) {
      showTrainRouteOnMap(fermateConCoordinate);
    }
  } catch {
    /* coordinate non disponibili */
  }
}

// Mostra il percorso del treno sulla mappa
function mostraMappa() {
  if (window._fermateCorrente && window._fermateCorrente.length) {
    showTrainRouteOnMap(window._fermateCorrente);
  }
}

// ===== METEO =====

async function caricaMeteo(codiceStazione) {
  const contenitore = document.getElementById('weatherWidget');
  contenitore.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

  try {
    const risposta = await fetch(`${API}?action=weather&code=${codiceStazione}`);
    const dati = await risposta.json();

    if (dati.error) {
      contenitore.innerHTML = `<div class="weather-widget"><div class="weather-icon">&#9729;&#65039;</div><div class="weather-info"><div class="weather-desc">${t('weatherUnavailable')}</div></div></div>`;
      return;
    }

    if (dati.source === 'openweathermap') {
      // Meteo da OpenWeatherMap
      const urlIcona = `https://openweathermap.org/img/wn/${dati.icon}@2x.png`;
      contenitore.innerHTML = `
        <div class="weather-widget">
          <img src="${urlIcona}" alt="meteo" class="weather-icon" width="60" height="60">
          <div class="weather-info">
            <div class="weather-temp">${Math.round(dati.temp)}°C</div>
            <div class="weather-desc">${escapeHtml(dati.description)}</div>
            <div class="weather-details">
              <span>&#128167; ${dati.humidity}%</span>
              <span>&#127788;&#65039; ${dati.wind} m/s</span>
            </div>
          </div>
        </div>
      `;
    } else {
      // Meteo da Trenitalia
      const icona = getEmojiMeteo(dati.descrizione || '');
      const dettagliTemp = [];
      if (dati.tempMattino != null) dettagliTemp.push(`&#127749; ${dati.tempMattino}°`);
      if (dati.tempPomeriggio != null) dettagliTemp.push(`&#9728;&#65039; ${dati.tempPomeriggio}°`);
      if (dati.tempSera != null) dettagliTemp.push(`&#127747; ${dati.tempSera}°`);
      contenitore.innerHTML = `
        <div class="weather-widget">
          <div class="weather-icon">${icona}</div>
          <div class="weather-info">
            <div class="weather-temp">${dati.temperatura != null ? dati.temperatura + '°C' : '--'}</div>
            <div class="weather-desc">${escapeHtml(dati.descrizione || '')}</div>
            <div class="weather-details">${dettagliTemp.join(' &nbsp; ')}</div>
          </div>
        </div>
      `;
    }
  } catch {
    contenitore.innerHTML = `<div class="weather-widget"><div class="weather-icon">&#9729;&#65039;</div><div class="weather-info"><div class="weather-desc">${t('weatherUnavailable')}</div></div></div>`;
  }
}

// Restituisce l'emoji giusta in base alla descrizione del meteo
function getEmojiMeteo(desc) {
  const d = desc.toLowerCase();
  if (d.includes('sereno') || d.includes('sole')) return '☀️';
  if (d.includes('nuvoloso') || d.includes('coperto')) return '☁️';
  if (d.includes('pioggia')) return '🌧️';
  if (d.includes('temporale')) return '⛈️';
  if (d.includes('neve')) return '🌨️';
  if (d.includes('nebbia')) return '🌫️';
  return '🌤️';
}

// ===== STATISTICHE =====

// Conta i treni in orario, in ritardo e soppressi e aggiorna i contatori
function aggiornaStat(treni) {
  let inOrario = 0, inRitardo = 0, soppressi = 0;
  treni.forEach(treno => {
    if (treno.provvedimento === 1 || treno.subTitle?.includes('oppresso')) soppressi++;
    else if ((treno.ritardo ?? 0) > 0) inRitardo++;
    else inOrario++;
  });
  document.getElementById('statTotal').textContent = treni.length;
  document.getElementById('statOnTime').textContent = inOrario;
  document.getElementById('statDelayed').textContent = inRitardo;
  document.getElementById('statCancelled').textContent = soppressi;
}

// Aggiorna il contatore "treni circolanti" nell'header con dati reali
async function aggiornaCampo() {
  const el = document.getElementById('liveCounter');
  if (!el) return;
  
  try {
    const risposta = await fetch(`${API}?action=statistiche`);
    const dati = await risposta.json();
    const totale = dati.treniCircolanti || dati.numeroTreniCircolanti || 0;
    
    if (totale > 0) {
      el.textContent = totale;
    } else if (el.textContent === '--') {
      el.textContent = '...';
    }
  } catch {
    if (el.textContent === '--') el.textContent = 'N/A';
  }
}

// ===== STAZIONI RECENTI =====

function salvaStazioneRecente(stazione) {
  let recenti = JSON.parse(localStorage.getItem('bl_recent') || '[]');
  recenti = recenti.filter(s => s.code !== stazione.code); // rimuovi se già presente
  recenti.unshift({ name: stazione.name, code: stazione.code }); // aggiungi in cima
  if (recenti.length > 8) recenti = recenti.slice(0, 8); // massimo 8
  localStorage.setItem('bl_recent', JSON.stringify(recenti));
}

function mostraStazioniRecenti() {
  const contenitore = document.getElementById('recentStations');
  const recenti = JSON.parse(localStorage.getItem('bl_recent') || '[]');
  if (!recenti.length) { contenitore.innerHTML = ''; return; }

  contenitore.innerHTML = `
    <span class="recent-label" data-i18n="recentStations">${t('recentStations')}:</span>
    ${recenti.map(s => `<span class="recent-chip" data-code="${escapeHtml(s.code)}" data-name="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span>`).join('')}
  `;

  contenitore.querySelectorAll('.recent-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selezionaStazione({ name: chip.dataset.name, code: chip.dataset.code });
    });
  });
}

// ===== MODAL PERCORSO =====

function apriModal() {
  document.getElementById('routeModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function chiudiModal() {
  document.getElementById('routeModal').classList.remove('show');
  document.body.style.overflow = '';
  if (typeof clearMap === 'function') clearMap();
}

// ===== NOTIFICHE TOAST =====

// Mostra una notifica temporanea in alto a destra
function mostraNotifica(messaggio) {
  const contenitore = document.getElementById('toastContainer');
  if (!contenitore) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">&#9888;&#65039;</span> ${escapeHtml(messaggio)}`;
  contenitore.appendChild(toast);
  // Dopo 4 secondi, rimuovi la notifica con animazione
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ===== NEWS IN TEMPO REALE =====

let listaNews = [];
let indiceNews = 0;

// Carica le notizie dall'endpoint news di Trenitalia
async function caricaNews() {
  const contenitore = document.getElementById('newsContent');
  if (!contenitore) return;
  contenitore.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

  try {
    const risposta = await fetch(`${API}?action=news`);
    const notizie = await risposta.json();

    if (!Array.isArray(notizie) || !notizie.length) {
      contenitore.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;">${t('noResults')}</div>`;
      return;
    }

    listaNews = notizie;
    indiceNews = 0;
    mostraNewsCorrente();
  } catch {
    contenitore.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;">${t('noResults')}</div>`;
  }
}

// Mostra la notizia all'indice corrente
function mostraNewsCorrente() {
  const contenitore = document.getElementById('newsContent');
  const contatore = document.getElementById('newsCounter');
  if (!contenitore || !listaNews.length) return;

  const news = listaNews[indiceNews];
  contenitore.innerHTML = `
    <div class="news-item" onclick="this.classList.toggle('expanded')">
      <div class="news-title">${escapeHtml(news.titolo || '')}</div>
      <div class="news-desc">${escapeHtml(news.testo || '')}</div>
    </div>
  `;

  if (contatore) contatore.textContent = `${indiceNews + 1}/${listaNews.length}`;
  document.getElementById('newsPrev').disabled = indiceNews === 0;
  document.getElementById('newsNext').disabled = indiceNews === listaNews.length - 1;
}

// Cambia notizia avanti (+1) o indietro (-1)
function cambiaNews(direzione) {
  indiceNews += direzione;
  if (indiceNews < 0) indiceNews = 0;
  if (indiceNews >= listaNews.length) indiceNews = listaNews.length - 1;
  mostraNewsCorrente();
}

// ===== FUNZIONI DI SUPPORTO =====

// Converte un timestamp in orario leggibile (es. 1776290400000 -> "17:00")
function formattaOra(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(currentLang === 'it' ? 'it-IT' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Restituisce la classe CSS per il badge della categoria del treno
function getClasseCategoria(cat) {
  if (!cat) return 'cat-default';
  const c = cat.toUpperCase().trim();
  if (c.includes('FR') || c.includes('FRECCIAROSSA')) return 'cat-fr';
  if (c.includes('FB') || c.includes('FRECCIABIANCA')) return 'cat-fb';
  if (c === 'IC' || c.includes('INTERCITY')) return 'cat-ic';
  if (c === 'ICN') return 'cat-icn';
  if (c.includes('EC') || c.includes('EUROCITY')) return 'cat-ec';
  if (c.includes('AV')) return 'cat-av';
  if (c.includes('REG') || c.includes('RE') || c === 'R') return 'cat-reg';
  return 'cat-default';
}

// Trasforma testo normale in HTML sicuro (previene attacchi XSS)
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Salva nel database la ricerca effettuata (per statistiche)
async function logRicerca(codice, nome, tipo) {
  try {
    await fetch(`${API}?action=logSearch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codice, name: nome, type: tipo })
    });
  } catch { /* ignora errori di log */ }
}
