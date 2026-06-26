import { openUrl } from "@tauri-apps/plugin-opener";
import { useMemo, useState } from "react";
import { addService, deleteService, updateService } from "../api";
import { PageHeader } from "../components/PageHeader";
import { ServiceForm } from "../components/ServiceForm";
import { serviceAddress } from "../utils/serviceAddress";
import type { Device, ServiceRow } from "../types";

interface ServiceListPageProps {
  devices: Device[];
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
  onGoDevices: () => void;
}

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; row: ServiceRow };

function flattenServices(devices: Device[]): ServiceRow[] {
  return devices.flatMap((device) =>
    device.services.map((service) => ({
      service,
      deviceId: device.id,
      deviceName: device.name,
      deviceIp: device.ip,
    })),
  );
}

export function ServiceListPage({
  devices,
  onRefresh,
  onToast,
  onGoDevices,
}: ServiceListPageProps) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const rows = useMemo(() => flattenServices(devices), [devices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.service.name,
        serviceAddress(row),
        row.service.protocol,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  async function handleDelete(row: ServiceRow) {
    if (!confirm(`确定删除服务「${row.service.name}」吗？`)) return;
    await deleteService(row.service.id);
    await onRefresh();
    onToast("服务已删除");
  }

  async function handleOpen(row: ServiceRow) {
    const address = serviceAddress(row);
    if (row.service.protocol === "tcp") {
      await navigator.clipboard.writeText(address);
      onToast("地址已复制");
    } else {
      await openUrl(address);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="服务列表"
        description="维护端口与服务的对应关系，选择设备后自动关联 IP。"
        actions={
          <button
            className="btn-primary"
            onClick={() => setModal({ type: "add" })}
            disabled={devices.length === 0}
          >
            添加服务
          </button>
        }
      />

      <div className="panel glass-panel">
        <div className="panel-toolbar">
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索服务名、地址、协议"
          />
          <span className="panel-meta">{filtered.length} 条记录</span>
        </div>

        {devices.length === 0 ? (
          <div className="empty-state">
            <p>还没有设备</p>
            <span>
              请先在
              <button className="link-btn" onClick={onGoDevices}>
                设备列表
              </button>
              中添加
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>暂无服务</p>
            <span>点击右上角添加端口映射</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>服务</th>
                  <th>协议</th>
                  <th>地址</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.service.id}>
                    <td className="cell-strong">{row.service.name}</td>
                    <td>
                      <span className={`tag ${row.service.protocol}`}>
                        {row.service.protocol.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <code>{serviceAddress(row)}</code>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-ghost" onClick={() => handleOpen(row)}>
                          {row.service.protocol === "tcp" ? "复制" : "打开"}
                        </button>
                        <button
                          className="btn-ghost"
                          onClick={() => setModal({ type: "edit", row })}
                        >
                          编辑
                        </button>
                        <button
                          className="btn-ghost danger-text"
                          onClick={() => handleDelete(row)}
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
        <ServiceForm
          title="添加服务"
          submitLabel="添加"
          devices={devices}
          onSubmit={async (deviceId, input) => {
            await addService(deviceId, input);
            await onRefresh();
            setModal({ type: "none" });
            onToast("服务已添加");
          }}
          onCancel={() => setModal({ type: "none" })}
        />
      )}

      {modal.type === "edit" && (
        <ServiceForm
          title="编辑服务"
          submitLabel="保存"
          devices={devices}
          initialDeviceId={modal.row.deviceId}
          initial={{
            port: modal.row.service.port,
            name: modal.row.service.name,
            protocol: modal.row.service.protocol,
            path: modal.row.service.path ?? "",
            notes: modal.row.service.notes,
          }}
          onSubmit={async (deviceId, input) => {
            await updateService(modal.row.service.id, deviceId, input);
            await onRefresh();
            setModal({ type: "none" });
            onToast("服务已更新");
          }}
          onCancel={() => setModal({ type: "none" })}
        />
      )}
    </div>
  );
}
