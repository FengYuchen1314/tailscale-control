use std::process::Command;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct PingSample {
    pub latency_ms: Option<u32>,
    pub channel_type: String,
    pub channel_detail: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PingOnceResult {
    pub ok: bool,
    pub sample: Option<PingSample>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PingTickPayload {
    pub device_id: String,
    pub second: u32,
    pub total: u32,
    pub result: PingOnceResult,
}

const PING_TIMEOUT_SECS: u32 = 2;

fn tailscale_command(args: &[&str]) -> Command {
    let mut cmd = Command::new("tailscale");
    cmd.args(args);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    cmd
}

/// 单次 ping。
pub fn ping_once(ip: &str) -> PingOnceResult {
    let ip = ip.trim();
    let timeout = format!("{PING_TIMEOUT_SECS}s");

    let output = tailscale_command(&["ping", "--c", "1", "--timeout", &timeout, ip]).output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
            let combined = join_output(&stdout, &stderr);

            if let Some(line) = combined.lines().find(|l| l.contains("pong from")) {
                let (channel_type, channel_detail) = parse_channel(line);
                PingOnceResult {
                    ok: true,
                    sample: Some(PingSample {
                        latency_ms: parse_latency(line),
                        channel_type,
                        channel_detail,
                    }),
                    error: None,
                }
            } else {
                PingOnceResult {
                    ok: false,
                    sample: None,
                    error: Some(sanitize_error(&combined)),
                }
            }
        }
        Err(err) => PingOnceResult {
            ok: false,
            sample: None,
            error: Some(format!("无法执行 tailscale 命令: {err}")),
        },
    }
}

fn join_output(stdout: &str, stderr: &str) -> String {
    if stderr.is_empty() {
        stdout.to_string()
    } else if stdout.is_empty() {
        stderr.to_string()
    } else {
        format!("{stdout}\n{stderr}")
    }
}

fn parse_latency(line: &str) -> Option<u32> {
    line.split(" in ")
        .last()?
        .trim()
        .strip_suffix("ms")?
        .parse()
        .ok()
}

fn parse_channel(line: &str) -> (String, String) {
    let via_part = line
        .split(" via ")
        .nth(1)
        .unwrap_or("")
        .split(" in ")
        .next()
        .unwrap_or("")
        .trim();

    if via_part.starts_with("DERP") {
        return ("relay".into(), via_part.into());
    }

    if via_part.is_empty() {
        return ("unknown".into(), String::new());
    }

    ("direct".into(), via_part.into())
}

fn sanitize_error(raw: &str) -> String {
    let useful = raw
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty() && !line.starts_with("pong from"))
        .unwrap_or("无响应");

    if useful.chars().count() > 60 {
        let truncated: String = useful.chars().take(60).collect();
        format!("{truncated}...")
    } else {
        useful.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_direct_line() {
        let line = "pong from center (100.121.113.122) via 198.18.0.218:41641 in 11ms";
        let (kind, detail) = parse_channel(line);
        assert_eq!(kind, "direct");
        assert_eq!(detail, "198.18.0.218:41641");
        assert_eq!(parse_latency(line), Some(11));
    }

    #[test]
    fn parses_derp_line() {
        let line = "pong from device (100.64.0.1) via DERP(lax) in 120ms";
        let (kind, detail) = parse_channel(line);
        assert_eq!(kind, "relay");
        assert_eq!(detail, "DERP(lax)");
    }
}
