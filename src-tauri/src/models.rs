use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Service {
    pub id: String,
    pub port: u16,
    pub name: String,
    pub protocol: String,
    #[serde(default)]
    pub path: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub notes: String,
    pub services: Vec<Service>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AppData {
    pub devices: Vec<Device>,
}
