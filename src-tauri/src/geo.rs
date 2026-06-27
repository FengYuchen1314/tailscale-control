use std::net::IpAddr;
use std::time::Duration;

use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct IpApiResponse {
    status: String,
    country: Option<String>,
    #[serde(rename = "regionName")]
    region_name: Option<String>,
    city: Option<String>,
}

/// 查询公网 IP 归属地（中文）。
pub fn lookup_ip_location(ip: &str) -> Result<String, String> {
    let ip = ip.trim();

    if is_tailscale_cgnat(ip) {
        return Err("Tailscale 内网地址".into());
    }

    let url = format!(
        "http://ip-api.com/json/{ip}?lang=zh-CN&fields=status,country,regionName,city"
    );

    let response = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|err| err.to_string())?
        .get(url)
        .send()
        .map_err(|err| format!("查询失败: {err}"))?
        .json::<IpApiResponse>()
        .map_err(|err| format!("解析失败: {err}"))?;

    if response.status != "success" {
        return Err("无法解析归属地".into());
    }

    let parts = [response.country, response.region_name, response.city]
        .into_iter()
        .flatten()
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();

    if parts.is_empty() {
        return Err("无归属地数据".into());
    }

    Ok(parts.join(" "))
}

fn is_tailscale_cgnat(ip: &str) -> bool {
    let Ok(IpAddr::V4(v4)) = ip.parse::<IpAddr>() else {
        return false;
    };

    let octets = v4.octets();
    octets[0] == 100 && (64..=127).contains(&octets[1])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_tailscale_range() {
        assert!(is_tailscale_cgnat("100.84.133.35"));
        assert!(!is_tailscale_cgnat("110.89.205.13"));
    }
}
