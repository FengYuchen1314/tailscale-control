export interface Service {
  id: string;
  port: number;
  name: string;
  protocol: "http" | "https" | "tcp";
  path: string;
  notes: string;
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  notes: string;
  services: Service[];
}

export interface DeviceInput {
  name: string;
  ip: string;
  notes: string;
}

export interface ServiceInput {
  port: number;
  name: string;
  protocol: "http" | "https" | "tcp";
  path: string;
  notes: string;
}

export interface ServiceRow {
  service: Service;
  deviceId: string;
  deviceName: string;
  deviceIp: string;
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
  checkedAt: string | null;
  everOnline: boolean;
}

export type Page = "devices" | "services" | "status";
