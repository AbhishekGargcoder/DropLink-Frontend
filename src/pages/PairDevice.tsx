import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Smartphone, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft, Edit2 } from "lucide-react";

import { getCurrentDevice, detectPlatform, getDefaultDeviceName } from "../services/device.service";
import { confirmPairing, type MobilePlatform } from "../services/pairing.service";
import { useSocket } from "../components/context/SocketContext";
import QRScanner from "../components/devices/QRScanner";
import { confirmRecoverySession } from "../services/recovery.service";

export default function PairDevice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCredential, clearCredential } = useSocket();

  const [checkingDevice, setCheckingDevice] = useState(true);
  const [isPairing, setIsPairing] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [deviceName, setDeviceName] = useState(() => getDefaultDeviceName("MOBILE"));
  const [isEditingName, setIsEditingName] = useState(false);

  const tokenFromUrl = searchParams.get("token");
  const recoveryMode = searchParams.get("mode") === "recovery";
  // mode=scan means user explicitly wants to pair (from "Pair another" or "Reconnect")
  const scanMode =
    searchParams.get("mode") === "scan" || recoveryMode;

  // Helper to extract clean token from URL or raw string
  const parseToken = (raw: string): string => {
    const trimmed = raw.trim();
    try {
      const url = new URL(trimmed);
      return url.searchParams.get("token") || trimmed;
    } catch {
      const match = trimmed.match(/[?&]token=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
      return trimmed;
    }
  };

  const executePairing = useCallback(
    async (rawToken: string) => {
      const qrToken = parseToken(rawToken);
      if (!qrToken) {
        setErrorMessage("Invalid QR code or token format.");
        return;
      }

      setIsPairing(true);
      setErrorMessage(null);

      const detected = detectPlatform();
      let platform: MobilePlatform = "UNKNOWN";
      if (detected === "ANDROID") platform = "ANDROID";
      else if (detected === "IOS") platform = "IOS";

      // If phone already has a credential, pass it so backend reuses the device identity
      const existingCredential = localStorage.getItem("credential") || undefined;

      try {
        const result = recoveryMode
          ? await confirmRecoverySession(qrToken)
          : await confirmPairing({
              qrToken,
              deviceName: deviceName.trim() || getDefaultDeviceName("MOBILE"),
              platform,
              existingCredential,
            });

        // Store credential, device info and trigger socket connection
        setCredential(result.credential);
        localStorage.setItem("currentDevice", JSON.stringify(result.device));
        setPairSuccess(true);

        setTimeout(() => {
          navigate("/share", { replace: true });
        }, 1200);
      } catch (err: unknown) {
        setIsPairing(false);
        const serverMsg = axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message
          : undefined;
        if (serverMsg?.includes("expired")) {
          setErrorMessage("This QR code has expired. Please generate a new code on your laptop.");
        } else if (serverMsg?.includes("already been used")) {
          setErrorMessage("This QR code was already used. Please generate a fresh code on your laptop.");
        } else if (serverMsg?.includes("Invalid pairing")) {
          setErrorMessage("Invalid QR code. Please scan the QR code displayed on your DropLink laptop screen.");
        } else {
          setErrorMessage(serverMsg || "Unable to pair with laptop. Check your Wi-Fi network and try again.");
        }
      }
    },
    [deviceName, navigate, setCredential, recoveryMode]
  );

  // Check if device already has a valid credential, UNLESS:
  //   - A new token is provided via URL
  //   - User explicitly navigated here in scan mode (from "Pair another" / "Reconnect")
  const checkExistingDevice = useCallback(async () => {
    if (tokenFromUrl) {
      setCheckingDevice(false);
      void executePairing(tokenFromUrl);
      return;
    }

    // If user clicked "Pair another laptop" or "Reconnect", show scanner directly
    if (scanMode) {
      setCheckingDevice(false);
      return;
    }

    const credential = localStorage.getItem("credential");
    if (!credential) {
      setCheckingDevice(false);
      return;
    }

    try {
      await getCurrentDevice();
      // Credential is valid and no pairing requested, go to share page
      navigate("/share", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearCredential();
      }
      setCheckingDevice(false);
    }
  }, [tokenFromUrl, scanMode, executePairing, navigate, clearCredential]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkExistingDevice();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [checkExistingDevice]);

  if (checkingDevice) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0D12] text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
          <p className="text-sm text-gray-400">Connecting to DropLink...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0D12] p-4 sm:p-6 text-white flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        {/* Navigation & Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => {
              // If user has a credential, go back to share page; otherwise go home
              const cred = localStorage.getItem("credential");
              navigate("/share");
            }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">
            Device Pairing
          </span>
        </div>

        {/* Pairing Success State */}
        {pairSuccess ? (
          <div className="rounded-2xl border border-green-500/30 bg-[#131B18] p-8 text-center flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20 text-green-400">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {recoveryMode ? "Recovered Successfully!" : "Paired Successfully!"}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {recoveryMode
                  ? "Credential restored. Restoring chat history..."
                  : "Connected to your laptop. Opening share room..."}
              </p>
            </div>
            <RefreshCw className="animate-spin text-green-400 mt-2" size={20} />
          </div>
        ) : isPairing ? (
          /* Pairing In Progress State */
          <div className="rounded-2xl border border-gray-800 bg-[#151821] p-8 text-center flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
              <Smartphone size={36} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Pairing with Laptop...</h2>
              <p className="mt-1 text-sm text-gray-400">
                Establishing secure device link and registering keys.
              </p>
            </div>
            <RefreshCw className="animate-spin text-blue-400 mt-2" size={24} />
          </div>
        ) : (
          /* Normal Scanner State */
          <div className="rounded-2xl border border-gray-800 bg-[#151821] p-5 sm:p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">
                {recoveryMode
                  ? "Recover this phone"
                  : scanMode
                    ? "Pair with another laptop"
                    : "Connect your phone"}
              </h1>
              <p className="mt-1 text-xs text-gray-400">
                {recoveryMode
                  ? "Scan the recovery QR code displayed on your laptop."
                  : "Scan the QR code displayed on your laptop screen."}
              </p>
              {localStorage.getItem("credential") && (
                <p className="mt-2 text-[10px] text-green-400/80 bg-green-500/10 border border-green-500/15 rounded-lg px-3 py-1 inline-block">
                  Your chat history will be preserved
                </p>
              )}
            </div>

            {/* Device Name Customization */}
            <div className="mb-5 bg-[#0F141C] border border-gray-800 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-gray-400" />
                <span className="text-gray-400">Device name:</span>
                {isEditingName ? (
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    autoFocus
                    maxLength={40}
                    className="bg-gray-800 text-white rounded px-2 py-0.5 border border-gray-700 outline-none text-xs"
                  />
                ) : (
                  <span className="font-semibold text-white">{deviceName}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingName(!isEditingName)}
                className="text-gray-400 hover:text-white p-1"
                title="Edit device name"
              >
                <Edit2 size={13} />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{errorMessage}</p>
                  <p className="mt-1 text-gray-400">
                    Make sure both your laptop and phone are on the same Wi-Fi network.
                  </p>
                </div>
              </div>
            )}

            {/* QR Scanner Component */}
            <QRScanner
              onScan={(token) => {
                void executePairing(token);
              }}
              onError={(msg) => console.error(msg)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
