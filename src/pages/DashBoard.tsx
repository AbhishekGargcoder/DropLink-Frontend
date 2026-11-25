import { useEffect, useState, useCallback } from "react";
import { Smartphone, Trash2, Plus, RefreshCw, Laptop, ShieldCheck, AlertTriangle, X, Pencil, Check } from "lucide-react";

import { usePairedDevices } from "../hooks/usePairedDevices";
import { usePairing } from "../hooks/usePairing";
import { ensureDeviceRegistered, renameCurrentDevice } from "../services/device.service";
import { useSocket } from "../components/context/SocketContext";
import PairDeviceModal from "../components/devices/PairDeviceModal";
import RecoveryModal from "../components/devices/RecoveryModal";
import ConnectionStatus from "../components/layout/ConnectionStatus";
import ShareSection from "../components/share/ShareSection";


function Dashboard() {
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [confirmUnpairDevice, setConfirmUnpairDevice] = useState<{ id: string; name: string } | null>(null);
  const [unpairingId, setUnpairingId] = useState<string | null>(null);
  const [recoverDevice, setRecoverDevice] = useState<{ id: string; name: string } | null>(null);
  const [isEditingLaptopName, setIsEditingLaptopName] = useState(false);
  const [laptopNameDraft, setLaptopNameDraft] = useState("");
  const [isRenamingLaptop, setIsRenamingLaptop] = useState(false);

  const { setCredential, currentDevice, refreshCurrentDevice } = useSocket();

  const {
    devices,
    loading: loadingDevices,
    error: devicesError,
    refreshDevices,
    addDevice,
    removeDevice,
  } = usePairedDevices();

  const pairing = usePairing(isPairModalOpen);

  // Initialize Desktop device registration automatically
  const initializeDesktop = useCallback(async () => {
    try {
      setIsInitializing(true);
      const { credential } = await ensureDeviceRegistered();
      setCredential(credential);
      await refreshCurrentDevice();
      await refreshDevices();
    } catch (err) {
      console.error("Desktop initialization failed:", err);
    } finally {
      setIsInitializing(false);
    }
  }, [setCredential, refreshCurrentDevice, refreshDevices]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void initializeDesktop();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initializeDesktop]);

  // When QR code modal opens, generate code automatically if none active
  useEffect(() => {
    if (isPairModalOpen && !pairing.sessionId && !pairing.loading) {
      void pairing.generateQR();
    }
  }, [isPairModalOpen, pairing]);

  // Automatically update paired devices when pairing completes
  useEffect(() => {
    if (pairing.status === "COMPLETED" && pairing.pairedDevice) {
      addDevice(pairing.pairedDevice);// POST: //api/devices/regsiter
      void refreshDevices();
      const timer = setTimeout(() => {
        setIsPairModalOpen(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pairing.status, pairing.pairedDevice, addDevice, refreshDevices]);

  const handleUnpair = async (deviceId: string) => {
    // here deviceId  = phoneId of the device to be unpaired
    try {
      setActionError(null);
      setUnpairingId(deviceId);
      await removeDevice(deviceId); // #1
      await refreshDevices(); // #2
    } catch {
      setActionError("Unable to unpair this device. Please try again.");
    } finally {
      setUnpairingId(null);
      setConfirmUnpairDevice(null);
    }
  };

  const startEditingLaptopName = () => {
    setLaptopNameDraft(currentDevice?.deviceName || "");
    setIsEditingLaptopName(true);
  };

  const saveLaptopName = async () => {
    const name = laptopNameDraft.trim();
    if (!name) {
      setActionError("Laptop name cannot be empty.");
      return;
    }
    if (name.length > 80) {
      setActionError("Laptop name must be 80 characters or fewer.");
      return;
    }

    try {
      setIsRenamingLaptop(true);
      setActionError(null);
      await renameCurrentDevice(name);
      await refreshCurrentDevice();
      setIsEditingLaptopName(false);
    } catch (err: unknown) {
      const response = (
        err as { response?: { data?: { message?: string } } }
      ).response;
      setActionError(response?.data?.message || "Unable to rename this laptop.");
    } finally {
      setIsRenamingLaptop(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0D12] p-4 sm:p-6 md:p-10 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                DropLink
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                Desktop
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              Seamlessly share text, links and files across your devices.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {currentDevice && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-[#151821] border border-gray-800 px-3 py-1.5 rounded-xl">
                <Laptop size={14} className="text-blue-400" />
                {isEditingLaptopName ? (
                  <>    
                    <input
                      value={laptopNameDraft}
                      onChange={(event) => setLaptopNameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveLaptopName();
                        if (event.key === "Escape") setIsEditingLaptopName(false);
                      }}
                      maxLength={80}
                      autoFocus
                      className="w-36 rounded border border-gray-700 bg-[#0B0D12] px-2 py-1 text-sm font-medium text-white outline-none focus:border-blue-500"
                      aria-label="Laptop name"
                    />
                    <button
                      onClick={() => void saveLaptopName()}
                      disabled={isRenamingLaptop}
                      className="rounded p-1 text-green-400 hover:bg-green-500/10"
                      title="Save laptop name"
                    >
                      {isRenamingLaptop ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => setIsEditingLaptopName(false)}
                      className="rounded p-1 text-gray-400 hover:text-white"
                      title="Cancel rename"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-300">{currentDevice.deviceName}</span>
                    <button
                      onClick={startEditingLaptopName}
                      className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-blue-400"
                      title="Rename laptop"
                      aria-label="Rename laptop"
                    >
                      <Pencil size={13} />
                    </button>
                  </>
                )}
              </div>
            )}
            <ConnectionStatus />
          </div>
        </header>

        {/* Action / Error Banner */}
        {actionError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
            {actionError}
          </div>
        )}

        {/* Devices Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Paired Devices</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {devices.length} phone{devices.length === 1 ? "" : "s"} connected
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void refreshDevices()}
                disabled={loadingDevices}
                className="rounded-xl border border-gray-800 bg-[#151821] p-2.5 text-gray-400 hover:text-white hover:border-gray-700 transition"
                title="Refresh paired devices"
              >
                <RefreshCw size={16} className={loadingDevices ? "animate-spin" : ""} />
              </button>

              <button
                onClick={() => setIsPairModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition"
              >
                <Plus size={16} />
                Pair Phone
              </button>
            </div>
          </div>

          {devicesError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
              {devicesError}
            </p>
          )}

          {isInitializing || loadingDevices ? (
            <div className="flex items-center justify-center py-10 text-gray-500 gap-2 text-sm">
              <RefreshCw size={18} className="animate-spin text-blue-500" />
              <span>Loading devices...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-800 bg-[#11141D]/50 p-10 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-800/60 flex items-center justify-center text-gray-500 mb-3">
                <Smartphone size={28} />
              </div>
              <h3 className="font-semibold text-gray-300">No phones paired yet</h3>
              <p className="mt-1 text-xs text-gray-400 max-w-sm">
                Pair your smartphone using the QR code to start transferring notes, links, and text instantly.
              </p>
              <button
                onClick={() => setIsPairModalOpen(true)}
                className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold hover:bg-blue-500 transition"
              >
                <Plus size={15} /> Pair Your Phone
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="rounded-2xl border border-gray-800/90 bg-[#151821] p-5 shadow-lg flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-400">
                        <Smartphone size={22} />
                      </div>

                      <div>
                        <h3 className="font-semibold text-sm text-white">
                          {device.deviceName}
                        </h3>
                        <span className="inline-block mt-0.5 text-[10px] font-medium bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                          {device.platform}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setConfirmUnpairDevice({ id: device.id, name: device.deviceName })}
                      className="rounded-lg p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Unpair device"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <button
                    onClick={() => setRecoverDevice({ id: device.id, name: device.deviceName })}
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 transition"
                  >
                    <RefreshCw size={14} />
                    Recover
                  </button>
                
                  <div className="mt-5 border-t border-gray-800/80 pt-3 flex items-center justify-between text-[11px] text-gray-500">
                    <div className="flex items-center gap-1 text-green-400">
                      <ShieldCheck size={13} />
                      <span>Paired</span>
                    </div>
                    <span>
                      {device.lastSeenAt
                        ? new Date(device.lastSeenAt).toLocaleDateString()
                        : "Active"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Real-time Sharing Section */}
        {devices.length > 0 && (
          <section className="pt-2">
            <ShareSection
              targetDevices={devices}
              currentDeviceId={currentDevice?.id}
            />
          </section>
        )}
{/*  ALL MODALS OR POP-UPS IN OUR APP */}
        {/* QR Pairing Modal */}
        <PairDeviceModal
          isOpen={isPairModalOpen}
          onClose={() => setIsPairModalOpen(false)}
          onGenerate={pairing.generateQR}
          qrValue={pairing.pairingUrl || pairing.qrToken}
          isGenerating={pairing.loading}
          error={pairing.error}
          status={pairing.status}
          expiresAt={pairing.expiresAt}
        />

        <RecoveryModal
          laptopDeviceId={currentDevice?.id}
          phone={recoverDevice}
          onClose={() => setRecoverDevice(null)}
        />

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
                Are you sure you want to unpair <span className="font-semibold text-white">{confirmUnpairDevice.name}</span>?
              </p>
              <p className="text-xs text-gray-500 mb-6">
                Your chat history will be preserved. The device can reconnect anytime by scanning a new QR code.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmUnpairDevice(null)}
                  className="flex-1 rounded-xl border border-gray-700 bg-gray-800/50 py-2.5 text-xs font-medium text-gray-300 hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleUnpair(confirmUnpairDevice.id)} // phone-id
                  disabled={unpairingId === confirmUnpairDevice.id}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-500 transition disabled:opacity-50"
                >
                  {unpairingId === confirmUnpairDevice.id ? "Unpairing..." : "Unpair"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default Dashboard;
