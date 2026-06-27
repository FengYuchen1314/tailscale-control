import type { PingSample } from "../types";

const DERP_REGIONS: Record<string, string> = {
  lax: "洛杉矶",
  nyc: "纽约",
  sin: "新加坡",
  hkg: "香港",
  tok: "东京",
  syd: "悉尼",
  fra: "法兰克福",
  par: "巴黎",
  lhr: "伦敦",
  sea: "西雅图",
  ord: "芝加哥",
  dfw: "达拉斯",
  den: "丹佛",
  mia: "迈阿密",
  mad: "马德里",
  ams: "阿姆斯特丹",
  hel: "赫尔辛基",
  waw: "华沙",
  blr: "班加罗尔",
  sao: "圣保罗",
  jnb: "约翰内斯堡",
  nue: "纽伦堡",
  sfo: "旧金山",
  iad: "阿什本",
};

export function extractPublicIp(detail: string): string | null {
  const trimmed = detail.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    if (end > 1) return trimmed.slice(1, end);
    return null;
  }

  const host = trimmed.split(":")[0]?.trim();
  if (!host) return null;
  if (host.includes(".") || host.includes(":")) return host;
  return null;
}

export function formatDerpLocation(detail: string): string {
  const code = detail
    .replace(/^DERP\(/, "")
    .replace(/\)$/, "")
    .toLowerCase();
  const name = DERP_REGIONS[code] ?? code.toUpperCase();
  return `DERP 中继 · ${name}`;
}

export function locationKeyForSample(sample: PingSample): string | null {
  if (sample.channel_type === "relay") {
    return `derp:${sample.channel_detail}`;
  }
  if (sample.channel_type === "direct") {
    const ip = extractPublicIp(sample.channel_detail);
    return ip ? `ip:${ip}` : null;
  }
  return null;
}
