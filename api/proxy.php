<?php
// Questo file fa da "ponte" tra il frontend e le API di Trenitalia.
// Il browser non può chiamare Trenitalia direttamente per via del CORS,
// quindi chiama questo proxy PHP che fa la richiesta al posto suo.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

// Chiama un endpoint di Trenitalia e restituisce la risposta
function chiamaTrenitalia($path) {
    $url = TRENITALIA_BASE . '/' . $path;
    $opzioni = stream_context_create([
        'http' => [
            'timeout' => 10,
            'ignore_errors' => true,
            'header' => "Accept: */*\r\n"
        ]
    ]);
    return @file_get_contents($url, false, $opzioni);
}

// Converte la risposta testuale dell'autocompletamento in un array
// La risposta di Trenitalia è tipo: "ROMA TERMINI|S08409\nROMA OSTIENSE|S08406"
function parsaStazioni($testo) {
    $stazioni = [];
    foreach (explode("\n", trim($testo)) as $riga) {
        $riga = trim($riga);
        if ($riga == '') continue;
        $parti = explode('|', $riga);
        if (count($parti) >= 2) {
            $stazioni[] = ['name' => trim($parti[0]), 'code' => trim($parti[1])];
        }
    }
    return $stazioni;
}

// Traduce i codici numerici del meteo di Trenitalia in testo leggibile
function descrizioneMeteo($codice) {
    $descrizioni = [
        0 => 'Sereno', 1 => 'Sereno', 2 => 'Poco nuvoloso',
        3 => 'Nuvoloso', 4 => 'Molto nuvoloso', 5 => 'Coperto',
        10 => 'Nebbia', 11 => 'Pioggia leggera', 12 => 'Pioggia',
        13 => 'Pioggia forte', 14 => 'Temporale', 15 => 'Neve',
        100 => 'Sereno', 101 => 'Poco nuvoloso', 102 => 'Nuvoloso',
        103 => 'Coperto', 104 => 'Pioggia', 105 => 'Temporale', 106 => 'Neve'
    ];
    return $descrizioni[$codice] ?? 'Variabile';
}

// In base all'azione richiesta, chiama l'endpoint giusto di Trenitalia
switch ($action) {

    // Autocompletamento stazione mentre l'utente digita
    case 'autocomplete':
        $q = trim($_GET['q'] ?? '');
        if (strlen($q) < 2) { echo json_encode([]); exit; }
        $risposta = chiamaTrenitalia('autocompletaStazione/' . urlencode($q));
        echo $risposta ? json_encode(parsaStazioni($risposta)) : json_encode([]);
        break;

    // Lista treni in partenza da una stazione
    case 'departures':
        $codice = preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? '');
        $data = rawurlencode($_GET['date'] ?? date('D M d Y H:i:s') . ' GMT+0200');
        $risposta = chiamaTrenitalia("partenze/$codice/$data");
        echo $risposta ?: json_encode([]);
        break;

    // Lista treni in arrivo a una stazione
    case 'arrivals':
        $codice = preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? '');
        $data = rawurlencode($_GET['date'] ?? date('D M d Y H:i:s') . ' GMT+0200');
        $risposta = chiamaTrenitalia("arrivi/$codice/$data");
        echo $risposta ?: json_encode([]);
        break;

    // Percorso completo di un treno con tutte le fermate
    case 'trainRoute':
        $numeroTreno = preg_replace('/[^0-9]/', '', $_GET['trainNum'] ?? '');
        $origine = preg_replace('/[^A-Za-z0-9]/', '', $_GET['originCode'] ?? '');
        $dataPartenza = $_GET['depDate'] ?? '';
        if (!$numeroTreno || !$origine) { echo json_encode(['error' => 'Parametri mancanti']); exit; }
        $path = "andamentoTreno/$origine/$numeroTreno";
        if ($dataPartenza) $path .= '/' . urlencode($dataPartenza);
        $risposta = chiamaTrenitalia($path);
        echo $risposta ?: json_encode(['error' => 'Treno non trovato']);
        break;

    // Cerca un treno per numero (restituisce anche stazione origine e data)
    case 'searchTrain':
        $numero = preg_replace('/[^0-9]/', '', $_GET['num'] ?? '');
        if (!$numero) { echo json_encode([]); exit; }
        $risposta = chiamaTrenitalia("cercaNumeroTrenoTrenoAutocomplete/$numero");
        if (!$risposta) { echo json_encode([]); exit; }
        $risultati = [];
        foreach (explode("\n", trim($risposta)) as $riga) {
            $riga = trim($riga);
            if ($riga == '') continue;
            $parti = explode('|', $riga);
            if (count($parti) >= 2) {
                // Il formato della seconda parte è: numeroTreno-codiceOrigine-dataPartenza
                $info = explode('-', trim($parti[1]));
                $risultati[] = [
                    'display'    => trim($parti[0]),
                    'trainNum'   => trim($info[0] ?? ''),
                    'originCode' => trim($info[1] ?? ''),
                    'depDate'    => trim($info[2] ?? '')
                ];
            }
        }
        echo json_encode($risultati);
        break;

    // Coordinate GPS di una o più stazioni
    // L'endpoint di Trenitalia si chiama dettaglioStazione e vuole il codice regione.
    // Il codice regione si trova nei primi due numeri del codice stazione (S08409 -> regione 8)
    case 'stationDetail':
        $codici = $_GET['codes'] ?? '';
        $codiceSingolo = preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? '');

        if ($codici) {
            // Modalità batch: più stazioni in una volta sola
            $listaCodici = array_slice(
                array_filter(array_map('trim', explode(',', $codici))),
                0, 30
            );
            $risultati = [];
            foreach ($listaCodici as $c) {
                $c = preg_replace('/[^A-Za-z0-9]/', '', $c);
                // Estrai il numero regione dal codice stazione
                preg_match('/^S(\d{2})/', $c, $m);
                $regione = ltrim($m[1] ?? '1', '0') ?: '1';
                $dati = chiamaTrenitalia("dettaglioStazione/$c/$regione");
                if ($dati && $dati !== 'Error') {
                    $json = json_decode($dati, true);
                    if ($json && !empty($json['lat'])) {
                        $risultati[$c] = ['lat' => $json['lat'], 'lng' => $json['lon']];
                    }
                }
            }
            echo json_encode($risultati);

        } elseif ($codiceSingolo) {
            // Singola stazione
            preg_match('/^S(\d{2})/', $codiceSingolo, $m);
            $regione = ltrim($m[1] ?? '1', '0') ?: '1';
            $dati = chiamaTrenitalia("dettaglioStazione/$codiceSingolo/$regione");
            if ($dati && $dati !== 'Error') {
                $json = json_decode($dati, true);
                if ($json && !empty($json['lat'])) {
                    echo json_encode(['lat' => $json['lat'], 'lng' => $json['lon']]);
                    exit;
                }
            }
            echo json_encode(['error' => 'Coordinate non trovate']);

        } else {
            echo json_encode(['error' => 'Codice stazione mancante']);
        }
        break;

    // Meteo della stazione tramite l'API di Trenitalia (datimeteo)
    // L'endpoint vuole il numero regione, non il codice stazione
    case 'weather':
        $codice = preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? '');
        if (!$codice) { echo json_encode(['error' => 'Codice mancante']); exit; }

        // Ricava il numero regione dal codice stazione (es. S08409 -> regione 8)
        preg_match('/^S(\d{2})/', $codice, $m);
        $regione = ltrim($m[1] ?? '0', '0') ?: '0';

        $risposta = chiamaTrenitalia("datimeteo/$regione");

        if ($risposta && $risposta !== 'Error') {
            $tuttoMeteo = json_decode($risposta, true);
            // La risposta contiene i dati meteo di tutte le stazioni della regione
            $datiStazione = $tuttoMeteo[$codice] ?? reset($tuttoMeteo);
            if ($datiStazione) {
                echo json_encode([
                    'source'         => 'trenitalia',
                    'temperatura'    => $datiStazione['oggiTemperatura'] ?? null,
                    'descrizione'    => descrizioneMeteo($datiStazione['oggiTempo'] ?? 0),
                    'descIcona'      => descrizioneMeteo($datiStazione['oggiTempo'] ?? 0),
                    'tempMattino'    => $datiStazione['oggiTemperaturaMattino'] ?? null,
                    'tempPomeriggio' => $datiStazione['oggiTemperaturaPomeriggio'] ?? null,
                    'tempSera'       => $datiStazione['oggiTemperaturaSera'] ?? null
                ]);
                exit;
            }
        }

        // Se Trenitalia non ha dati, prova con OpenWeatherMap (se la chiave è configurata)
        if (OWM_API_KEY !== '') {
            $lat = floatval($_GET['lat'] ?? 0);
            $lon = floatval($_GET['lon'] ?? 0);
            if ($lat && $lon) {
                $url = "https://api.openweathermap.org/data/2.5/weather?lat=$lat&lon=$lon&appid=" . urlencode(OWM_API_KEY) . "&units=metric&lang=it";
                $owm = @file_get_contents($url);
                if ($owm) {
                    $dati = json_decode($owm, true);
                    echo json_encode([
                        'source'      => 'openweathermap',
                        'temp'        => $dati['main']['temp'] ?? null,
                        'description' => $dati['weather'][0]['description'] ?? '',
                        'icon'        => $dati['weather'][0]['icon'] ?? '',
                        'humidity'    => $dati['main']['humidity'] ?? null,
                        'wind'        => $dati['wind']['speed'] ?? null
                    ]);
                    exit;
                }
            }
        }

        echo json_encode(['error' => 'Meteo non disponibile']);
        break;

    // Statistiche dal database locale
    case 'stats':
        $db = getDb();
        if (!$db) { echo json_encode(['error' => 'Database non disponibile']); exit; }
        $query = $db->query("SELECT * FROM train_stats WHERE snapshot_date = CURDATE() ORDER BY hour DESC LIMIT 24");
        echo json_encode($query->fetchAll());
        break;

    // Notizie in tempo reale da Trenitalia
    case 'news':
        $risposta = chiamaTrenitalia('news/0/it');
        echo $risposta ?: json_encode([]);
        break;

    // Salva la ricerca nel database (per tenere lo storico)
    case 'logSearch':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { echo json_encode(['error' => 'Serve POST']); exit; }
        $dati = json_decode(file_get_contents('php://input'), true);
        $db = getDb();
        if ($db && !empty($dati['code']) && !empty($dati['name'])) {
            $db->prepare("INSERT INTO search_log (station_code, station_name, search_type) VALUES (?, ?, ?)")
               ->execute([$dati['code'], $dati['name'], $dati['type'] ?? 'departure']);
            $db->prepare("INSERT IGNORE INTO stations (code, name) VALUES (?, ?)")
               ->execute([$dati['code'], $dati['name']]);
        }
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Azione non valida']);
}
