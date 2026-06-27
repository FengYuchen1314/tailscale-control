import { useCallback, useEffect, useState } from "react";
import { getDevices } from "./api";
import { Layout } from "./components/Layout";
import { DeviceListPage } from "./pages/DeviceListPage";
import { StatusListPage } from "./pages/StatusListPage";
import type { Device, Page } from "./types";
import "./App.css";

function App() {
  const [page, setPage] = useState<Page>("devices");
  const [devices, setDevices] = useState<Device[]>([]);
  const [toast, setToast] = useState("");

  const refresh = useCallback(async () => {
    setDevices(await getDevices());
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  function showToast(message: string) {
    setToast(message);
  }

  return (
    <>
      <Layout page={page} devices={devices} onNavigate={setPage}>
        {page === "devices" && (
          <DeviceListPage
            devices={devices}
            onRefresh={refresh}
            onToast={showToast}
          />
        )}
        {page === "status" && (
          <StatusListPage
            devices={devices}
            onToast={showToast}
            onGoDevices={() => setPage("devices")}
          />
        )}
      </Layout>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

export default App;
