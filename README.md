# BinarioLive — Documentazione del Progetto

## Indice

1. [Panoramica del progetto](#1-panoramica-del-progetto)
2. [Come è organizzato il software](#2-come-è-organizzato-il-software)
   - [Struttura delle cartelle](#21-struttura-delle-cartelle)
   - [Spiegazione dei file](#22-spiegazione-dei-file)
3. [Il Backend — Come vengono presi i dati](#3-il-backend--come-vengono-presi-i-dati)
   - [Il sistema del Proxy](#31-il-sistema-del-proxy)
   - [Gli Endpoint utilizzati](#32-gli-endpoint-utilizzati)
   - [Salvataggio delle ricerche](#33-salvataggio-delle-ricerche)
4. [Il Frontend — L'interfaccia per l'utente](#4-il-frontend--linterfaccia-per-lutente)
   - [Funzionamento del sito](#41-funzionamento-del-sito)
   - [Gestione delle lingue](#42-gestione-delle-lingue)
   - [Design e colori](#43-design-e-colori)
5. [Funzionalità presenti](#5-funzionalità-presenti)
6. [Test effettuati e verificati](#6-test-effettuati-e-verificati)
7. [Guida per far partire il progetto](#7-guida-per-far-partire-il-progetto)

---

## 1. Panoramica del progetto

**BinarioLive** è un sito web creato per permettere a chiunque di controllare i treni italiani in tempo reale. L'idea è stata quella di fare un'applicazione facile da usare, che funzioni bene sia sul computer che sul telefono, e che dia tutte le informazioni importanti come ritardi, binari e percorsi su mappa.

Per farlo, il sito si collega ai sistemi ufficiali di Trenitalia e mostra i dati in modo chiaro e ordinato.

---

## 2. Come è organizzato il software

### 2.1 Struttura delle cartelle

Ho diviso il lavoro in diverse cartelle per non fare confusione tra la parte che sta sul server e quella che vede l'utente:

```text
treni/
├── api/
│   ├── config.php          # Impostazioni del server e del database
│   └── proxy.php           # Il file che recupera i dati dai siti esterni
├── css/
│   └── style.css           # Tutti i colori e l'aspetto estetico
├── js/
│   ├── app.js              # Il file principale che fa funzionare tutto
│   ├── i18n.js             # Gestisce le traduzioni in inglese
│   └── map.js              # Gestisce la visualizzazione della mappa
├── sql/
│   └── schema.sql          # Il file per creare le tabelle del database
├── index.html              # La pagina principale del sito
└── README.md               # Questa relazione
```

### 2.2 Spiegazione dei file

- **index.html**: È lo scheletro del sito. Ho messo tutto in una sola pagina per rendere il passaggio tra le varie funzioni più veloce e senza attese.
- **proxy.php**: È fondamentale. Serve a fare da "ponte" tra il mio sito e Trenitalia, perché per motivi di sicurezza i browser non permettono di prendere dati direttamente da altri siti.
- **app.js**: Contiene tutte le istruzioni per far reagire il sito ai click dell'utente, caricare le tabelle dei treni e gestire i tempi di aggiornamento.
- **style.css**: Qui ho scritto le regole per i colori, i caratteri e soprattutto per fare in modo che il sito si adatti bene agli schermi piccoli dei cellulari.

---

## 3. Il Backend — Come vengono presi i dati

### 3.1 Il sistema del Proxy

Il backend è la parte "invisibile" che lavora sul server. Ho creato un sistema di **Proxy**: quando l'utente cerca una stazione, il sito chiede al mio file PHP di andare a leggere i dati su Trenitalia. Il file PHP legge la risposta, la pulisce dalle informazioni inutili e la rimanda al sito in un formato che JavaScript riesce a leggere facilmente.

### 3.2 Gli Endpoint utilizzati

Per far funzionare tutto, ho usato diversi "punti di accesso" (endpoint) messi a disposizione dai server ferroviari:

- **Ricerca Stazione**: Quando si scrive un nome, viene interrogato un servizio che suggerisce le stazioni corrispondenti (es. scrivendo "Mil" suggerisce "Milano Centrale").
- **Tabellone Partenze/Arrivi**: Prende la lista di tutti i treni che passano da una stazione in un certo momento, con il binario e il ritardo aggiornato.
- **Cerca Treno**: Se si inserisce un numero di treno, il sistema deve prima capire da dove è partito quel treno per poter poi mostrare tutto il suo percorso.
- **Andamento Treno**: Mostra lo stato attuale del treno e la lista di tutte le stazioni dove si fermerà, con gli orari previsti e quelli reali.
- **News e Statistiche**: Prende gli avvisi sugli scioperi e il numero totale di treni che stanno viaggiando in Italia in questo momento.

### 3.3 Salvataggio delle ricerche

Ogni volta che viene cercata una stazione o un treno, il sistema salva un piccolo "log" nel database MariaDB. Questo serve per tenere traccia di quali sono le stazioni più cercate dagli utenti.

---

## 4. Il Frontend — L'interfaccia per l'utente

### 4.1 Funzionamento del sito

Ho cercato di rendere tutto automatico. Per esempio, nella ricerca ho messo un sistema che aspetta che l'utente finisca di scrivere prima di mandare la richiesta, così non si spreca traffico internet inutilmente. I dati della tabella si aggiornano da soli ogni minuto.

### 4.2 Gestione delle lingue

Il sito può essere visualizzato in Italiano o in Inglese. Non ho usato traduttori automatici, ma ho creato un file con tutte le parole tradotte. Quando si cambia lingua, il sito sostituisce tutte le scritte istantaneamente.

### 4.3 Design e colori

Ho usato un design moderno e pulito. Ho aggiunto anche la **Modalità Scura**: premendo un tasto, i colori del sito cambiano per non affaticare la vista. Il sito si ricorda della scelta anche se si chiude il browser.

---

## 5. Funzionalità presenti

- **Ricerca rapida**: Suggerimenti immediati mentre si scrive il nome della stazione.
- **Tabelloni completi**: Orari, binari e stato dei treni (in orario, in ritardo o soppresso).
- **Percorso su mappa**: Se clicchi su un treno, vedi la linea del suo percorso su una mappa e un pallino che indica dove si trova ora.
- **Notifiche ritardo**: Se un treno ha più di 10 minuti di ritardo, compare un avviso colorato per avvertire subito l'utente.
- **Meteo**: Accanto alla stazione viene mostrato se c'è il sole o se piove.
- **Stazioni recenti**: Il sito si ricorda delle ultime stazioni cercate e le mostra come tasti veloci.

---

## 6. Test effettuati e verificati

Ho testato a lungo il sito per assicurarmi che non ci fossero errori. Ecco i test principali:

**Ricerca e Navigazione**
- L'autocompletamento funziona anche scrivendo solo poche lettere (es. "roma t" trova "Roma Termini").
- La ricerca treno funziona sia mettendo solo il numero (es. "665") sia con la sigla (es. "REG 665").
- I tasti per cambiare tra "Partenze" e "Arrivi" aggiornano subito la tabella senza errori.

**Stazione e Tabelle**
- Ho verificato il caricamento nelle stazioni più grandi come Milano Centrale e Roma Termini, dove ci sono tantissimi treni.
- Il meteo compare correttamente nelle città principali, mentre scompare se i dati non sono disponibili per le stazioni più piccole.
- I dati si aggiornano correttamente ogni 60 secondi senza dover ricaricare la pagina.

**Treno e Mappa**
- La linea del percorso sulla mappa viene disegnata correttamente collegando tutte le fermate.
- Il pallino rosso della posizione attuale si sposta correttamente in base all'ultima stazione raggiunta dal treno.
- Se un treno è soppresso, la tabella lo evidenzia chiaramente in rosso.

**UI/UX e Responsive**
- Ho testato il sito su diversi smartphone (iPhone e Android). Su schermi piccoli le tabelle rimangono leggibili e il menu diventa facile da usare con il pollice.
- Il cambio tra tema chiaro e scuro funziona bene e non "salta" quando si ricarica la pagina.
- Le notifiche di ritardo (toast) compaiono correttamente e spariscono da sole dopo qualche secondo.

---

## 7. Guida per far partire il progetto

Per chi deve correggere il progetto, ecco come configurarlo sul proprio computer:

1.  **Copiare i file**: Mettere la cartella del progetto nel server locale (es. la cartella `htdocs` di XAMPP).
2.  **Database**:
    - Creare un database MariaDB chiamato `binario_live`.
    - Importare il file `sql/schema.sql` per creare le tabelle.
3.  **Configurazione**:
    - Aprire il file `api/config.php` e inserire il nome utente e la password del proprio database locale.
4.  **Avvio**:
    - Aprire il browser e andare su `http://localhost/treni/index.html`.

*Nota: Il sito ha bisogno di internet per scaricare le mappe e i dati dei treni in tempo reale.*

---
**Studente**: LordZizou
**Data**: 27 Aprile 2026
