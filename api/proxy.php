<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$allowed = [
    'autocomplete',
    'departures',
    'arrivals',
    'trainRoute',
    'searchTrain',
    'weather',
    'stats',
    'logSearch',
];

if (!in_array($action, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
    exit;
}

function trenitalia(string $path): string|false {
    $url = TRENITALIA_BASE . '/' . $path;
    $ctx = stream_context_create([
        'http' => [
            'timeout'       => 10,
            'ignore_errors' => true,
            'header'        => "Accept: */*\r\n",
        ],
    ]);
    return @file_get_contents($url, false, $ctx);
}

function parseStationLines(string $raw): array {
    $stations = [];
    foreach (explode("\n", trim($raw)) as $line) {
        $line = trim($line);
        if ($line === '') continue;
        $parts = explode('|', $line);
        if (count($parts) >= 2) {
            $stations[] = [
                'name' => trim($parts[0]),
                'code' => trim($parts[1]),
            ];
        }
    }
    return $stations;
}

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

switch ($action) {

    case 'autocomplete':
        $q = trim($_GET['q'] ?? '');
        if (strlen($q) < 2) {
            echo json_encode([]);
            exit;
        }
        $raw = trenitalia('autocompletaStazione/' . urlencode($q));
        if ($raw === false) {
            echo json_encode([]);
            exit;
        }
        echo json_encode(parseStationLines($raw));
        break;

    case 'departures':
        $code = preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? '');
        $date = $_GET['date'] ?? date('D M d Y H:i:s') . ' GMT+0200';
        $encodedDate = rawurlencode($date);
        $raw  = trenitalia("partenze/{$code}/{$encodedDate}");
        if ($raw === false) {
            echo json_encode([]);
            exit;
        }
        echo $raw;
        break;

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

    case 'trainRoute':
        $trainNum   = preg_replace('/[^0-9]/', '', $_GET['trainNum'] ?? '');
        $originCode = preg_replace('/[^A-Za-z0-9]/', '', $_GET['originCode'] ?? '');
        $depDate    = $_GET['depDate'] ?? '';
        if (!$trainNum || !$originCode) {
            echo json_encode(['error' => 'Missing parameters']);
            exit;
        }
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

    case 'searchTrain':
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
        $results = [];
        foreach (explode("\n", trim($raw)) as $line) {
            $line = trim($line);
            if ($line === '') continue;
            $parts = explode('|', $line);
            if (count($parts) >= 2) {
                $info = explode('-', trim($parts[1]));
                $results[] = [
                    'display'    => trim($parts[0]),
                    'trainNum'   => trim($info[0] ?? ''),
                    'originCode' => trim($info[1] ?? ''),
                    'depDate'    => trim($info[2] ?? ''),
                ];
            }
        }
        echo json_encode($results);
        break;

    case 'weather':
        $code = preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? '');
        if (!$code) {
            echo json_encode(['error' => 'Missing station code']);
            exit;
        }
        $region = '0';
        if (preg_match('/^S(\d{2})/', $code, $m)) {
            $region = ltrim($m[1], '0') ?: '0';
        }
        $raw = trenitalia("datimeteo/{$region}");
        $weatherFound = false;
        if ($raw !== false && $raw !== '' && $raw !== 'Error') {
            $allWeather = json_decode($raw, true);
            if (is_array($allWeather) && isset($allWeather[$code])) {
                $w = $allWeather[$code];
                echo json_encode([
                    'source'      => 'trenitalia',
                    'temperatura' => $w['oggiTemperatura'] ?? null,
                    'descrizione' => getWeatherDescription($w['oggiTempo'] ?? 0),
                    'descIcona'   => getWeatherDescription($w['oggiTempo'] ?? 0),
                    'umidita'     => null,
                    'velocitaVento' => null,
                    'tempMattino' => $w['oggiTemperaturaMattino'] ?? null,
                    'tempPomeriggio' => $w['oggiTemperaturaPomeriggio'] ?? null,
                    'tempSera'    => $w['oggiTemperaturaSera'] ?? null,
                ]);
                $weatherFound = true;
            } elseif (is_array($allWeather)) {
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
            echo json_encode(['error' => 'Weather unavailable']);
        }
        break;

    case 'stats':
        $db = getDb();
        if (!$db) {
            echo json_encode(['error' => 'Database not available']);
            exit;
        }
        $stmt = $db->query(
            "SELECT * FROM train_stats WHERE snapshot_date = CURDATE() ORDER BY hour DESC LIMIT 24"
        );
        echo json_encode($stmt->fetchAll());
        break;

    case 'logSearch':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode(['error' => 'POST required']);
            exit;
        }
        $body = json_decode(file_get_contents('php://input'), true);
        $db = getDb();
        if ($db && !empty($body['code']) && !empty($body['name'])) {
            $stmt = $db->prepare(
                "INSERT INTO search_log (station_code, station_name, search_type) VALUES (?, ?, ?)"
            );
            $stmt->execute([
                $body['code'],
                $body['name'],
                $body['type'] ?? 'departure',
            ]);
            $stmtStation = $db->prepare(
                "INSERT IGNORE INTO stations (code, name) VALUES (?, ?)"
            );
            $stmtStation->execute([$body['code'], $body['name']]);
        }
        echo json_encode(['ok' => true]);
        break;
}
