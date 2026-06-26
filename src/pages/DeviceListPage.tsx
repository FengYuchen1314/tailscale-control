import { useMemo, useState } from "react";
import { addDevice, deleteDevice, updateDevice } from "../api";
import { DeviceForm } from "../components/DeviceForm";
import { PageHeader } from "../components/PageHeader";
import type { Device } from "../types";

interface DeviceListPageProps {
  devices: Device[];
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
}

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; device: Device };

export function DeviceListPage({
  devices,
  onRefresh,
  onToast,
}: DeviceListPageProps) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) =>
      [d.name, d.ip, d.notes, String(d.services.length)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [devices, query]);

  async function handleDelete(device: Device) {
    if (
      !confirm(
        `确定删除设备「${device.name}」吗？其下 ${device.services.length} 个服务也会一并删除。`,
      )
    ) {
      return;
    }
    await deleteDevice(device.id);
    await onRefresh();
    onToast("设备已删除");
  }

  return (
    <div className="page">
      <PageHeader
        title="设备列表"
        description="记录 Tailscale 虚拟内网中的设备名称与 IP 地址。"
        actions={
          <button className="btn-primary" onClick={() => setModal({ type: "add" })}>
            添加设备
          </button>
        }
      />

      <div className="panel glass-panel">
        <div className="panel-toolbar">
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索名称或 IP"
          />
          <span className="panel-meta">{filtered.length} 条记录</span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>暂无设备</p>
            <span>点击右上角添加第一台设备</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>IP 地址</th>
                  <th>服务</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((device) => (
                  <tr key={device.id}>
                    <td className="cell-strong">{device.name}</td>
                    <td>
                      <code>{device.ip}</code>
                    </td>
                    <td>{device.services.length}</td>
                    <td className="cell-muted">{device.notes || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn-ghost"
                          onClick={() => setModal({ type: "edit", device })}
                        >
                          编辑
                        </button>
                        <button
                          className="btn-ghost danger-text"
                          onClick={() => handleDelete(device)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.type === "add" && (
        <DeviceForm
          title="添加设备"
          submitLabel="添加"
          onSubmit={async (input) => {
            await addDevice(input);
            await onRefresh();
            setModal({ type: "none" });
            onToast("设备已添加");
          }}
          onCancel={() => setModal({ type: "none" })}
        />
      )}

      {modal.type === "edit" && (
        <DeviceForm
          title="编辑设备"
          submitLabel="保存"
          initial={{
            name: modal.device.name,
            ip: modal.device.ip,
            notes: modal.device.notes,
          }}
          onSubmit={async (input) => {
            await updateDevice(modal.device.id, input);
            await onRefresh();
            setModal({ type: "none" });
            onToast("设备已更新");
          }}
          onCancel={() => setModal({ type: "none" })}
        />
      )}
    </div>
  );
}
