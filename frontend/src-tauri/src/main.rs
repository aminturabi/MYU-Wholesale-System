// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// NOTE: The Tauri IPC commands below (db_init, db_backup, db_restore) are currently
// unused by the frontend application (which uses browser localStorage with JSON export/import).
// These commands and the SQLite schema are reserved for a future SQLite persistence migration.

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use rusqlite::{Connection, Result as SqlResult};

#[derive(Serialize, Deserialize, Debug)]
struct DbResponse {
    success: bool,
    message: String,
    data: Option<String>,
}

fn get_app_dir() -> PathBuf {
    let dir = directories::ProjectDirs::from("com", "myu", "wholesalesystem")
        .map(|proj| proj.data_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from("./data"));
    
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    dir
}

fn get_db_path() -> PathBuf {
    get_app_dir().join("myu_wholesale.db")
}

fn get_connection() -> SqlResult<Connection> {
    Connection::open(get_db_path())
}

#[tauri::command]
fn db_init() -> DbResponse {
    let conn = match get_connection() {
        Ok(c) => c,
        Err(e) => return DbResponse { success: false, message: format!("Failed to open DB: {}", e), data: None },
    };

    let sql = "
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            val TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            item_no TEXT,
            name TEXT NOT NULL,
            generic_name TEXT,
            brand TEXT,
            company TEXT,
            category TEXT,
            batch_number TEXT,
            expiry_date TEXT,
            tp REAL,
            sale_price REAL,
            retail_price REAL,
            purchased_qty INTEGER,
            available_qty INTEGER,
            bonus_qty INTEGER,
            discount REAL,
            rack_number TEXT,
            min_stock_level INTEGER,
            notes TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS companies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            address TEXT,
            total_purchases REAL,
            paid_amount REAL,
            remaining_balance REAL,
            notes TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            shop_name TEXT,
            phone TEXT,
            address TEXT,
            total_purchases REAL,
            paid_amount REAL,
            remaining_balance REAL,
            notes TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS purchases (
            id TEXT PRIMARY KEY,
            purchase_number TEXT,
            company_id TEXT,
            company_name TEXT,
            date TEXT,
            time TEXT,
            invoice_no TEXT,
            items_json TEXT,
            gross_total REAL,
            discount REAL,
            net_amount REAL,
            paid_amount REAL,
            remaining_balance REAL,
            payment_method TEXT,
            status TEXT,
            notes TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS sales (
            id TEXT PRIMARY KEY,
            invoice_number TEXT,
            customer_id TEXT,
            customer_name TEXT,
            customer_shop TEXT,
            date TEXT,
            time TEXT,
            items_json TEXT,
            gross_total REAL,
            discount_percent REAL,
            total_discount REAL,
            net_amount REAL,
            paid_amount REAL,
            remaining_balance REAL,
            total_cost REAL,
            total_profit REAL,
            payment_method TEXT,
            status TEXT,
            notes TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS returns (
            id TEXT PRIMARY KEY,
            return_number TEXT,
            sale_id TEXT,
            invoice_number TEXT,
            date TEXT,
            time TEXT,
            customer_id TEXT,
            customer_name TEXT,
            items_json TEXT,
            total_refund_amount REAL,
            total_profit_reversed REAL,
            payment_method TEXT,
            reason TEXT,
            notes TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            date TEXT,
            title TEXT,
            category TEXT,
            amount REAL,
            payment_method TEXT,
            notes TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS incomes (
            id TEXT PRIMARY KEY,
            date TEXT,
            title TEXT,
            category TEXT,
            amount REAL,
            payment_method TEXT,
            notes TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS supplier_payments (
            id TEXT PRIMARY KEY,
            company_id TEXT,
            company_name TEXT,
            date TEXT,
            amount REAL,
            method TEXT,
            reference TEXT,
            notes TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS customer_payments (
            id TEXT PRIMARY KEY,
            customer_id TEXT,
            customer_name TEXT,
            date TEXT,
            amount REAL,
            method TEXT,
            reference TEXT,
            notes TEXT,
            created_at TEXT
        );
    ";

    match conn.execute_batch(sql) {
        Ok(_) => DbResponse { success: true, message: "SQLite tables initialized successfully.".into(), data: None },
        Err(e) => DbResponse { success: false, message: format!("Failed to create schema: {}", e), data: None },
    }
}

#[tauri::command]
fn db_backup(target_path: String) -> DbResponse {
    let db_p = get_db_path();
    if !db_p.exists() {
        return DbResponse { success: false, message: "Source DB file does not exist yet.".into(), data: None };
    }

    match fs::copy(&db_p, &target_path) {
        Ok(_) => DbResponse { success: true, message: format!("Database backed up to {}", target_path), data: None },
        Err(e) => DbResponse { success: false, message: format!("Backup error: {}", e), data: None },
    }
}

#[tauri::command]
fn db_restore(source_path: String) -> DbResponse {
    let db_p = get_db_path();
    let safety_path = get_app_dir().join(format!("safety_backup_{}.db", chrono::Local::now().format("%Y%m%d_%H%M%S")));

    if db_p.exists() {
        let _ = fs::copy(&db_p, &safety_path);
    }

    match fs::copy(&source_path, &db_p) {
        Ok(_) => DbResponse { success: true, message: "Database restored successfully.".into(), data: None },
        Err(e) => DbResponse { success: false, message: format!("Restore error: {}", e), data: None },
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            db_init,
            db_backup,
            db_restore
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
