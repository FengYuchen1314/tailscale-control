import { invoke } from "@tauri-apps/api/core";
import type {
  Device,
  DeviceInput,
  PingOnceResult,
  Service,
  ServiceInput,
} from "./types";

export async function getDevices(): Promise<Device[]> {
  return invoke("get_devices");
}

export async function addDevice(input: DeviceInput): Promise<Device> {
  return invoke("add_device", { ...input });
}

export async function updateDevice(
  deviceId: string,
  input: DeviceInput,
): Promise<Device> {
  return invoke("update_device", { deviceId, ...input });
}

export async function deleteDevice(deviceId: string): Promise<void> {
  return invoke("delete_device", { deviceId });
}

export async function addService(
  deviceId: string,
  input: ServiceInput,
): Promise<Service> {
  return invoke("add_service", { deviceId, ...input });
}

export async function updateService(
  serviceId: string,
  deviceId: string,
  input: ServiceInput,
): Promise<Service> {
  return invoke("update_service", { serviceId, deviceId, ...input });
}

export async function deleteService(serviceId: string): Promise<void> {
  return invoke("delete_service", { serviceId });
}

export async function pingOnce(ip: string): Promise<PingOnceResult> {
  return invoke("ping_once", { ip });
}

export const PING_SECONDS = 10;
export const PING_INTERVAL_MS = 1000;
