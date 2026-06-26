import { useEffect, useState } from "react";
import type { DeviceInput } from "../types";

interface DeviceFormProps {
  initial?: DeviceInput;
  title: string;
  submitLabel: string;
  onSubmit: (input: DeviceInput) => Promise<void>;
  onCancel: () => void;
}

export function DeviceForm({
  initial,
  title,
  submitLabel,
  onSubmit,
  onCancel,
}: DeviceFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [ip, setIp] = useState(initial?.ip ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? "");
    setIp(initial?.ip ?? "");
    setNotes(initial?.notes ?? "");
  }, [initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({ name, ip, notes });
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
            设备名称
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：家庭 NAS"
              autoFocus
            />
          </label>
          <label>
            Tailscale IP
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="例如：100.64.0.1"
            />
          </label>
          <label>
            备注（可选）
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="设备用途、位置等"
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
