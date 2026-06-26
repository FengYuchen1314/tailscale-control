# Tailscale 内网管家

基于 **Rust + Tauri + React** 的桌面应用，用于管理 Tailscale 虚拟内网中的设备与端口服务映射。

记不住 `100.x.x.x` 对应哪台机器、哪个端口跑什么服务？手动录入设备 IP 和名称，再为每台设备记录「端口 → 服务」关系，一键复制或打开。

## 功能

应用分为三个独立板块，从首页点击进入：

1. **设备列表** — 管理 Tailscale 设备（名称、IP、备注），支持增删改
2. **服务列表** — 统一管理所有端口服务映射；添加/编辑时可选所属设备，自动填充 IP
3. **设备状态** — 一键 `tailscale ping` 单台或全部设备，显示直连 / DERP 中继通道与延迟

## 开发环境

- [Rust](https://www.rust-lang.org/)
- [Node.js](https://nodejs.org/) 18+
- Windows / macOS / Linux 桌面开发依赖（见 [Tauri 文档](https://tauri.app/start/prerequisites/)）

## 快速开始

```bash
npm install
npm run tauri dev
```

## 构建发布版

```bash
npm run tauri build
```

安装包输出在 `src-tauri/target/release/bundle/`。

## 数据存储位置

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%\com.tailscale.control\devices.json` |
| macOS | `~/Library/Application Support/com.tailscale.control/devices.json` |
| Linux | `~/.local/share/com.tailscale.control/devices.json` |

## 技术栈

- **后端**: Rust（Tauri 2）
- **前端**: React + TypeScript + Vite
- **持久化**: JSON 文件

## 许可证

MIT
