use std::sync::Mutex;
use std::time::Duration;

use serde::Deserialize;
use tauri::{AppHandle, Emitter, State};

use crate::geo;
use crate::models::Device;
use crate::ping::{self, PingOnceResult, PingTickPayload};
use crate::store::Store;

pub struct AppState {
    pub store: Mutex<Store>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PingDeviceTarget {
    pub id: String,
    pub ip: String,
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
pub async fn ping_once(ip: String) -> PingOnceResult {
    tauri::async_runtime::spawn_blocking(move || ping::ping_once(&ip))
        .await
        .unwrap_or_else(|err| PingOnceResult {
            ok: false,
            sample: None,
            error: Some(format!("ping 任务失败: {err}")),
        })
}

#[tauri::command]
pub async fn run_ping_monitor(
    app: AppHandle,
    devices: Vec<PingDeviceTarget>,
    seconds: u32,
) -> Result<(), String> {
    if devices.is_empty() {
        return Ok(());
    }

    tauri::async_runtime::spawn_blocking(move || {
        let interval = Duration::from_secs(1);

        for sec in 1..=seconds {
            let handles: Vec<_> = devices
                .iter()
                .map(|device| {
                    let device_id = device.id.clone();
                    let ip = device.ip.clone();
                    std::thread::spawn(move || {
                        let result = ping::ping_once(&ip);
                        (device_id, result)
                    })
                })
                .collect();

            for handle in handles {
                if let Ok((device_id, result)) = handle.join() {
                    let _ = app.emit(
                        "ping-tick",
                        PingTickPayload {
                            device_id,
                            second: sec,
                            total: seconds,
                            result,
                        },
                    );
                }
            }

            if sec < seconds {
                std::thread::sleep(interval);
            }
        }

        let _ = app.emit("ping-done", ());
    })
    .await
    .map_err(|err| format!("ping 监控任务失败: {err}"))?;

    Ok(())
}

#[tauri::command]
pub async fn lookup_ip_location(ip: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || geo::lookup_ip_location(&ip))
        .await
        .map_err(|err| format!("归属地查询失败: {err}"))?
}
