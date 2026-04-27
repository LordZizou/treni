# BinarioLive — Monitoraggio Treni in Tempo Reale

**BinarioLive** è un'applicazione web moderna e intuitiva per il monitoraggio in tempo reale del traffico ferroviario italiano. Il progetto si interfaccia con le API pubbliche di Trenitalia per fornire dati accurati su partenze, arrivi, ritardi e percorsi dei treni, offrendo un'esperienza utente ottimizzata sia per desktop che per dispositivi mobili.

---

## 1. Struttura del Software

Il progetto segue un'architettura **Client-Server** semplice ma efficace, con una netta separazione tra la logica di backend (PHP) e l'interfaccia frontend (HTML/JS/CSS).

### Organizzazione File e Cartelle
```text
treni/
├── api/
│   ├── config.php      # Configurazioni globali (DB, URL API esterne)
│   ├── proxy.php      # Backend: Proxy per chiamate API e gestione logica
│   └── ...
├── css/
│   └── style.css       # Design responsive e gestione temi (Light/Dark)
├── js/
│   ├── app.js          # Logica principale frontend e gestione eventi
│   ├── i18n.js         # Gestione multilingua (Italiano/Inglese)
│   └── map.js          # Integrazione mappe interattive con Leaflet.js
├── sql/
│   └── schema.sql      # Schema del database MariaDB per statistiche e log
├── index.html          # Entry point dell'applicazione
└── README.md           # Questa documentazione
```

### Tecnologie Utilizzate
- **Frontend:** HTML5, CSS3 (Custom Variables, Grid, Flexbox), JavaScript ES6 (Vanilla).
- **Backend:** PHP 8.x per la gestione delle richieste proxy e l'interfacciamento con il database.
- **Database:** MariaDB/MySQL per il salvataggio delle ricerche e la generazione di statistiche.
- **Mappe:** Leaflet.js per la visualizzazione geografica dei percorsi.
- **Icone:** Emoji di sistema e icone SVG per un caricamento ultra-rapido.

---

## 2. Funzionalità Principali

L'applicazione implementa tutte le specifiche richieste e diverse funzionalità aggiuntive per migliorare l'esperienza utente:

- **Ricerca Stazione:** Campo di ricerca con autocompletamento in tempo reale.
- **Tabellone Partenze/Arrivi:** Visualizzazione dettagliata dei treni con orari previsti, binari, stati e ritardi.
- **Ricerca Treno:** Possibilità di cercare un treno specifico per numero e visualizzarne lo stato attuale.
- **Percorso Dettagliato:** Visualizzazione della timeline completa di un treno con tutte le fermate intermedie, orari di passaggio e ritardi per singola stazione.
- **Mappa Interattiva:** Visualizzazione geografica del percorso del treno con marker personalizzati per la posizione attuale.
- **Design Responsive:** Interfaccia ottimizzata per smartphone, tablet e desktop.

### Funzionalità Extra Implementate
- **Sistema di Notifiche Toast:** Avviso visivo automatico se un treno selezionato ha un ritardo superiore a 10 minuti.
- **News in Tempo Reale:** Sezione dedicata alle ultime notizie ferroviarie recuperate direttamente dagli endpoint ufficiali.
- **Integrazione Meteo:** Visualizzazione delle condizioni meteo correnti della stazione selezionata (tramite OpenWeatherMap o dati Trenitalia).
- **Contatore Live:** Visualizzazione in tempo reale del numero di treni attualmente circolanti sulla rete nazionale.
- **Supporto Multilingua:** Applicazione completamente tradotta in Italiano e Inglese.
- **Tema Dark/Light:** Supporto nativo per il tema scuro, selezionabile dall'utente e salvato nelle preferenze.
- **Stazioni Recenti:** Salvataggio automatico nel `localStorage` delle ultime stazioni consultate per un accesso rapido.

---

## 3. Backend e API (Focus per Studenti)

Il "cuore" del progetto è il file `api/proxy.php`. Poiché le API di Trenitalia non permettono chiamate dirette dal browser (per problemi di sicurezza chiamati CORS), abbiamo costruito un **Proxy** in PHP.

### Come funziona il Backend
Il frontend non chiama direttamente Trenitalia, ma invia una richiesta al nostro server PHP. Il server PHP:
1. Riceve la richiesta (es. "voglio le partenze di Milano").
2. Effettua la chiamata reale ai server di `viaggiatreno.it`.
3. Riceve i dati, li pulisce o li integra con il database.
4. Restituisce un JSON pulito al frontend.

### Endpoints Principali (Frontend -> Backend)
Ecco gli endpoint che il nostro frontend utilizza per comunicare con il backend:

| Azione | Descrizione | Endpoint Trenitalia corrispondente |
| :--- | :--- | :--- |
| `autocomplete` | Cerca nomi di stazioni | `/autocompletaStazione/{query}` |
| `departures` | Lista treni in partenza | `/partenze/{codiceStazione}/{data}` |
| `arrivals` | Lista treni in arrivo | `/arrivi/{codiceStazione}/{data}` |
| `trainRoute` | Dettaglio fermate treno | `/andamentoTreno/{codOrigine}/{numTreno}/{data}` |
| `searchTrain` | Trova codice treno da numero | `/cercaNumeroTrenoTrenoAutocomplete/{numero}` |
| `statistiche` | Numero treni circolanti | `/statistiche/{timestamp}` |
| `news` | Ultime notizie | `/news/0/it` |

---

## 4. Test Effettuati

L'applicazione è stata sottoposta a diversi cicli di test per garantirne la stabilità:
- **Test di Responsività:** Verificato il layout su viewport da 320px (iPhone SE) fino a 2560px (Monitor 2K).
- **Test Cross-Browser:** Verificato il funzionamento su Chrome, Firefox e Safari.
- **Test di Carico API:** Gestione dei casi in cui i server Trenitalia non rispondono o restituiscono dati incompleti (mostrando stati di "N/A" o messaggi di errore amichevoli).
- **Test LocalStorage:** Verifica della persistenza delle stazioni recenti e della preferenza del tema al riavvio del browser.

---

## 5. Istruzioni per l'Installazione (Per il Professore)

Per avviare il progetto in locale, segua questi passaggi:

1. **Requisiti:** Un server web (Apache/Nginx) con PHP 7.4 o superiore e un database MariaDB/MySQL.
2. **Database:**
   - Crei un database chiamato `binario_live`.
   - Importi il file `sql/schema.sql` per creare le tabelle necessarie.
3. **Configurazione:**
   - Rinomini (se necessario) o modifichi `api/config.php` inserendo le credenziali del suo database locale (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`).
4. **Esecuzione:**
   - Copi la cartella del progetto nella root del suo server web (es. `htdocs` per XAMPP).
   - Acceda tramite browser all'indirizzo `http://localhost/treni/index.html`.

**Nota:** Il progetto richiede una connessione internet attiva per recuperare i dati in tempo reale dai server di Trenitalia e per caricare le mappe di OpenStreetMap.

---
**Sviluppato con passione per l'esame di programmazione web.**
