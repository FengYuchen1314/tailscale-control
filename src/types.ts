export interface Device {
  id: string;
  name: string;
  ip: string;
  notes: string;
}

export interface DeviceInput {
  name: string;
  ip: string;
  notes: string;
}

export interface PingSample {
  latency_ms: number | null;
  channel_type: "direct" | "relay" | "unknown" | string;
  channel_detail: string;
}

export interface PingOnceResult {
  ok: boolean;
  sample: PingSample | null;
  error: string | null;
}

export interface PingDeviceTarget {
  id: string;
  ip: string;
}

export interface PingTickPayload {
  device_id: string;
  second: number;
  total: number;
  result: PingOnceResult;
}

export interface DevicePingState {
  loading: boolean;
  current: PingSample | null;
  tick: number;
  lastError: string | null;
  ipLocation: string | null;
  everOnline: boolean;
}

export type Page = "devices" | "status";
