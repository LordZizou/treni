<?php
// Dati per connettersi al database (quelli di default di XAMPP)
define('DB_HOST', 'localhost');
define('DB_NAME', 'binario_live');
define('DB_USER', 'root');
define('DB_PASS', '');

// Indirizzo base delle API di Trenitalia
define('TRENITALIA_BASE', 'http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno');

// Chiave API OpenWeatherMap (opzionale, lasciare vuoto se non si ha)
define('OWM_API_KEY', '');

// Crea e restituisce la connessione al database
function getDb() {
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS
        );
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (PDOException $e) {
        return null;
    }
}
