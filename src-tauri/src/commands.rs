use std::sync::Mutex;

use tauri::State;

use crate::models::{Device, Service};
use crate::ping::{self, PingOnceResult};
use crate::store::Store;

pub struct AppState {
    pub store: Mutex<Store>,
}

#[tauri::command]
pub fn get_devices(state: State<'_, AppState>) -> Result<Vec<Device>, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    Ok(store.devices().to_vec())
}

#[tauri::command]
pub fn add_device(
    state: State<'_, AppState>,
    name: String,
    ip: String,
    notes: String,
) -> Result<Device, String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    store.add_device(name, ip, notes)
}

#[tauri::command]
pub fn update_device(
    state: State<'_, AppState>,
    device_id: String,
    name: String,
    ip: String,
    notes: String,
) -> Result<Device, String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    store.update_device(&device_id, name, ip, notes)
}

#[tauri::command]
pub fn delete_device(state: State<'_, AppState>, device_id: String) -> Result<(), String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    store.delete_device(&device_id)
}

#[tauri::command]
pub fn add_service(
    state: State<'_, AppState>,
    device_id: String,
    port: u16,
    name: String,
    protocol: String,
    path: String,
    notes: String,
) -> Result<Service, String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    store.add_service(&device_id, port, name, protocol, path, notes)
}

#[tauri::command]
pub fn update_service(
    state: State<'_, AppState>,
    service_id: String,
    device_id: String,
    port: u16,
    name: String,
    protocol: String,
    path: String,
    notes: String,
) -> Result<Service, String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    store.update_service(&service_id, &device_id, port, name, protocol, path, notes)
}

#[tauri::command]
pub fn delete_service(state: State<'_, AppState>, service_id: String) -> Result<(), String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    store.delete_service(&service_id)
}

#[tauri::command]
pub fn ping_once(ip: String) -> PingOnceResult {
    ping::ping_once(&ip)
}
