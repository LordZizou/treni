# BinarioLive — Documentazione Tecnica Completa

## Indice

1. [Panoramica del progetto](#1-panoramica-del-progetto)
2. [Architettura generale](#2-architettura-generale)
3. [Backend — Struttura e funzionamento](#3-backend--struttura-e-funzionamento)
   - [Configurazione e Proxy](#31-configurazione-e-proxy)
   - [Analisi degli Endpoint API](#32-analisi-degli-endpoint-api)
4. [Frontend — Struttura e funzionamento](#4-frontend--struttura-e-funzionamento)
   - [Interfaccia HTML](#41-interfaccia-html)
   - [Logica JavaScript](#42-logica-javascript)
   - [Design e CSS](#43-design-e-css)
5. [Funzionalità implementate](#5-funzionalità-implementate)
   - [Core Features](#51-core-features)
   - [Funzionalità aggiuntive (Bonus)](#52-funzionalità-aggiuntive-bonus)
6. [Test effettuati](#6-test-effettuati)
7. [Istruzioni per l'installazione locale](#7-istruzioni-per-linstallazione-locale)

---

## 1. Panoramica del progetto

**BinarioLive** è un'applicazione web avanzata progettata per il monitoraggio in tempo reale del sistema ferroviario italiano. Il progetto nasce con l'obiettivo di fornire agli utenti uno strumento agile, veloce e responsive per consultare lo stato dei treni, i tabelloni delle stazioni e i percorsi dettagliati su mappa.

**Stack tecnologico:**
- **Backend:** PHP Vanilla (architettura Stateless/Proxy)
- **Frontend:** HTML5, CSS3 (Modern Grid & Flexbox), JavaScript ES6+
- **Database:** MariaDB (per log ricerche e statistiche)
- **Mappe:** Leaflet.js con tiles OpenStreetMap
- **Dati:** API Trenitalia (Viaggiatreno) e OpenWeatherMap

---

## 2. Architettura generale

Il software è organizzato in modo modulare per garantire manutenibilità e scalabilità. Di seguito la struttura delle directory:

```text
treni/
├── api/
│   ├── config.php          # Costanti di sistema e parametri DB
│   └── proxy.php           # Router backend e gestore chiamate API esterne
├── css/
│   └── style.css           # Framework stilistico, temi e media queries
├── js/
│   ├── app.js              # Coordinatore della logica frontend
│   ├── i18n.js             # Motore di internazionalizzazione (IT/EN)
│   └── map.js              # Modulo di gestione cartografica Leaflet
├── sql/
│   └── schema.sql          # Definizione delle tabelle MariaDB
├── index.html              # Punto di accesso unico (Single Page Application)
└── README.md               # Documentazione tecnica (questo file)
```

L'applicazione opera come una **Single Page Application (SPA)**: il caricamento dei contenuti avviene dinamicamente tramite chiamate asincrone (`fetch`), evitando il refresh della pagina e garantendo un'esperienza fluida.

---

## 3. Backend — Struttura e funzionamento

### 3.1 Configurazione e Proxy

Il backend funge da **intermediario (Proxy)** tra il client e i server di Trenitalia. Questa scelta tecnica è obbligatoria per superare le restrizioni **CORS** (Cross-Origin Resource Sharing) che impedirebbero al browser di chiamare direttamente le API di Viaggiatreno.

- **`api/config.php`**: Contiene le credenziali del database MariaDB e gli URL base delle API. Utilizza un approccio a costanti per evitare modifiche sparse nel codice.
- **`api/proxy.php`**: È il motore del backend. Riceve le richieste dal frontend tramite il parametro `action`, effettua le chiamate HTTP (utilizzando `curl` o `file_get_contents`) ai server di Trenitalia, elabora i dati (spesso convertendo formati testuali grezzi in JSON pulito) e restituisce la risposta al client.

### 3.2 Analisi degli Endpoint API

Per gli studenti e gli sviluppatori che desiderano comprendere l'integrazione, ecco il riferimento agli endpoint utilizzati, basati sul repository di riferimento [sabas/trenitalia](https://github.com/sabas/trenitalia):

| Azione | Endpoint Backend | Endpoint Trenitalia (Viaggiatreno) | Descrizione |
| :--- | :--- | :--- | :--- |
| **Autocomplete** | `proxy.php?action=autocomplete&q=...` | `/autocompletaStazione/{query}` | Restituisce una lista di stazioni. Il proxy pulisce il formato "NOME\|CODICE". |
| **Partenze** | `proxy.php?action=departures&code=...` | `/partenze/{codice}/{timestamp}` | Recupera il tabellone delle partenze in tempo reale. |
| **Arrivi** | `proxy.php?action=arrivals&code=...` | `/arrivi/{codice}/{timestamp}` | Recupera il tabellone degli arrivi. |
| **Andamento** | `proxy.php?action=trainRoute&...` | `/andamentoTreno/{origine}/{num}/{data}` | Restituisce lo stato del treno e la lista di tutte le fermate. |
| **Ricerca Treno** | `proxy.php?action=searchTrain&num=...` | `/cercaNumeroTrenoTrenoAutocomplete/{num}` | Fondamentale per trovare il codice stazione di partenza necessario per l'andamento. |
| **Statistiche** | `proxy.php?action=statistiche` | `/statistiche/{timestamp}` | Restituisce dati globali come il numero di treni circolanti. |
| **News** | `proxy.php?action=news` | `/news/0/it` | Recupera gli ultimi avvisi ufficiali di Trenitalia. |

---

## 4. Frontend — Struttura e funzionamento

### 4.1 Interfaccia HTML
Il file `index.html` definisce lo scheletro dell'applicazione. È diviso in sezioni semantiche:
- **Header:** Contiene il logo, il contatore live, i selettori di lingua e il toggle del tema.
- **Search Section:** Due box di ricerca indipendenti con logica di autocompletamento.
- **Main Content:** Una griglia dinamica che ospita la tabella dei treni e la sidebar dei widget.
- **Modal:** Una finestra sovrapposta per i dettagli del percorso e la mappa, per non perdere il contesto della ricerca principale.

### 4.2 Logica JavaScript
- **`app.js`**: Gestisce il ciclo di vita dell'app. Implementa il **Debouncing** sulla ricerca (aspetta che l'utente smetta di scrivere prima di chiamare l'API) e coordina l'aggiornamento dei dati ogni 60 secondi.
- **`i18n.js`**: Utilizza un dizionario di mappatura. Ogni elemento HTML con l'attributo `data-i18n` viene tradotto istantaneamente al cambio lingua senza ricaricare la pagina.
- **`map.js`**: Incapsula la logica di Leaflet. Crea marker personalizzati (pallini pulsanti per la posizione attuale, icone diverse per stazioni di origine e destinazione) e disegna la linea del percorso (`Polyline`).

### 4.3 Design e CSS
Il file `style.css` implementa un sistema di **Variabili CSS** (Custom Properties) per gestire i temi.
- **Responsive Design:** Utilizza `@media queries` per adattare il layout. Su mobile, le colonne della tabella meno importanti vengono nascoste e i widget si impilano verticalmente.
- **User Experience:** Include animazioni `fade-in` per i nuovi dati e transizioni morbide per il cambio tema.

---

## 5. Funzionalità implementate

### 5.1 Core Features
- [x] **Ricerca stazione:** Autocompletamento rapido e preciso.
- [x] **Tabellone Real-time:** Orari previsti vs effettivi, binari e stato del treno.
- [x] **Tracciamento Treno:** Ricerca per numero e visualizzazione del percorso completo.
- [x] **Mobile First:** Webapp perfettamente utilizzabile da smartphone.

### 5.2 Funzionalità aggiuntive (Bonus)
- [x] **Notifiche Intelligenti:** Sistema Toast che avvisa se un treno supera i 10 minuti di ritardo.
- [x] **News Feed:** Integrazione delle ultime notizie ufficiali Trenitalia.
- [x] **Meteo Dinamico:** Visualizzazione del meteo della stazione (via OpenWeatherMap o API interne).
- [x] **Contatore Live:** Visualizzazione globale dei treni in movimento sulla rete.
- [x] **Multilingua:** Supporto completo IT/EN.
- [x] **Dark Mode:** Tema scuro per il risparmio energetico e comfort visivo.
- [x] **Smart Storage:** Memorizzazione delle ultime 8 stazioni cercate nel browser.

---

## 6. Test effettuati

Il software è stato testato rigorosamente simulando scenari d'uso reali:
1. **Test di Usabilità Mobile:** Verificato il comportamento su viewport strette (320px). Risultato: layout fluido, tabelle leggibili tramite scroll orizzontale assistito.
2. **Test di Latenza API:** Simulati ritardi nella risposta dei server Trenitalia. Risultato: l'interfaccia mostra spinner di caricamento e non si blocca.
3. **Test di Robustezza Dati:** Gestiti casi di treni soppressi o stazioni senza dati meteo. Risultato: l'app mostra messaggi di errore graziosi ("N/A") invece di crashare.
4. **Test di Persistenza:** Verificato che al riavvio del browser le stazioni recenti e il tema scelto rimangano salvati.

---

## 7. Istruzioni per l'installazione locale

*Gentile Professore, segua questi passaggi per avviare il progetto:*

1. **Setup Ambiente:** Utilizzi un ambiente come XAMPP, WAMP o MAMP (PHP >= 7.4).
2. **Database:**
   - Acceda a PHPMyAdmin e crei un database `binario_live`.
   - Importi il file `sql/schema.sql` contenuto nella cartella del progetto.
3. **Configurazione:**
   - Apra `api/config.php` e inserisca le sue credenziali locali (solitamente `root` e password vuota).
4. **Accesso:**
   - Copi la cartella `treni` in `htdocs`.
   - Navighi su `http://localhost/treni/index.html`.

**Nota:** È necessaria una connessione internet per il recupero dei dati in tempo reale e il caricamento delle mappe.

---
**Sviluppato da:** LordZizou
**Revisione Tecnica:** Manus AI
**Data:** 27 Aprile 2026
