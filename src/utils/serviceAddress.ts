import type { ServiceRow } from "../types";

export function serviceAddress(row: ServiceRow): string {
  const { service, deviceIp } = row;
  const path = service.path ?? "";

  if (service.protocol === "http" || service.protocol === "https") {
    return `${service.protocol}://${deviceIp}:${service.port}${path}`;
  }

  return path ? `${deviceIp}:${service.port}${path}` : `${deviceIp}:${service.port}`;
}
