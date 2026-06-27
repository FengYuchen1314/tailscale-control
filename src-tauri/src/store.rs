use std::fs;
use std::path::PathBuf;

use uuid::Uuid;

use crate::models::{AppData, Device};

pub struct Store {
    path: PathBuf,
    data: AppData,
}

impl Store {
    pub fn load(path: PathBuf) -> Result<Self, String> {
        let data = if path.exists() {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            AppData::default()
        };

        Ok(Self { path, data })
    }

    pub fn devices(&self) -> &[Device] {
        &self.data.devices
    }

    fn save(&self) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let content = serde_json::to_string_pretty(&self.data).map_err(|e| e.to_string())?;
        fs::write(&self.path, content).map_err(|e| e.to_string())
    }

    fn find_device_mut(&mut self, device_id: &str) -> Result<&mut Device, String> {
        self.data
            .devices
            .iter_mut()
            .find(|d| d.id == device_id)
            .ok_or_else(|| format!("设备不存在: {device_id}"))
    }

    pub fn add_device(
        &mut self,
        name: String,
        ip: String,
        notes: String,
    ) -> Result<Device, String> {
        validate_device_name(&name)?;
        validate_ip(&ip)?;

        if self.data.devices.iter().any(|d| d.ip == ip) {
            return Err(format!("IP {ip} 已被其他设备使用"));
        }

        let device = Device {
            id: Uuid::new_v4().to_string(),
            name: name.trim().to_string(),
            ip: ip.trim().to_string(),
            notes: notes.trim().to_string(),
        };

        self.data.devices.push(device.clone());
        self.save()?;
        Ok(device)
    }

    pub fn update_device(
        &mut self,
        device_id: &str,
        name: String,
        ip: String,
        notes: String,
    ) -> Result<Device, String> {
        validate_device_name(&name)?;
        validate_ip(&ip)?;

        if self
            .data
            .devices
            .iter()
            .any(|d| d.ip == ip && d.id != device_id)
        {
            return Err(format!("IP {ip} 已被其他设备使用"));
        }

        let device = self.find_device_mut(device_id)?;
        device.name = name.trim().to_string();
        device.ip = ip.trim().to_string();
        device.notes = notes.trim().to_string();

        let updated = device.clone();
        self.save()?;
        Ok(updated)
    }

    pub fn delete_device(&mut self, device_id: &str) -> Result<(), String> {
        let len_before = self.data.devices.len();
        self.data.devices.retain(|d| d.id != device_id);

        if self.data.devices.len() == len_before {
            return Err(format!("设备不存在: {device_id}"));
        }

        self.save()
    }
}

fn validate_device_name(name: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("设备名称不能为空".into());
    }
    Ok(())
}

fn validate_ip(ip: &str) -> Result<(), String> {
    let ip = ip.trim();
    if ip.is_empty() {
        return Err("IP 地址不能为空".into());
    }

    let parts: Vec<&str> = ip.split('.').collect();
    if parts.len() != 4 {
        return Err("IP 地址格式不正确".into());
    }

    for part in parts {
        let n: u16 = part
            .parse()
            .map_err(|_| "IP 地址格式不正确".to_string())?;
        if n > 255 {
            return Err("IP 地址格式不正确".into());
        }
    }

    Ok(())
}
