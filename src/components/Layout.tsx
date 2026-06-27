import type { Device, Page } from "../types";

interface LayoutProps {
  page: Page;
  devices: Device[];
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const navItems: { id: Page; label: string; desc: string }[] = [
  { id: "devices", label: "设备", desc: "名称与 IP 管理" },
  { id: "status", label: "状态", desc: "通道与延迟检测" },
];

export function Layout({ page, devices, onNavigate, children }: LayoutProps) {
  return (
    <div className="shell">
      <aside className="sidebar glass-panel">
        <div className="brand">
          <span className="brand-mark">TS</span>
          <div>
            <p className="brand-title">内网管家</p>
            <p className="brand-sub">Tailscale Control</p>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-label">{item.label}</span>
              <span className="nav-desc">{item.desc}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-stats glass-inset">
          <div className="stat">
            <span className="stat-value">{devices.length}</span>
            <span className="stat-label">设备</span>
          </div>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
