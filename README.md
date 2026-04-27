# Relazione Tecnica Progetto: BinarioLive

Professore, questa è la documentazione del mio progetto "BinarioLive". L'obiettivo che mi sono posto è stato quello di creare una webapp semplice e veloce per controllare i treni in tempo reale, cercando di curare sia la parte tecnica del backend che l'usabilità su smartphone.

## 1. Com'è organizzato il mio lavoro (File e Cartelle)

Ho cercato di tenere i file ordinati dividendo bene le responsabilità:

- **index.html**: È l'unica pagina del sito. Ho scelto di fare una "Single Page Application" così l'utente non deve mai ricaricare la pagina e l'esperienza è più fluida.
- **api/proxy.php**: Questo è il cuore del backend. L'ho creato perché le API di Trenitalia non si possono chiamare direttamente dal browser (per via dei blocchi CORS). Il mio script PHP fa da "ponte".
- **api/config.php**: Qui ho messo i dati per connettermi al database e gli URL delle API, così se devo cambiare qualcosa lo faccio in un solo posto.
- **js/app.js**: Qui c'è tutta la logica che fa funzionare l'interfaccia, gestisce i click, le ricerche e i timer per aggiornare i dati.
- **js/map.js**: Si occupa solo della mappa. Usa una libreria che si chiama Leaflet per disegnare il percorso del treno.
- **js/i18n.js**: Serve per la traduzione. Contiene un dizionario con tutte le parole in italiano e inglese.
- **css/style.css**: Qui ho scritto tutto il design, compresi i colori per il tema scuro e le regole per far vedere bene il sito sul cellulare.
- **sql/schema.sql**: È il file che ho usato per creare le tabelle nel database MariaDB dove salvo i log delle ricerche.

---

## 2. Il fulcro del sito: Il sistema delle API

La parte più impegnativa è stata capire come usare le API di Trenitalia (Viaggiatreno). Siccome non sono documentate ufficialmente, ho studiato come funzionano e ho implementato questi passaggi nel mio backend.

### Come funziona il mio Proxy
Quando l'utente cerca qualcosa, il mio JavaScript non parla con Trenitalia, ma invia un messaggio al mio file `proxy.php`. Lui prende la richiesta, la "gira" ai server ufficiali, riceve la risposta (che spesso è un testo strano e disordinato), la pulisce e la rimanda al sito in formato JSON, che è molto più facile da gestire.

### Gli Endpoint che ho usato
Ecco nel dettaglio cosa succede quando l'app chiama il backend:

1.  **Ricerca Stazione (`action=autocomplete`)**: Quando scrivi le prime lettere, chiamo l'endpoint `/autocompletaStazione`. Mi restituisce una lista di nomi. Ho dovuto ripulire i dati perché Trenitalia li manda nel formato `NOME|CODICE`.
2.  **Tabellone Partenze/Arrivi (`action=departures` o `arrivals`)**: Uso l'endpoint `/partenze` o `/arrivi` passando il codice della stazione e l'orario attuale. Mi dà la lista dei treni con il binario e il ritardo.
3.  **Cerca Treno (`action=searchTrain`)**: Questa è stata la parte più difficile. Per vedere dove si trova un treno, Trenitalia vuole sapere da che stazione è partito. Se l'utente mette solo il numero del treno, prima devo chiamare `/cercaNumeroTrenoTrenoAutocomplete` per scoprire la stazione di origine e il timestamp di partenza.
4.  **Percorso e Andamento (`action=trainRoute`)**: Una volta che ho i dati del punto 3, chiamo `/andamentoTreno`. Questo mi dà la lista di tutte le fermate con gli orari previsti e quelli reali.
5.  **News (`action=news`)**: Uso l'endpoint `/news/0/it` per prendere gli ultimi avvisi su scioperi o problemi alla linea.
6.  **Statistiche (`action=statistiche`)**: Prendo il numero dei treni circolanti per farlo vedere nell'header come tocco di "real-time".

---

## 3. Funzionalità che ho implementato

Oltre alle funzioni base, ho aggiunto diverse cose per rendere il progetto più completo:

- **Mappa Interattiva**: Se clicchi su un treno, si apre una modale con la mappa che mostra il percorso. Ho aggiunto un pallino rosso che pulsa sulla stazione dove si trova il treno in quel momento.
- **Notifiche per i Ritardi**: Ho scritto una funzione che controlla se un treno ha più di 10 minuti di ritardo. Se succede, compare un avviso (toast) in alto a destra per avvertire l'utente.
- **Tema Scuro/Chiaro**: Ho aggiunto un tasto per cambiare tema. La preferenza viene salvata nel browser, così se chiudi e riapri il sito, si ricorda come ti piaceva.
- **Stazioni Recenti**: Uso il `localStorage` per salvare le ultime stazioni che hai cercato, così puoi ricliccarle velocemente senza riscrivere il nome.
- **Meteo**: Ho integrato i dati meteo così sai se piove nella stazione dove devi andare.

---

## 4. Test e Problemi Risolti

Durante lo sviluppo ho fatto diversi test:
- **Test Mobile**: Ho usato gli strumenti per sviluppatori di Chrome per simulare vari telefoni (iPhone, Galaxy). Ho dovuto sistemare le tabelle perché su schermi piccoli erano troppo larghe, quindi ho nascosto alcune colonne meno importanti.
- **Gestione Errori**: A volte le API di Trenitalia non rispondono o sono lente. Ho aggiunto degli "spinner" di caricamento e dei messaggi di errore (tipo "Nessun treno trovato") per non lasciare la pagina bianca.
- **Traduzione**: Ho testato che cambiando lingua tutti i testi (compresi i messaggi di errore) cambiassero correttamente.

---

## 5. Come far partire il progetto (Istruzioni)

Per correggere il mio lavoro, può seguire questi passaggi:

1.  Copi la cartella del progetto nel suo server locale (es. la cartella `htdocs` di XAMPP).
2.  Crei un database MariaDB che si chiama `binario_live`.
3.  Importi il file `sql/schema.sql` che ho incluso: creerà le tabelle per i log.
4.  Apra il file `api/config.php` e metta l'utente e la password del suo database (di solito `root` e password vuota).
5.  Apra il browser su `http://localhost/treni/index.html`.

Spero che il progetto le piaccia, ho cercato di metterci il massimo impegno!
