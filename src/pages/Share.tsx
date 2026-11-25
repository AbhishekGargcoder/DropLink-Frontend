import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone, Laptop, Trash2, RefreshCw, QrCode, AlertTriangle, X } from "lucide-react";

import ConnectionStatus from "../components/layout/ConnectionStatus";
import { useSocket } from "../components/context/SocketContext";
import { usePairedDevices } from "../hooks/usePairedDevices";
import ShareSection from "../components/share/ShareSection";

export default function Share() {
  const navigate = useNavigate();
  const { isConnected, currentDevice, refreshCurrentDevice } = useSocket();

  const {
    devices,
    loading: loadingDevices,
    error: devicesError,
    refreshDevices,
    removeDevice,
  } = usePairedDevices();

  const [unpairingId, setUnpairingId] = useState<string | null>(null);
  const [confirmUnpairDevice, setConfirmUnpairDevice] = useState<{ id: string; name: string } | null>(null);

  // Check auth and load paired devices
  const verifyAuth = useCallback(async () => {
    const cred = localStorage.getItem("credential");
    if (!cred) {
      navigate("/pair", { replace: true });
      return;
    }
    await refreshCurrentDevice();
    await refreshDevices();
  }, [navigate, refreshCurrentDevice, refreshDevices]);

  useEffect(() => {
    void verifyAuth();
  }, [verifyAuth]);

  const handleUnpair = async (deviceId: string) => {
    try {
      setUnpairingId(deviceId);
      await removeDevice(deviceId);
      await refreshDevices();
    } catch (err) {
      console.error("Failed to unpair device:", err);
    } finally {
      setUnpairingId(null);
      setConfirmUnpairDevice(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0D12] p-4 sm:p-6 text-white pb-12">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-800/80 pb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              DropLink
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
              Mobile
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionStatus />
          </div>
        </header>

        {/* Current Device Badge */}
        {currentDevice && (
          <div className="flex items-center justify-between bg-[#151821] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <Smartphone size={15} className="text-purple-400" />
              <span>This device:</span>
              <span className="font-semibold text-white">{currentDevice.deviceName}</span>
            </div>
          </div>
        )}

        {/* Connected Laptop Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-200">Paired Laptop</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void refreshDevices()}
                disabled={loadingDevices}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
                title="Refresh"
              >
                <RefreshCw size={14} className={loadingDevices ? "animate-spin" : ""} />
              </button>

              <button
                onClick={() => navigate("/pair?mode=scan")}
                className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg transition"
              >
                <QrCode size={14} /> Pair another
              </button>

              <button
                onClick={() => navigate("/pair?mode=recovery")}
                className="flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg transition"
              >
                <QrCode size={14} /> Recover
              </button>
            </div>
          </div>

          {devicesError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
              {devicesError}
            </p>
          )}

          {loadingDevices ? (
            <div className="rounded-xl border border-gray-800 bg-[#151821] p-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-blue-500" />
              <span>Loading paired laptop...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-800 bg-[#151821]/40 p-6 text-center">
              <Laptop className="mx-auto mb-2 text-gray-600" size={32} />
              <h3 className="font-medium text-gray-300 text-sm">No laptop connected</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                Scan the QR code on your laptop screen to start sharing text and links.
              </p>
              <button
                onClick={() => navigate("/pair?mode=scan")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 transition"
              >
                <QrCode size={15} /> Scan Laptop QR
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="rounded-xl border border-gray-800 bg-[#151821] p-4 flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Laptop size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {device.deviceName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">
                          {device.platform}
                        </span>
                        <span className="text-[10px] text-green-400 font-medium">
                          {isConnected ? "Connected" : "Standby"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmUnpairDevice({ id: device.id, name: device.deviceName })}
                    disabled={unpairingId === device.id}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Unpair laptop"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Real-time Sharing & Clipboard Section */}
        {devices.length > 0 && (
          <section className="pt-2">
            <ShareSection
              targetDevices={devices}
              currentDeviceId={currentDevice?.id}
            />
          </section>
        )}
      </div>

      {/* Unpair Confirmation Modal */}
      {confirmUnpairDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-[#151821] p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-base font-semibold text-white">Unpair Device</h3>
              </div>
              <button
                onClick={() => setConfirmUnpairDevice(null)}
                className="p-1 text-gray-500 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-300 mb-1">
              Are you sure you want to unpair from <span className="font-semibold text-white">{confirmUnpairDevice.name}</span>?
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Your chat history will be preserved. You can reconnect anytime by scanning the QR code again.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmUnpairDevice(null)}
                className="flex-1 rounded-xl border border-gray-700 bg-gray-800/50 py-2.5 text-xs font-medium text-gray-300 hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleUnpair(confirmUnpairDevice.id)}
                disabled={unpairingId === confirmUnpairDevice.id}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-500 transition disabled:opacity-50"
              >
                {unpairingId === confirmUnpairDevice.id ? "Unpairing..." : "Unpair"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
