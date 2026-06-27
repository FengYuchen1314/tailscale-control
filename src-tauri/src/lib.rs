mod commands;
mod geo;
mod models;
mod ping;
mod store;

use std::sync::Mutex;

use tauri::Manager;

use commands::AppState;
use store::Store;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())?;
            let store_path = data_dir.join("devices.json");
            let store = Store::load(store_path).map_err(|e| e.to_string())?;

            app.manage(AppState {
                store: Mutex::new(store),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_devices,
            commands::add_device,
            commands::update_device,
            commands::delete_device,
            commands::ping_once,
            commands::run_ping_monitor,
            commands::lookup_ip_location,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
