# BinarioLive — Documentazione Tecnica del Progetto

## Indice

1. [Panoramica del progetto](#1-panoramica-del-progetto)
2. [Architettura del software](#2-architettura-del-software)
   - [Struttura delle directory](#21-struttura-delle-directory)
   - [Analisi dei componenti](#22-analisi-dei-componenti)
3. [Backend — Sviluppo e logica API](#3-backend--sviluppo-e-logica-api)
   - [Configurazione e Sicurezza](#31-configurazione-e-sicurezza)
   - [Gestione degli Endpoint](#32-gestione-degli-endpoint)
   - [Integrazione con database MariaDB](#33-integrazione-con-database-mariadb)
4. [Frontend — Interfaccia e User Experience](#4-frontend--interfaccia-e-user-experience)
   - [Logica applicativa e SPA](#41-logica-applicativa-e-spa)
   - [Internazionalizzazione (i18n)](#42-internazionalizzazione-i18n)
   - [Design Responsive e Temi](#43-design-responsive-e-temi)
5. [Funzionalità implementate](#5-funzionalità-implementate)
   - [Requisiti Core](#51-requisiti-core)
   - [Funzionalità Extra](#52-funzionalità-extra)
6. [Test e validazione](#6-test-e-validazione)
7. [Guida all'installazione per la correzione](#7-guida-allinstallazione-per-la-correzione)

---

## 1. Panoramica del progetto

**BinarioLive** è un'applicazione web sviluppata per fornire un servizio di monitoraggio in tempo reale del traffico ferroviario nazionale. Il sistema è stato progettato per offrire un'interfaccia moderna, veloce e accessibile da qualsiasi dispositivo, integrando dati complessi provenienti da diverse fonti esterne.

L'applicazione si basa su un'architettura **Stateless** lato server, dove il backend funge principalmente da proxy e aggregatore di dati per le API di Trenitalia (Viaggiatreno), garantendo al contempo la persistenza delle preferenze utente tramite storage locale e l'archiviazione di log statistici su database.

---

## 2. Architettura del software

### 2.1 Struttura delle directory

L'organizzazione dei file segue criteri di modularità per separare nettamente la logica di business dalla presentazione:

```text
treni/
├── api/
│   ├── config.php          # Configurazioni di sistema e credenziali DB
│   └── proxy.php           # Entry point backend (Router/Proxy)
├── css/
│   └── style.css           # Fogli di stile, variabili e media queries
├── js/
│   ├── app.js              # Controller principale del frontend
│   ├── i18n.js             # Modulo per la gestione multilingua
│   └── map.js              # Gestore dell'integrazione cartografica
├── sql/
│   └── schema.sql          # Script di inizializzazione del database
├── index.html              # Struttura portante dell'applicazione (SPA)
└── README.md               # Relazione tecnica e documentazione
```

### 2.2 Analisi dei componenti

- **Frontend (index.html + JS/CSS)**: È stato adottato l'approccio **Single Page Application (SPA)**. Questo permette di gestire tutte le interazioni (ricerche, visualizzazione dettagli, mappe) senza ricaricare mai la pagina, migliorando sensibilmente la velocità percepita.
- **Backend (PHP)**: Sviluppato in PHP vanilla per mantenere il sistema leggero. Gestisce le chiamate cross-origin, la sanificazione degli input e la comunicazione con il database MariaDB.
- **Database (MariaDB)**: Utilizzato per scopi analitici e statistici, memorizzando i log delle ricerche effettuate dagli utenti.

---

## 3. Backend — Sviluppo e logica API

### 3.1 Configurazione e Sicurezza

Il file `api/config.php` centralizza tutti i parametri sensibili e le configurazioni globali. Per quanto riguarda la sicurezza, il backend implementa header **CORS** controllati e utilizza tecniche di sanificazione per prevenire attacchi di tipo Injection durante le query al database.

### 3.2 Gestione degli Endpoint

Il file `api/proxy.php` agisce come un dispatcher. Riceve una richiesta tramite il parametro `action` e interroga i server di Trenitalia. Di seguito gli endpoint principali implementati:

| Azione | Endpoint Sorgente (Viaggiatreno) | Funzionalità |
| :--- | :--- | :--- |
| `autocomplete` | `/autocompletaStazione/{q}` | Fornisce suggerimenti durante la digitazione del nome stazione. |
| `departures` | `/partenze/{code}/{timestamp}` | Recupera il tabellone delle partenze in tempo reale. |
| `arrivals` | `/arrivi/{code}/{timestamp}` | Recupera il tabellone degli arrivi in tempo reale. |
| `searchTrain` | `/cercaNumeroTrenoTrenoAutocomplete/{n}` | Individua la stazione di origine di un treno partendo dal numero. |
| `trainRoute` | `/andamentoTreno/{orig}/{n}/{data}` | Restituisce lo stato attuale e la lista completa delle fermate. |
| `news` | `/news/0/it` | Estrae gli ultimi avvisi e comunicati ufficiali. |
| `statistiche` | `/statistiche/{timestamp}` | Fornisce il conteggio globale dei treni attualmente circolanti. |

### 3.3 Integrazione con database MariaDB

È stata implementata una funzione di **Logging** (`logSearch`) che interviene ogni volta che un utente seleziona una stazione o un treno. I dati vengono salvati in una tabella dedicata per permettere future analisi sulle stazioni più cercate o sui flussi di traffico monitorati.

---

## 4. Frontend — Interfaccia e User Experience

### 4.1 Logica applicativa e SPA

Il file `js/app.js` coordina l'intera applicazione. Sono state implementate logiche di **Debouncing** per ottimizzare le chiamate API durante la ricerca, evitando di sovraccaricare il server a ogni pressione di tasto. L'aggiornamento dei dati è automatico tramite un timer di polling impostato a 60 secondi.

### 4.2 Internazionalizzazione (i18n)

Il sistema supporta pienamente Italiano e Inglese. La logica risiede in `js/i18n.js`, che mappa le chiavi di traduzione sugli elementi DOM contrassegnati dall'attributo `data-i18n`. Questo approccio permette l'aggiunta di nuove lingue in modo estremamente rapido.

### 4.3 Design Responsive e Temi

Il design è stato curato per essere **Mobile-First**. Attraverso l'uso di CSS Grid e Flexbox, il layout si adatta dinamicamente:
- **Desktop**: Visualizzazione tabellare estesa con widget laterali.
- **Mobile**: Le tabelle vengono semplificate nascondendo le colonne secondarie e i widget si spostano in fondo alla pagina per dare priorità ai dati ferroviari.
- **Dark Mode**: È stato implementato un sistema di temi basato su variabili CSS. La scelta dell'utente viene persistita nel `localStorage` del browser.

---

## 5. Funzionalità implementate

### 5.1 Requisiti Core

- [x] **Ricerca stazione**: Autocompletamento dinamico tramite API.
- [x] **Tabelloni Live**: Visualizzazione orari previsti, effettivi, binari e stati.
- [x] **Dettaglio Treno**: Visualizzazione timeline fermate e ritardi progressivi.
- [x] **Accessibilità Mobile**: Interfaccia ottimizzata per schermi touch e ridotti.

### 5.2 Funzionalità Extra

- [x] **Sistema di Notifiche**: Avviso visivo (Toast) se un treno supera la soglia di ritardo di 10 minuti.
- [x] **Integrazione Mappe**: Visualizzazione del percorso su mappa con Leaflet.js e marker dinamico della posizione attuale del treno.
- [x] **Meteo Real-time**: Visualizzazione delle condizioni meteo della stazione selezionata.
- [x] **Contatore Treni Circolanti**: Monitoraggio globale della rete ferroviaria nell'header.
- [x] **Gestione Cronologia**: Salvataggio automatico delle ultime stazioni consultate (Stazioni Recenti).

---

## 6. Test e validazione

Il processo di sviluppo ha incluso diverse fasi di testing per garantire la robustezza del software:
- **Test di Compatibilità**: Verificato il rendering corretto su Chrome, Firefox e Safari.
- **Test di Responsività**: Simulazione di dispositivi con diverse risoluzioni (iPhone SE, iPad, Desktop 4K).
- **Test di Error Handling**: Gestione dei casi di assenza di rete, dati mancanti dalle API o server Trenitalia non raggiungibili. In questi casi, l'applicazione fornisce feedback chiari all'utente senza interrompere l'esecuzione.
- **Validazione Dati**: Verifica della corretta conversione dei timestamp e dei formati data tra i server esterni e l'interfaccia utente.

---

## 7. Guida all'installazione per la correzione

Per testare l'applicazione in ambiente locale, è necessario disporre di un server web con supporto PHP e MariaDB (es. XAMPP o Docker).

1. **Configurazione Web Server**: Copiare la cartella del progetto nella directory radice del server (es. `htdocs`).
2. **Inizializzazione Database**:
   - Creare un database denominato `binario_live`.
   - Eseguire lo script contenuto in `sql/schema.sql` per creare la struttura delle tabelle.
3. **Configurazione Backend**:
   - Modificare il file `api/config.php` inserendo le credenziali del proprio database locale (`DB_USER`, `DB_PASS`, ecc.).
4. **Esecuzione**:
   - Navigare all'indirizzo `http://localhost/treni/index.html`.

**Nota**: Il corretto funzionamento dell'applicazione dipende dalla disponibilità dei servizi esterni di Trenitalia e da una connessione internet attiva.

---
**Documentazione redatta per l'esame di Programmazione Web.**
**Studente**: LordZizou
**Data**: 27 Aprile 2026
