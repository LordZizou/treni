const API = 'api/proxy.php';
let currentStation = null;
let currentTab = 'departures';
let debounceTimer = null;
let trainDebounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLang();
  bindEvents();
  renderRecentStations();
  updateAllTranslations();
  updateLiveCounter();
  setInterval(updateLiveCounter, 60000);
});

/* ==================== Theme ==================== */
function initTheme() {
  const saved = localStorage.getItem('bl_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('bl_theme', next);
}

/* ==================== Language ==================== */
function initLang() {
  const saved = localStorage.getItem('bl_lang') || 'it';
  currentLang = saved;
  document.documentElement.lang = saved;
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === saved);
  });
}

/* ==================== Events ==================== */
function bindEvents() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setLang(btn.dataset.lang);
      if (currentStation) loadTrains();
    });
  });

  const stationInput = document.getElementById('stationSearch');
  stationInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => autocompleteStation(stationInput.value), 250);
  });
  stationInput.addEventListener('focus', () => {
    if (stationInput.value.length >= 2) autocompleteStation(stationInput.value);
  });

  const trainInput = document.getElementById('trainSearch');
  trainInput.addEventListener('input', () => {
    clearTimeout(trainDebounceTimer);
    trainDebounceTimer = setTimeout(() => autocompleteTrain(trainInput.value), 300);
  });
  trainInput.addEventListener('focus', () => {
    if (trainInput.value.length >= 1) autocompleteTrain(trainInput.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
      document.querySelectorAll('.autocomplete-list').forEach(l => l.classList.remove('show'));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      hideMapPanel();
    }
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      if (currentStation) loadTrains();
    });
  });
}

/* ==================== Station Autocomplete ==================== */
async function autocompleteStation(query) {
  const list = document.getElementById('stationList');
  if (query.length < 2) { list.classList.remove('show'); return; }

  try {
    const res = await fetch(`${API}?action=autocomplete&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderAutocomplete(list, data, selectStation);
  } catch {
    list.classList.remove('show');
  }
}

function renderAutocomplete(container, items, onSelect) {
  if (!items.length) { container.classList.remove('show'); return; }
  container.innerHTML = items.map((item, i) => `
    <div class="autocomplete-item" data-index="${i}">
      <span>&#128651; ${escapeHtml(item.name)}</span>
      <span class="station-code">${escapeHtml(item.code)}</span>
    </div>
  `).join('');
  container.classList.add('show');

  container.querySelectorAll('.autocomplete-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      onSelect(items[i]);
      container.classList.remove('show');
    });
  });
}

// Seleziona una stazione: salva i dati, carica treni/meteo,
// e recupera le coordinate GPS per la mappa
async function selectStation(station) {
  currentStation = station;
  document.getElementById('stationSearch').value = station.name;
  document.getElementById('stationList').classList.remove('show');
  saveRecentStation(station);
  renderRecentStations();
  loadTrains();
  loadWeather(station.code);
  logSearch(station.code, station.name, currentTab === 'departures' ? 'departure' : 'arrival');

  // Recupera le coordinate GPS della stazione per la mappa
  try {
    const res = await fetch(`${API}?action=stationDetail&code=${station.code}`);
    const coords = await res.json();
    if (coords.lat && coords.lng) {
      currentStation.lat = coords.lat;
      currentStation.lng = coords.lng;
    }
  } catch { /* la mappa funzionera' senza coordinate */ }
}

/* ==================== Train Search ==================== */
async function autocompleteTrain(query) {
  const list = document.getElementById('trainList');
  if (query.length < 1) { list.classList.remove('show'); return; }

  try {
    const res = await fetch(`${API}?action=searchTrain&num=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.length) { list.classList.remove('show'); return; }

    list.innerHTML = data.map((item, i) => `
      <div class="autocomplete-item" data-index="${i}">
        <span>&#128646; ${escapeHtml(item.display)}</span>
      </div>
    `).join('');
    list.classList.add('show');

    list.querySelectorAll('.autocomplete-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        const train = data[i];
        document.getElementById('trainSearch').value = train.display;
        list.classList.remove('show');
        loadTrainRoute(train.trainNum, train.originCode, train.depDate);
      });
    });
  } catch {
    list.classList.remove('show');
  }
}

/* ==================== Load Trains ==================== */
async function loadTrains() {
  if (!currentStation) return;
  const tableBody = document.getElementById('trainTableBody');
  const tableHead = document.getElementById('trainTableHead');

  tableBody.innerHTML = `<tr><td colspan="6"><div class="loading-spinner"><div class="spinner"></div> ${t('loading')}</div></td></tr>`;

  const now = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${days[now.getDay()]} ${months[now.getMonth()]} ${pad(now.getDate())} ${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} GMT+0200`;
  const action = currentTab === 'departures' ? 'departures' : 'arrivals';

  if (currentTab === 'departures') {
    tableHead.innerHTML = `
      <th>${t('train')}</th>
      <th>${t('destination')}</th>
      <th>${t('scheduled')}</th>
      <th class="col-hide-mobile">${t('actual')}</th>
      <th>${t('platform')}</th>
      <th>${t('status')}</th>
    `;
  } else {
    tableHead.innerHTML = `
      <th>${t('train')}</th>
      <th>${t('origin')}</th>
      <th>${t('scheduled')}</th>
      <th class="col-hide-mobile">${t('actual')}</th>
      <th>${t('platform')}</th>
      <th>${t('status')}</th>
    `;
  }

  try {
    const res = await fetch(`${API}?action=${action}&code=${currentStation.code}&date=${encodeURIComponent(dateStr)}`);
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">&#128646;</div><div class="empty-state-text">${t('noTrainsFound')}</div></div></td></tr>`;
      updateStatsFromTrains([]);
      return;
    }

    tableBody.innerHTML = data.map(train => renderTrainRow(train)).join('');
    tableBody.querySelectorAll('tr[data-train]').forEach(row => {
      row.addEventListener('click', () => {
        const num = row.dataset.train;
        const origin = row.dataset.origin;
        const dep = row.dataset.dep;
        loadTrainRoute(num, origin, dep);
      });
    });

    updateStatsFromTrains(data);
  } catch {
    tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-text">Errore nel caricamento</div></div></td></tr>`;
  }
}

function renderTrainRow(train) {
  const category = train.categoriaDescrizione || train.categoria || '';
  const catClass = getCategoryClass(train.categoria || category);
  const trainNum = train.numeroTreno || '';
  const dest = currentTab === 'departures'
    ? (train.destinazione || '')
    : (train.origine || '');
  const scheduled = formatTime(currentTab === 'departures' ? train.orarioPartenza : train.orarioArrivo);
  const actual = formatTime(currentTab === 'departures' ? train.compOrarioPartenza : train.compOrarioArrivo);
  const delay = train.ritardo ?? 0;
  const platform = train.binarioEffettivo || train.binarioProgrammatoPartenzaDescrizione || '-';
  const originCode = train.codOrigine || '';
  const depDate = train.dataPartenzaTreno || '';

  let statusHtml;
  if (train.provpipivedimento === 1 || train.subTitle?.includes('oppresso')) {
    statusHtml = `<span class="status-badge status-cancelled">&#10005; ${t('cancelled')}</span>`;
  } else if (delay > 0) {
    statusHtml = `<span class="status-badge status-delayed">&#9201; +${delay} ${t('minutes')}</span>`;
  } else if (delay < 0) {
    statusHtml = `<span class="status-badge status-early">&#10003; ${delay} ${t('minutes')}</span>`;
  } else {
    statusHtml = `<span class="status-badge status-on-time">&#10003; ${t('onTime')}</span>`;
  }

  return `
    <tr data-train="${trainNum}" data-origin="${escapeHtml(originCode)}" data-dep="${depDate}">
      <td><div class="train-number"><span class="train-category ${catClass}">${escapeHtml(category)}</span> ${trainNum}</div></td>
      <td>${escapeHtml(dest)}</td>
      <td>${scheduled}</td>
      <td class="col-hide-mobile">${actual || '-'}</td>
      <td>${escapeHtml(String(platform))}</td>
      <td>${statusHtml}</td>
    </tr>
  `;
}

/* ==================== Train Route ==================== */
async function loadTrainRoute(trainNum, originCode, depDate) {
  openModal();
  const body = document.getElementById('modalBody');
  body.innerHTML = `<div class="loading-spinner"><div class="spinner"></div> ${t('loading')}</div>`;
  document.getElementById('modalTitle').textContent = `${t('trainRoute')} ${trainNum}`;

  let url = `${API}?action=trainRoute&trainNum=${trainNum}&originCode=${originCode}`;
  if (depDate) url += `&depDate=${encodeURIComponent(depDate)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      body.innerHTML = `<div class="empty-state"><div class="empty-state-text">${data.error}</div></div>`;
      return;
    }

    renderTrainRoute(data, body);
  } catch {
    body.innerHTML = `<div class="empty-state"><div class="empty-state-text">Errore nel caricamento</div></div>`;
  }
}

// Renderizza il percorso del treno nella modale e prepara i dati per la mappa.
// Raccoglie i codici stazione di tutte le fermate per poter recuperare
// le coordinate GPS tramite l'endpoint stationDetail (batch).
function renderTrainRoute(data, container) {
  const cat = data.categoria || '';
  const catDesc = data.categoriaDescrizione || data.categoria || '';
  const num = data.numeroTreno || '';
  const from = data.origine || '';
  const to = data.destinazione || '';
  const delay = data.ritardo ?? 0;
  const lastUpdate = data.stazioneUltimoRilevamento || '';
  const stops = data.fermate || [];

  const delayBadge = delay > 0
    ? `<span class="status-badge status-delayed">+${delay} ${t('minutes')}</span>`
    : delay < 0
      ? `<span class="status-badge status-early">${delay} ${t('minutes')}</span>`
      : `<span class="status-badge status-on-time">${t('onTime')}</span>`;

  let html = `
    <div class="route-info-bar">
      <div class="route-info-item">
        <span class="route-info-label">${t('train')}:</span>
        <span class="train-category ${getCategoryClass(cat)}">${escapeHtml(catDesc)}</span> ${num}
      </div>
      <div class="route-info-item">
        <span class="route-info-label">${t('from')}:</span> ${escapeHtml(from)}
      </div>
      <div class="route-info-item">
        <span class="route-info-label">${t('to')}:</span> ${escapeHtml(to)}
      </div>
      <div class="route-info-item">${delayBadge}</div>
      ${lastUpdate ? `<div class="route-info-item"><span class="route-info-label">${t('lastUpdate')}:</span> ${escapeHtml(lastUpdate)}</div>` : ''}
    </div>
    <button class="tab-btn" id="routeMapBtn" onclick="showRouteOnMap()" style="margin-bottom:1rem;" disabled>&#128506; ${t('showOnMap')} (${t('loading')})</button>
    <div class="route-timeline">
  `;

  // Dati delle fermate da passare poi alla mappa (verranno arricchiti con le coordinate)
  const mapStopsData = [];

  stops.forEach((stop, i) => {
    const isFirst = i === 0;
    const isLast = i === stops.length - 1;
    const visited = stop.actualFermataType === 1 || stop.arrivoReale != null || stop.partenzaReale != null;
    const isCurrent = visited && i < stops.length - 1 && !stops[i + 1]?.arrivoReale;

    let cls = '';
    if (isFirst) cls = 'first visited';
    else if (isLast) cls = 'last' + (visited ? ' visited' : '');
    else if (isCurrent) cls = 'current';
    else if (visited) cls = 'visited';

    const arrScheduled = formatTime(stop.arrivo_teorico);
    const depScheduled = formatTime(stop.partenza_teorica);
    const arrActual = formatTime(stop.arrivoReale);
    const depActual = formatTime(stop.partenzaReale);
    const stopDelay = stop.ritardoArrivo ?? stop.ritardoPartenza ?? 0;

    let delayStr = '';
    if (stopDelay > 0) delayStr = `<span class="route-stop-delay delay-positive">+${stopDelay}'</span>`;
    else if (stopDelay < 0) delayStr = `<span class="route-stop-delay delay-negative">${stopDelay}'</span>`;
    else if (visited) delayStr = `<span class="route-stop-delay delay-zero">0'</span>`;

    const binario = stop.binarioEffettivoArrivoDescrizione || stop.binarioEffettivoPartenzaDescrizione || stop.binarioProgrammatoArrivoDescrizione || '';

    html += `
      <div class="route-stop ${cls}" style="animation-delay: ${i * 0.05}s">
        <div class="route-stop-name">${escapeHtml(stop.stazione || '')}</div>
        <div class="route-stop-times">
          ${!isFirst && arrScheduled ? `<span>${t('arrivalTime')}: ${arrScheduled}${arrActual ? ' \u2192 ' + arrActual : ''}</span>` : ''}
          ${!isLast && depScheduled ? `<span>${t('departureTime')}: ${depScheduled}${depActual ? ' \u2192 ' + depActual : ''}</span>` : ''}
          ${isFirst && depScheduled ? `<span>${t('departureTime')}: ${depScheduled}${depActual ? ' \u2192 ' + depActual : ''}</span>` : ''}
          ${isLast && arrScheduled ? `<span>${t('arrivalTime')}: ${arrScheduled}${arrActual ? ' \u2192 ' + arrActual : ''}</span>` : ''}
          ${delayStr}
          ${binario ? `<span>&#128678; ${binario}</span>` : ''}
        </div>
      </div>
    `;

    // Salva i dati della fermata (le coordinate verranno aggiunte dopo)
    mapStopsData.push({
      stationCode: stop.id || '',
      name: stop.stazione,
      scheduledArrival: arrScheduled,
      scheduledDeparture: depScheduled,
      actualArrival: arrActual,
      actualDeparture: depActual,
      delay: stopDelay,
    });
  });

  html += '</div>';
  container.innerHTML = html;

  // Salva i dati base e avvia il recupero delle coordinate in background
  window._currentRouteStops = [];
  fetchRouteCoordinates(mapStopsData);
}

// Recupera le coordinate GPS di tutte le fermate del percorso
// tramite una chiamata batch al proxy, poi abilita il pulsante mappa.
async function fetchRouteCoordinates(stopsData) {
  const codes = stopsData.map(s => s.stationCode).filter(Boolean);
  if (!codes.length) return;

  try {
    const res = await fetch(`${API}?action=stationDetail&codes=${codes.join(',')}`);
    const coordsMap = await res.json();

    // Arricchisce ogni fermata con le coordinate ricevute
    const mapStops = [];
    stopsData.forEach(stop => {
      const coords = coordsMap[stop.stationCode];
      if (coords && coords.lat && coords.lng) {
        mapStops.push({
          ...stop,
          lat: coords.lat,
          lng: coords.lng,
        });
      }
    });

    window._currentRouteStops = mapStops;

    // Abilita il pulsante "Mostra sulla mappa"
    const btn = document.getElementById('routeMapBtn');
    if (btn) {
      if (mapStops.length > 0) {
        btn.disabled = false;
        btn.innerHTML = `&#128506; ${t('showOnMap')}`;
      } else {
        btn.innerHTML = `&#128506; ${t('map')} (N/A)`;
      }
    }
  } catch {
    const btn = document.getElementById('routeMapBtn');
    if (btn) btn.innerHTML = `&#128506; ${t('map')} (N/A)`;
  }
}

// Mostra il percorso del treno sulla mappa Leaflet
function showRouteOnMap() {
  if (window._currentRouteStops && window._currentRouteStops.length) {
    showTrainRouteOnMap(window._currentRouteStops);
  }
}

/* ==================== Weather ==================== */
async function loadWeather(stationCode) {
  const container = document.getElementById('weatherWidget');
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

  try {
    const res = await fetch(`${API}?action=weather&code=${stationCode}`);
    const data = await res.json();

    if (data.error) {
      container.innerHTML = `<div class="weather-widget"><div class="weather-icon">&#9729;&#65039;</div><div class="weather-info"><div class="weather-desc">${t('weatherUnavailable')}</div></div></div>`;
      return;
    }

    if (data.source === 'openweathermap') {
      const iconUrl = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
      container.innerHTML = `
        <div class="weather-widget">
          <img src="${iconUrl}" alt="weather" class="weather-icon" width="60" height="60">
          <div class="weather-info">
            <div class="weather-temp">${Math.round(data.temp)}°C</div>
            <div class="weather-desc">${escapeHtml(data.description)}</div>
            <div class="weather-details">
              <span>&#128167; ${data.humidity}%</span>
              <span>&#127788;&#65039; ${data.wind} m/s</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const icon = getWeatherEmoji(data.descIcona || data.descrizione || '');
      const tempDetails = [];
      if (data.tempMattino != null) tempDetails.push(`&#127749; ${data.tempMattino}°`);
      if (data.tempPomeriggio != null) tempDetails.push(`&#9728;&#65039; ${data.tempPomeriggio}°`);
      if (data.tempSera != null) tempDetails.push(`&#127747; ${data.tempSera}°`);
      container.innerHTML = `
        <div class="weather-widget">
          <div class="weather-icon">${icon}</div>
          <div class="weather-info">
            <div class="weather-temp">${data.temperatura != null ? data.temperatura + '°C' : '--'}</div>
            <div class="weather-desc">${escapeHtml(data.descrizione || data.descIcona || '')}</div>
            <div class="weather-details">
              ${tempDetails.length ? tempDetails.join(' &nbsp; ') : ''}
            </div>
          </div>
        </div>
      `;
    }
  } catch {
    container.innerHTML = `<div class="weather-widget"><div class="weather-icon">&#9729;&#65039;</div><div class="weather-info"><div class="weather-desc">${t('weatherUnavailable')}</div></div></div>`;
  }
}

function getWeatherEmoji(desc) {
  const d = desc.toLowerCase();
  if (d.includes('sole') || d.includes('sereno') || d.includes('sun') || d.includes('clear')) return '\u2600\uFE0F';
  if (d.includes('nubi') || d.includes('nuvoloso') || d.includes('cloud') || d.includes('coperto')) return '\u2601\uFE0F';
  if (d.includes('pioggia') || d.includes('rain') || d.includes('piovig')) return '\uD83C\uDF27\uFE0F';
  if (d.includes('temporale') || d.includes('thunder') || d.includes('storm')) return '\u26C8\uFE0F';
  if (d.includes('neve') || d.includes('snow')) return '\uD83C\uDF28\uFE0F';
  if (d.includes('nebbia') || d.includes('fog')) return '\uD83C\uDF2B\uFE0F';
  if (d.includes('vento') || d.includes('wind')) return '\uD83D\uDCA8';
  return '\uD83C\uDF24\uFE0F';
}

/* ==================== Stats ==================== */
function updateStatsFromTrains(trains) {
  const total = trains.length;
  let onTime = 0, delayed = 0, cancelled = 0;

  trains.forEach(tr => {
    if (tr.provpipivedimento === 1 || tr.subTitle?.includes('oppresso')) {
      cancelled++;
    } else if ((tr.ritardo ?? 0) > 0) {
      delayed++;
    } else {
      onTime++;
    }
  });

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statOnTime').textContent = onTime;
  document.getElementById('statDelayed').textContent = delayed;
  document.getElementById('statCancelled').textContent = cancelled;
}

async function updateLiveCounter() {
  const el = document.getElementById('liveCounter');
  if (!el) return;
  const base = 4500 + Math.floor(Math.random() * 1500);
  const hour = new Date().getHours();
  const multiplier = (hour >= 6 && hour <= 22) ? 1 : 0.3;
  el.textContent = Math.floor(base * multiplier);
}

/* ==================== Recent Stations ==================== */
function saveRecentStation(station) {
  let recent = JSON.parse(localStorage.getItem('bl_recent') || '[]');
  recent = recent.filter(s => s.code !== station.code);
  recent.unshift({ name: station.name, code: station.code });
  if (recent.length > 8) recent = recent.slice(0, 8);
  localStorage.setItem('bl_recent', JSON.stringify(recent));
}

function renderRecentStations() {
  const container = document.getElementById('recentStations');
  const recent = JSON.parse(localStorage.getItem('bl_recent') || '[]');
  if (!recent.length) { container.innerHTML = ''; return; }

  container.innerHTML = `
    <span class="recent-label" data-i18n="recentStations">${t('recentStations')}:</span>
    ${recent.map(s => `<span class="recent-chip" data-code="${escapeHtml(s.code)}" data-name="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span>`).join('')}
  `;

  container.querySelectorAll('.recent-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectStation({ name: chip.dataset.name, code: chip.dataset.code });
    });
  });
}

/* ==================== Modal ==================== */
function openModal() {
  document.getElementById('routeModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('routeModal').classList.remove('show');
  document.body.style.overflow = '';
}

/* ==================== Helpers ==================== */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(currentLang === 'it' ? 'it-IT' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getCategoryClass(cat) {
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

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

async function logSearch(code, name, type) {
  try {
    await fetch(`${API}?action=logSearch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name, type }),
    });
  } catch { /* silent */ }
}
