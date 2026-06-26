use std::fs;
use std::path::PathBuf;

use uuid::Uuid;

use crate::models::{AppData, Device, Service};

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
            services: Vec::new(),
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

    pub fn add_service(
        &mut self,
        device_id: &str,
        port: u16,
        name: String,
        protocol: String,
        path: String,
        notes: String,
    ) -> Result<Service, String> {
        validate_port(port)?;
        validate_service_name(&name)?;
        validate_protocol(&protocol)?;
        let path = normalize_path(&path)?;

        let device = self.find_device_mut(device_id)?;

        if device
            .services
            .iter()
            .any(|s| s.port == port && s.path == path)
        {
            return Err(format!("端口 {port}{path} 已存在"));
        }

        let service = Service {
            id: Uuid::new_v4().to_string(),
            port,
            name: name.trim().to_string(),
            protocol,
            path,
            notes: notes.trim().to_string(),
        };

        device.services.push(service.clone());
        self.save()?;
        Ok(service)
    }

    fn remove_service(&mut self, service_id: &str) -> Result<Service, String> {
        for device in &mut self.data.devices {
            if let Some(index) = device.services.iter().position(|s| s.id == service_id) {
                return Ok(device.services.remove(index));
            }
        }
        Err(format!("服务不存在: {service_id}"))
    }

    pub fn update_service(
        &mut self,
        service_id: &str,
        device_id: &str,
        port: u16,
        name: String,
        protocol: String,
        path: String,
        notes: String,
    ) -> Result<Service, String> {
        validate_port(port)?;
        validate_service_name(&name)?;
        validate_protocol(&protocol)?;
        let path = normalize_path(&path)?;

        let original_device_id = self
            .data
            .devices
            .iter()
            .find(|d| d.services.iter().any(|s| s.id == service_id))
            .map(|d| d.id.clone())
            .ok_or_else(|| format!("服务不存在: {service_id}"))?;

        let mut service = self.remove_service(service_id)?;

        let device = self.find_device_mut(device_id)?;

        if device
            .services
            .iter()
            .any(|s| s.port == port && s.path == path)
        {
            let original = self.find_device_mut(&original_device_id)?;
            original.services.push(service);
            self.save()?;
            return Err(format!("该设备上端口 {port}{path} 已存在"));
        }

        service.port = port;
        service.name = name.trim().to_string();
        service.protocol = protocol;
        service.path = path;
        service.notes = notes.trim().to_string();

        let updated = service.clone();
        device.services.push(service);
        self.save()?;
        Ok(updated)
    }

    pub fn delete_service(&mut self, service_id: &str) -> Result<(), String> {
        self.remove_service(service_id)?;
        self.save()
    }
}

fn validate_device_name(name: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("设备名称不能为空".into());
    }
    Ok(())
}

fn validate_service_name(name: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("服务名称不能为空".into());
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

fn validate_port(port: u16) -> Result<(), String> {
    if port == 0 {
        return Err("端口号必须大于 0".into());
    }
    Ok(())
}

fn validate_protocol(protocol: &str) -> Result<(), String> {
    match protocol {
        "http" | "https" | "tcp" => Ok(()),
        _ => Err("协议必须是 http、https 或 tcp".into()),
    }
}

fn normalize_path(path: &str) -> Result<String, String> {
    let path = path.trim();
    if path.is_empty() {
        return Ok(String::new());
    }

    let normalized = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{path}")
    };

    if normalized.contains([' ', '?', '#']) {
        return Err("路径格式不正确".into());
    }

    Ok(normalized)
}
