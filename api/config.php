<?php
// ============================================================
// BinarioLive - File di configurazione
// Contiene le costanti per la connessione al database
// e gli URL delle API esterne.
// ============================================================

// --- Configurazione Database MariaDB/MySQL ---
// Questi valori sono quelli predefiniti di XAMPP.
// Modificare se il proprio ambiente ha credenziali diverse.
define('DB_HOST', 'localhost');       // Host del server database
define('DB_NAME', 'binario_live');    // Nome del database (deve corrispondere allo schema SQL)
define('DB_USER', 'root');           // Nome utente del database (default XAMPP: root)
define('DB_PASS', '');               // Password del database (default XAMPP: vuota)

// --- URL base delle API di Trenitalia (ViaggiaTreno) ---
// Queste sono le API non ufficiali del portale ViaggiaTreno.
// Il proxy PHP le chiama lato server per evitare problemi di CORS nel browser.
define('TRENITALIA_BASE', 'http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno');

// --- Chiave API OpenWeatherMap (opzionale) ---
// Se compilata, viene usata come fallback quando il meteo di Trenitalia
// non e' disponibile per una determinata stazione.
// Per ottenere una chiave gratuita: https://openweathermap.org/api
define('OWM_API_KEY', '');

/**
 * Restituisce una connessione PDO al database MariaDB/MySQL.
 * Utilizza il pattern Singleton (variabile static) per riutilizzare
 * la stessa connessione durante tutta la richiesta PHP, evitando
 * di aprire connessioni multiple.
 *
 * @return PDO|null  Oggetto PDO se la connessione riesce, null se fallisce
 */
function getDb(): PDO {
    static $pdo = null;  // La variabile static mantiene il valore tra le chiamate
    if ($pdo === null) {
        try {
            // Crea la connessione PDO con le opzioni di sicurezza:
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // Lancia eccezioni in caso di errore SQL
                    PDO::ATTR_DEFAULT_FETCH_MODE  => PDO::FETCH_ASSOC,        // Restituisce array associativi per default
                    PDO::ATTR_EMULATE_PREPARES    => false,                   // Usa prepared statement nativi (piu' sicuri)
                ]
            );
        } catch (PDOException $e) {
            // Se la connessione fallisce (es. DB non avviato), restituisce null
            // invece di bloccare l'intera applicazione
            return null;
        }
    }
    return $pdo;
}
