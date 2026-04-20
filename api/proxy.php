<?php
// ============================================================
// BinarioLive - Proxy API
// Questo file funge da intermediario tra il frontend JavaScript
// e le API di Trenitalia (ViaggiaTreno).
// E' necessario perche' le API di Trenitalia non supportano CORS,
// quindi il browser non puo' chiamarle direttamente.
// Il frontend chiama questo proxy, che a sua volta chiama Trenitalia
// lato server e restituisce i dati al browser in formato JSON.
// ============================================================

// Imposta gli header della risposta: tipo JSON e permette chiamate da qualsiasi origine
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Carica la configurazione (costanti DB, URL API, ecc.)
require_once __DIR__ . '/config.php';

// Legge il parametro 'action' dalla query string per capire cosa fare
$action = $_GET['action'] ?? '';

// Lista delle azioni permesse (whitelist di sicurezza).
// Qualsiasi altra azione viene rifiutata con errore 400.
$allowed = [
    'autocomplete',    // Autocompletamento nome stazione
    'departures',      // Lista partenze da una stazione
    'arrivals',        // Lista arrivi a una stazione
    'trainRoute',      // Percorso completo di un treno (fermate, ritardi)
    'searchTrain',     // Cerca treno per numero
    'weather',         // Dati meteo per una stazione
    'stats',           // Statistiche dal database locale
    'logSearch',       // Registra una ricerca nel database
    'stationDetail',   // Dettaglio stazione con coordinate GPS
];

// Se l'azione non e' nella whitelist, restituisce errore 400 e termina
if (!in_array($action, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
    exit;
}

// Effettua una chiamata HTTP GET alle API di Trenitalia.
// Costruisce l'URL completo a partire dal path relativo,
// imposta un timeout di 10 secondi e accetta qualsiasi tipo di risposta.
function trenitalia(string $path): string|false {
    $url = TRENITALIA_BASE . '/' . $path;
    // Crea un contesto HTTP con timeout e header personalizzati
    $ctx = stream_context_create([
        'http' => [
            'timeout'       => 10,            // Timeout massimo di 10 secondi
            'ignore_errors' => true,          // Non bloccare su errori HTTP (4xx, 5xx)
            'header'        => "Accept: */*\r\n",  // Accetta qualsiasi formato di risposta
        ],
    ]);
    // @ sopprime i warning PHP in caso di errore di connessione
    return @file_get_contents($url, false, $ctx);
}

/**
 * Analizza la risposta testuale dell'endpoint autocompletaStazione.
 * Trenitalia restituisce le stazioni in formato testo, una per riga,
 * con il formato: "NOME STAZIONE|CODICE" (es. "ROMA TERMINI|S08409").
 * Questa funzione converte quel formato in un array di oggetti JSON.
 *
 * @param string $raw  Il testo grezzo dalla risposta di Trenitalia
 * @return array  Array di stazioni, ciascuna con 'name' e 'code'
 */
function parseStationLines(string $raw): array {
    $stations = [];
    // Divide il testo per righe e processa ciascuna
    foreach (explode("\n", trim($raw)) as $line) {
        $line = trim($line);
        if ($line === '') continue;  // Salta le righe vuote
        // Separa nome e codice usando il carattere '|'
        $parts = explode('|', $line);
        if (count($parts) >= 2) {
            $stations[] = [
                'name' => trim($parts[0]),   // Nome della stazione
                'code' => trim($parts[1]),   // Codice della stazione
            ];
        }
    }
    return $stations;
}

/**
 * Converte il codice numerico del meteo di Trenitalia in una descrizione leggibile.
 * L'endpoint datimeteo restituisce codici numerici (es. 0 = Sereno, 12 = Pioggia).
 * Questa funzione li mappa in stringhe descrittive in italiano.
 *
 * @param int $code  Codice meteo numerico da Trenitalia
 * @return string  Descrizione testuale del meteo
 */
function getWeatherDescription(int $code): string {
    $map = [
        0 => 'Sereno', 1 => 'Sereno', 2 => 'Poco nuvoloso',
        3 => 'Nuvoloso', 4 => 'Molto nuvoloso', 5 => 'Coperto',
        10 => 'Nebbia', 11 => 'Pioggia leggera', 12 => 'Pioggia',
        13 => 'Pioggia forte', 14 => 'Temporale', 15 => 'Neve',
        100 => 'Sereno', 101 => 'Poco nuvoloso', 102 => 'Nuvoloso',
        103 => 'Coperto', 104 => 'Pioggia', 105 => 'Temporale',
        106 => 'Neve',
    ];
    return $map[$code] ?? 'Variabile';
}

// ============================================================
// Router principale: esegue l'azione richiesta dal frontend.
// Ogni case gestisce un endpoint diverso.
// ============================================================
switch ($action) {

    // --- AUTOCOMPLETAMENTO STAZIONE ---
    // Chiamata dal campo di ricerca stazione mentre l'utente digita.
    // Endpoint Trenitalia: autocompletaStazione/{testo}
    // Restituisce un array JSON di stazioni il cui nome contiene il testo cercato.
    case 'autocomplete':
        $q = trim($_GET['q'] ?? '');
        // Richiede almeno 2 caratteri per evitare ricerche troppo generiche
        if (strlen($q) < 2) {
            echo json_encode([]);
            exit;
        }
        // Chiama l'API di Trenitalia con il testo URL-encoded
        $raw = trenitalia('autocompletaStazione/' . urlencode($q));
        if ($raw === false) {
            echo json_encode([]);
            exit;
        }
        // Converte la risposta testuale in JSON e la invia al frontend
        echo json_encode(parseStationLines($raw));
        break;

    // --- PARTENZE ---
    // Restituisce la lista dei treni in partenza da una stazione in un dato momento.
    // Endpoint Trenitalia: partenze/{codiceStazione}/{data}
    // La data deve essere nel formato "Thu Apr 16 2026 17:00:00 GMT+0200".
    case 'departures':
        // Sanitizza il codice stazione: rimuove tutti i caratteri non alfanumerici
        $code = preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? '');
        // Usa la data fornita dal frontend, oppure genera quella corrente come fallback
        $date = $_GET['date'] ?? date('D M d Y H:i:s') . ' GMT+0200';
        // URL-encode della data perche' contiene spazi e caratteri speciali
        $encodedDate = rawurlencode($date);
        $raw  = trenitalia("partenze/{$code}/{$encodedDate}");
        if ($raw === false) {
            echo json_encode([]);
            exit;
        }
        // La risposta di Trenitalia e' gia' in JSON, la inoltriamo direttamente
        echo $raw;
        break;

    // --- ARRIVI ---
    // Identico a 'departures' ma per i treni in arrivo.
    // Endpoint Trenitalia: arrivi/{codiceStazione}/{data}
    case 'arrivals':
        $code = preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? '');
        $date = $_GET['date'] ?? date('D M d Y H:i:s') . ' GMT+0200';
        $encodedDate = rawurlencode($date);
        $raw  = trenitalia("arrivi/{$code}/{$encodedDate}");
        if ($raw === false) {
            echo json_encode([]);
            exit;
        }
        echo $raw;
        break;

    // --- PERCORSO TRENO ---
    // Restituisce il percorso completo di un treno: tutte le fermate,
    // gli orari previsti e reali, i ritardi per ciascuna stazione.
    // Endpoint Trenitalia: andamentoTreno/{codiceOrigine}/{numeroTreno}/{dataPartenza}
    case 'trainRoute':
        // Sanitizza i parametri: solo cifre per il numero treno, solo alfanumerici per il codice
        $trainNum   = preg_replace('/[^0-9]/', '', $_GET['trainNum'] ?? '');
        $originCode = preg_replace('/[^A-Za-z0-9]/', '', $_GET['originCode'] ?? '');
        $depDate    = $_GET['depDate'] ?? '';  // Data di partenza in millisecondi (timestamp)
        // Entrambi i parametri sono obbligatori
        if (!$trainNum || !$originCode) {
            echo json_encode(['error' => 'Missing parameters']);
            exit;
        }
        // Costruisce il path dell'endpoint con i parametri
        $path = "andamentoTreno/{$originCode}/{$trainNum}";
        if ($depDate) {
            $path .= '/' . urlencode($depDate);
        }
        $raw = trenitalia($path);
        if ($raw === false) {
            echo json_encode(['error' => 'Train not found']);
            exit;
        }
        echo $raw;
        break;

    // --- CERCA TRENO PER NUMERO ---
    // Dato un numero di treno, trova automaticamente la stazione di origine
    // e la data di partenza. Utile perche' l'utente conosce solo il numero.
    // Endpoint Trenitalia: cercaNumeroTrenoTrenoAutocomplete/{numero}
    // La risposta e' in formato testo: "descrizione|numero-codiceOrigine-dataPartenza"
    case 'searchTrain':
        // Sanitizza: solo cifre ammesse per il numero treno
        $num = preg_replace('/[^0-9]/', '', $_GET['num'] ?? '');
        if (!$num) {
            echo json_encode([]);
            exit;
        }
        $raw = trenitalia("cercaNumeroTrenoTrenoAutocomplete/{$num}");
        if ($raw === false) {
            echo json_encode([]);
            exit;
        }
        // Analizza la risposta testuale e la converte in un array strutturato
        $results = [];
        foreach (explode("\n", trim($raw)) as $line) {
            $line = trim($line);
            if ($line === '') continue;
            // Formato riga: "9611 - TORINO PORTA NUOVA|9611-S00219-1776290400000"
            $parts = explode('|', $line);
            if (count($parts) >= 2) {
                // La seconda parte contiene numero-codiceOrigine-dataPartenza separati da '-'
                $info = explode('-', trim($parts[1]));
                $results[] = [
                    'display'    => trim($parts[0]),         // Testo da mostrare nel dropdown
                    'trainNum'   => trim($info[0] ?? ''),    // Numero del treno
                    'originCode' => trim($info[1] ?? ''),    // Codice stazione di origine
                    'depDate'    => trim($info[2] ?? ''),    // Data partenza in millisecondi
                ];
            }
        }
        echo json_encode($results);
        break;

    // --- DETTAGLIO STAZIONE ---
    // Restituisce le coordinate GPS (lat/lng) di una stazione.
    // Endpoint Trenitalia: dettaglioStazione/{codiceStazione}/{codiceRegione}
    // Il codice regione si ricava dal codice stazione (S01XXX -> regione 1).
    // Se viene passato il parametro 'codes' (lista separata da virgole),
    // restituisce le coordinate di piu' stazioni in una sola chiamata.
    case 'stationDetail':
        $codes = $_GET['codes'] ?? '';
        $singleCode = preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? '');

        if ($codes) {
            // Modalita' batch: risolve piu' stazioni in una volta
            $codeList = array_slice(array_filter(array_map(function($c) {
                return preg_replace('/[^A-Za-z0-9]/', '', trim($c));
            }, explode(',', $codes))), 0, 30); // Massimo 30 stazioni

            $results = [];
            foreach ($codeList as $c) {
                $region = '1';
                if (preg_match('/^S(\d{2})/', $c, $m)) {
                    $region = ltrim($m[1], '0') ?: '1';
                }
                $raw = trenitalia("dettaglioStazione/{$c}/{$region}");
                if ($raw !== false && $raw !== 'Error') {
                    $data = json_decode($raw, true);
                    if (is_array($data) && !empty($data['lat']) && !empty($data['lon'])) {
                        $results[$c] = ['lat' => $data['lat'], 'lng' => $data['lon']];
                    }
                }
            }
            echo json_encode($results);
        } elseif ($singleCode) {
            // Modalita' singola: una sola stazione
            $region = '1';
            if (preg_match('/^S(\d{2})/', $singleCode, $m)) {
                $region = ltrim($m[1], '0') ?: '1';
            }
            $raw = trenitalia("dettaglioStazione/{$singleCode}/{$region}");
            if ($raw !== false && $raw !== 'Error') {
                $data = json_decode($raw, true);
                if (is_array($data) && !empty($data['lat']) && !empty($data['lon'])) {
                    echo json_encode(['lat' => $data['lat'], 'lng' => $data['lon']]);
                } else {
                    echo json_encode(['error' => 'Coordinates not found']);
                }
            } else {
                echo json_encode(['error' => 'Station not found']);
            }
        } else {
            echo json_encode(['error' => 'Missing station code']);
        }
        break;

    // --- METEO ---
    // Restituisce i dati meteo per una stazione.
    // Strategia a 3 livelli:
    //   1. Prova l'endpoint datimeteo di Trenitalia (per regione)
    //   2. Se fallisce e c'e' una chiave OWM, prova OpenWeatherMap
    //   3. Se tutto fallisce, restituisce errore
    //
    // L'endpoint datimeteo di Trenitalia vuole il numero della REGIONE, non il codice stazione.
    // Il numero regione si ricava dal codice stazione: S01XXX -> regione 1, S08XXX -> regione 8
    case 'weather':
        $code = preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? '');
        if (!$code) {
            echo json_encode(['error' => 'Missing station code']);
            exit;
        }
        // Estrae il numero della regione dal codice stazione.
        // Es: "S08409" -> cattura "08" -> rimuove lo zero iniziale -> "8"
        $region = '0';
        if (preg_match('/^S(\d{2})/', $code, $m)) {
            $region = ltrim($m[1], '0') ?: '0';
        }
        // Chiama l'endpoint meteo con il numero regione
        $raw = trenitalia("datimeteo/{$region}");
        $weatherFound = false;
        // Verifica che la risposta sia valida (non vuota e non "Error")
        if ($raw !== false && $raw !== '' && $raw !== 'Error') {
            // La risposta e' un JSON con chiavi = codici stazione della regione
            $allWeather = json_decode($raw, true);
            // Cerca i dati meteo specifici per la nostra stazione
            if (is_array($allWeather) && isset($allWeather[$code])) {
                $w = $allWeather[$code];
                // Costruisce la risposta con temperatura attuale e previsioni per fascia oraria
                echo json_encode([
                    'source'      => 'trenitalia',
                    'temperatura' => $w['oggiTemperatura'] ?? null,
                    'descrizione' => getWeatherDescription($w['oggiTempo'] ?? 0),
                    'descIcona'   => getWeatherDescription($w['oggiTempo'] ?? 0),
                    'umidita'     => null,
                    'velocitaVento' => null,
                    'tempMattino' => $w['oggiTemperaturaMattino'] ?? null,      // Temperatura del mattino
                    'tempPomeriggio' => $w['oggiTemperaturaPomeriggio'] ?? null, // Temperatura del pomeriggio
                    'tempSera'    => $w['oggiTemperaturaSera'] ?? null,          // Temperatura della sera
                ]);
                $weatherFound = true;
            } elseif (is_array($allWeather)) {
                // Se la stazione esatta non e' trovata, usa la prima stazione della regione
                // come approssimazione (meglio di niente)
                $first = reset($allWeather);
                if ($first) {
                    echo json_encode([
                        'source'      => 'trenitalia',
                        'temperatura' => $first['oggiTemperatura'] ?? null,
                        'descrizione' => getWeatherDescription($first['oggiTempo'] ?? 0),
                        'descIcona'   => getWeatherDescription($first['oggiTempo'] ?? 0),
                        'umidita'     => null,
                        'velocitaVento' => null,
                    ]);
                    $weatherFound = true;
                }
            }
        }
        // Fallback: se Trenitalia non ha dati e c'e' una chiave OpenWeatherMap configurata,
        // prova a ottenere il meteo da OpenWeatherMap usando le coordinate GPS
        if (!$weatherFound && OWM_API_KEY !== '') {
            $lat = floatval($_GET['lat'] ?? 0);
            $lon = floatval($_GET['lon'] ?? 0);
            if ($lat && $lon) {
                $owmUrl = 'https://api.openweathermap.org/data/2.5/weather?lat='
                    . $lat . '&lon=' . $lon
                    . '&appid=' . urlencode(OWM_API_KEY)
                    . '&units=metric&lang=it';
                $owm = @file_get_contents($owmUrl);
                if ($owm !== false) {
                    $data = json_decode($owm, true);
                    echo json_encode([
                        'source'      => 'openweathermap',
                        'temp'        => $data['main']['temp'] ?? null,
                        'description' => $data['weather'][0]['description'] ?? '',
                        'icon'        => $data['weather'][0]['icon'] ?? '',
                        'humidity'    => $data['main']['humidity'] ?? null,
                        'wind'        => $data['wind']['speed'] ?? null,
                    ]);
                    exit;
                }
            }
            echo json_encode(['error' => 'Weather unavailable']);
        } elseif (!$weatherFound) {
            // Nessuna fonte meteo disponibile
            echo json_encode(['error' => 'Weather unavailable']);
        }
        break;

    // --- STATISTICHE ---
    // Recupera le statistiche orarie dei treni dal database locale.
    // Restituisce le ultime 24 ore di dati per la data odierna.
    case 'stats':
        $db = getDb();
        if (!$db) {
            echo json_encode(['error' => 'Database not available']);
            exit;
        }
        // Seleziona gli snapshot di oggi, ordinati dall'ora piu' recente
        $stmt = $db->query(
            "SELECT * FROM train_stats WHERE snapshot_date = CURDATE() ORDER BY hour DESC LIMIT 24"
        );
        echo json_encode($stmt->fetchAll());
        break;

    // --- REGISTRAZIONE RICERCA ---
    // Salva nel database ogni ricerca effettuata dall'utente.
    // Accetta solo richieste POST con body JSON contenente: code, name, type.
    // Oltre a registrare la ricerca, salva anche la stazione nella tabella stations
    // (INSERT IGNORE evita duplicati se la stazione esiste gia').
    case 'logSearch':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode(['error' => 'POST required']);
            exit;
        }
        // Legge il body JSON della richiesta POST
        $body = json_decode(file_get_contents('php://input'), true);
        $db = getDb();
        // Salva solo se il database e' disponibile e i dati sono validi
        if ($db && !empty($body['code']) && !empty($body['name'])) {
            // Inserisce il log della ricerca
            $stmt = $db->prepare(
                "INSERT INTO search_log (station_code, station_name, search_type) VALUES (?, ?, ?)"
            );
            $stmt->execute([
                $body['code'],
                $body['name'],
                $body['type'] ?? 'departure',
            ]);
            // Salva la stazione nel database (ignora se esiste gia')
            $stmtStation = $db->prepare(
                "INSERT IGNORE INTO stations (code, name) VALUES (?, ?)"
            );
            $stmtStation->execute([$body['code'], $body['name']]);
        }
        echo json_encode(['ok' => true]);
        break;
}
