import { useEffect, useState } from "react";
import type { Device, ServiceInput } from "../types";

interface ServiceFormProps {
  devices: Device[];
  initial?: ServiceInput;
  initialDeviceId?: string;
  title: string;
  submitLabel: string;
  onSubmit: (deviceId: string, input: ServiceInput) => Promise<void>;
  onCancel: () => void;
}

export function ServiceForm({
  devices,
  initial,
  initialDeviceId,
  title,
  submitLabel,
  onSubmit,
  onCancel,
}: ServiceFormProps) {
  const [deviceId, setDeviceId] = useState(
    initialDeviceId ?? devices[0]?.id ?? "",
  );
  const [port, setPort] = useState(String(initial?.port ?? ""));
  const [name, setName] = useState(initial?.name ?? "");
  const [protocol, setProtocol] = useState<ServiceInput["protocol"]>(
    initial?.protocol ?? "http",
  );
  const [path, setPath] = useState(initial?.path ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedDevice = devices.find((d) => d.id === deviceId);

  useEffect(() => {
    setDeviceId(initialDeviceId ?? devices[0]?.id ?? "");
    setPort(String(initial?.port ?? ""));
    setName(initial?.name ?? "");
    setProtocol(initial?.protocol ?? "http");
    setPath(initial?.path ?? "");
    setNotes(initial?.notes ?? "");
  }, [initial, initialDeviceId, devices]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!deviceId) {
      setError("请选择所属设备");
      return;
    }

    const portNum = Number(port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      setError("端口号必须是 1-65535 之间的整数");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(deviceId, { port: portNum, name, protocol, path, notes });
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            所属设备（自动填充 IP）
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} — {device.ip}
                </option>
              ))}
            </select>
          </label>

          {selectedDevice && (
            <div className="ip-preview">
              当前 IP：<code>{selectedDevice.ip}</code>
            </div>
          )}

          <label>
            服务名称
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：Jellyfin"
              autoFocus
            />
          </label>

          <div className="form-row">
            <label>
              端口
              <input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="8096"
                inputMode="numeric"
              />
            </label>
            <label>
              协议
              <select
                value={protocol}
                onChange={(e) =>
                  setProtocol(e.target.value as ServiceInput["protocol"])
                }
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="tcp">TCP</option>
              </select>
            </label>
          </div>

          <label>
            路径（可选）
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/v"
            />
          </label>

          <label>
            备注（可选）
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="版本、路径等"
              rows={3}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "保存中..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
