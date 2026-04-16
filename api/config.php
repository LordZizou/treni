<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'binario_live');
define('DB_USER', 'root');
define('DB_PASS', '');

define('TRENITALIA_BASE', 'http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno');

define('OWM_API_KEY', ''); // Optional: OpenWeatherMap API key

function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE  => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES    => false,
                ]
            );
        } catch (PDOException $e) {
            return null;
        }
    }
    return $pdo;
}
