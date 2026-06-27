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

pub fn extract_public_ip(detail: &str) -> Option<String> {
    let detail = detail.trim();
    if detail.is_empty() {
        return None;
    }

    if detail.starts_with('[') {
        let end = detail.find(']')?;
        return Some(detail[1..end].to_string());
    }

    let host = detail.split(':').next()?.trim();
    if host.contains('.') || host.contains(':') {
        Some(host.to_string())
    } else {
        None
    }
}

pub fn format_derp_location(detail: &str) -> String {
    let code = detail
        .strip_prefix("DERP(")
        .and_then(|s| s.strip_suffix(')'))
        .unwrap_or(detail);

    let name = match code.to_lowercase().as_str() {
        "lax" => "洛杉矶",
        "nyc" => "纽约",
        "sin" => "新加坡",
        "hkg" => "香港",
        "tok" => "东京",
        "syd" => "悉尼",
        "fra" => "法兰克福",
        "par" => "巴黎",
        "lhr" => "伦敦",
        "sea" => "西雅图",
        "ord" => "芝加哥",
        "dfw" => "达拉斯",
        "den" => "丹佛",
        "mia" => "迈阿密",
        "mad" => "马德里",
        "ams" => "阿姆斯特丹",
        "hel" => "赫尔辛基",
        "waw" => "华沙",
        "blr" => "班加罗尔",
        "sao" => "圣保罗",
        "jnb" => "约翰内斯堡",
        "nue" => "纽伦堡",
        "sfo" => "旧金山",
        "iad" => "阿什本",
        _ => code,
    };

    format!("DERP 中继 · {name}")
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
    fn extracts_ipv4_with_port() {
        assert_eq!(
            extract_public_ip("110.89.205.13:11828"),
            Some("110.89.205.13".into())
        );
    }

    #[test]
    fn detects_tailscale_range() {
        assert!(is_tailscale_cgnat("100.84.133.35"));
        assert!(!is_tailscale_cgnat("110.89.205.13"));
    }

    #[test]
    fn formats_derp() {
        assert_eq!(format_derp_location("DERP(lax)"), "DERP 中继 · 洛杉矶");
    }
}
