import { useMemo, useRef, useState } from "react";
import { PING_SECONDS, runPingMonitor } from "../api";
import { PageHeader } from "../components/PageHeader";
import type { Device, DevicePingState, PingSample, PingTickPayload } from "../types";

interface StatusListPageProps {
  devices: Device[];
  onToast: (message: string) => void;
  onGoDevices: () => void;
}

function channelLabel(sample: PingSample | null): string {
  if (!sample) return "—";
  if (sample.channel_type === "direct") return "直连";
  if (sample.channel_type === "relay") return "DERP";
  return "未知";
}

function channelClass(sample: PingSample | null): string {
  if (!sample) return "tag-muted";
  if (sample.channel_type === "direct") return "tag-success";
  if (sample.channel_type === "relay") return "tag-warn";
  return "tag-muted";
}

function FlipResult({
  state,
}: {
  state: DevicePingState | undefined;
}) {
  if (!state) {
    return <span className="cell-muted">—</span>;
  }

  if (state.loading && !state.current && !state.lastError) {
    return (
      <div className="flip-slot">
        <div className="flip-panel flip-panel-idle">
          <span className="cell-muted">—</span>
        </div>
      </div>
    );
  }

  const tick = state.tick;

  if (state.current) {
    const { latency_ms, channel_detail } = state.current;
    return (
      <div className="flip-slot">
        <div key={tick} className="flip-panel">
          <span className={`tag ${channelClass(state.current)}`}>
            {channelLabel(state.current)}
          </span>
          <span className="flip-latency">
            {latency_ms != null ? `${latency_ms} ms` : "—"}
          </span>
          {channel_detail && (
            <span className="flip-detail">{channel_detail}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flip-slot">
      <div key={tick} className="flip-panel flip-panel-error">
        <span className="cell-muted">{state.lastError || "无响应"}</span>
      </div>
    </div>
  );
}

function applyTick(
  prev: Record<string, DevicePingState>,
  payload: PingTickPayload,
): Record<string, DevicePingState> {
  const { device_id, second, total, result } = payload;
  const prevState = prev[device_id] ?? {
    loading: true,
    current: null,
    tick: 0,
    lastError: null,
    checkedAt: null,
    everOnline: false,
  };
  const tick = prevState.tick + 1;
  const isLast = second >= total;

  if (result.ok && result.sample) {
    return {
      ...prev,
      [device_id]: {
        loading: !isLast,
        current: result.sample,
        tick,
        lastError: null,
        everOnline: true,
        checkedAt: isLast ? new Date().toLocaleTimeString() : prevState.checkedAt,
      },
    };
  }

  return {
    ...prev,
    [device_id]: {
      loading: !isLast,
      current: null,
      tick,
      lastError: result.error,
      everOnline: prevState.everOnline,
      checkedAt: isLast ? new Date().toLocaleTimeString() : prevState.checkedAt,
    },
  };
}

export function StatusListPage({
  devices,
  onToast,
  onGoDevices,
}: StatusListPageProps) {
  const [query, setQuery] = useState("");
  const [pingMap, setPingMap] = useState<Record<string, DevicePingState>>({});
  const [pingingAll, setPingingAll] = useState(false);
  const runIdsRef = useRef<Record<string, number>>({});
  const batchRunIdRef = useRef(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) =>
      [d.name, d.ip, d.notes].join(" ").toLowerCase().includes(q),
    );
  }, [devices, query]);

  function initPingState(): DevicePingState {
    return {
      loading: true,
      current: null,
      tick: 0,
      lastError: null,
      checkedAt: null,
      everOnline: false,
    };
  }

  function isRunActive(deviceId: string, runId: number) {
    return runIdsRef.current[deviceId] === runId;
  }

  async function runPingSeries(device: Device) {
    const runId = (runIdsRef.current[device.id] ?? 0) + 1;
    runIdsRef.current[device.id] = runId;
    let hadSuccess = false;

    setPingMap((prev) => ({
      ...prev,
      [device.id]: initPingState(),
    }));

    try {
      await runPingMonitor([{ id: device.id, ip: device.ip }], (payload) => {
        if (!isRunActive(device.id, runId)) return;
        if (payload.result.ok && payload.result.sample) {
          hadSuccess = true;
        }
        setPingMap((prev) => applyTick(prev, payload));
      });
    } finally {
      if (!isRunActive(device.id, runId)) return;

      setPingMap((prev) => ({
        ...prev,
        [device.id]: {
          ...prev[device.id],
          loading: false,
        },
      }));

      if (!hadSuccess) {
        onToast(`${device.name} 检测失败`);
      }
    }
  }

  async function runPingAll() {
    if (filtered.length === 0) return;

    const batchRunId = ++batchRunIdRef.current;
    setPingingAll(true);

    setPingMap((prev) => {
      const next = { ...prev };
      for (const device of filtered) {
        next[device.id] = initPingState();
      }
      return next;
    });

    const onlineSet = new Set<string>();

    try {
      await runPingMonitor(
        filtered.map((device) => ({ id: device.id, ip: device.ip })),
        (payload) => {
          if (batchRunId !== batchRunIdRef.current) return;
          if (payload.result.ok && payload.result.sample) {
            onlineSet.add(payload.device_id);
          }
          setPingMap((prev) => applyTick(prev, payload));
        },
      );
    } finally {
      if (batchRunId !== batchRunIdRef.current) return;

      setPingMap((prev) => {
        const next = { ...prev };
        for (const device of filtered) {
          if (next[device.id]) {
            next[device.id] = { ...next[device.id], loading: false };
          }
        }
        return next;
      });

      setPingingAll(false);

      const failCount = filtered.length - onlineSet.size;
      if (failCount > 0) {
        onToast(`${failCount} 台设备检测失败`);
      } else {
        onToast("全部检测完成");
      }
    }
  }

  function isBusy(deviceId: string) {
    return pingMap[deviceId]?.loading ?? false;
  }

  return (
    <div className="page">
      <PageHeader
        title="设备状态"
        description={`全部设备同时检测，每秒并行采样一次，共 ${PING_SECONDS} 秒。`}
        actions={
          <button
            className="btn-primary"
            onClick={runPingAll}
            disabled={pingingAll || filtered.length === 0}
          >
            {pingingAll ? "检测中" : "全部检测"}
          </button>
        }
      />

      <div className="panel glass-panel">
        <div className="panel-toolbar">
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索设备"
          />
          <span className="panel-meta">{filtered.length} 台设备</span>
        </div>

        {filtered.length === 0 ? (
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
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>设备</th>
                  <th>IP</th>
                  <th>状态</th>
                  <th>通道与延迟</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((device) => {
                  const state = pingMap[device.id];
                  const online = state?.everOnline ?? false;

                  return (
                    <tr key={device.id}>
                      <td className="cell-strong">{device.name}</td>
                      <td>
                        <code>{device.ip}</code>
                      </td>
                      <td>
                        {state?.loading ? (
                          <span className="tag tag-loading">检测中</span>
                        ) : online ? (
                          <span className="tag tag-success">在线</span>
                        ) : state ? (
                          <span className="tag tag-danger">离线</span>
                        ) : (
                          <span className="tag tag-muted">未检测</span>
                        )}
                      </td>
                      <td className="flip-cell">
                        <FlipResult state={state} />
                      </td>
                      <td className="cell-muted">{state?.checkedAt || "—"}</td>
                      <td>
                        <button
                          className="btn-ghost"
                          onClick={() => runPingSeries(device)}
                          disabled={isBusy(device.id)}
                        >
                          {state?.loading ? "..." : "检测"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
