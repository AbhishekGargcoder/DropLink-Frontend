import { useEffect, useState } from "react";
import QRCodeDisplay from "./QRCodeDisplay";
import { Smartphone, RefreshCw, X, Clock, CheckCircle2 } from "lucide-react";
import type { PairingStatus } from "../../services/pairing.service";

interface PairDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  qrValue: string | null;
  isGenerating: boolean;
  error: string | null;
  status?: PairingStatus | null;
  expiresAt?: string | null;
}

export default function  PairDeviceModal({
  isOpen,
  onClose,
  onGenerate,
  qrValue,
  isGenerating,
  error,
  status,
  expiresAt,
}: PairDeviceModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt || status !== "PENDING") {
      setSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  if (!isOpen) return null;

  const isExpired = status === "EXPIRED" || (secondsRemaining !== null && secondsRemaining <= 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#111827] p-6 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Pair a new device</h2>
            <p className="mt-1 text-xs text-gray-400">
              Connect your phone to share files and text
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition"
            aria-label="Close pairing dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-[320px] flex-col items-center justify-center gap-5">
          {qrValue && !isExpired ? (
            <>
              <QRCodeDisplay value={qrValue} />

              <div className="flex items-center justify-between w-full px-2 text-xs text-gray-400">
                <div className="flex items-center gap-1.5 text-blue-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  <span>Waiting for scan...</span>
                </div>

                {secondsRemaining !== null && (
                  <div className="flex items-center gap-1 text-gray-400 font-mono">
                    <Clock size={13} />
                    <span>
                      {Math.floor(secondsRemaining / 60)}:
                      {String(secondsRemaining % 60).padStart(2, "0")}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : isExpired ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                <Clock size={32} />
              </div>
              <h3 className="font-semibold text-gray-200">Pairing Code Expired</h3>
              <p className="text-xs text-gray-400 max-w-xs">
                QR codes expire after 2 minutes for security. Generate a new code to pair.
              </p>
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="mt-2 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500 transition"
              >
                <RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />
                Generate New Code
              </button>
            </div>
          ) : status === "COMPLETED" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="font-semibold text-gray-200">Pairing Successful!</h3>
              <p className="text-xs text-gray-400">
                Your device has been connected to DropLink.
              </p>
            </div>
          ) : (
            <>
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gray-800/80 border border-gray-700/60 shadow-inner">
                <Smartphone className="text-blue-400" size={42} />
              </div>

              <div className="text-center max-w-xs">
                <h3 className="font-medium text-gray-200 text-sm">Scan QR Code</h3>
                <p className="mt-1 text-xs text-gray-400">
                  Generate a temporary secure QR code to pair your smartphone with this laptop.
                </p>
              </div>

              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-blue-600/20"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Generating QR code...</span>
                  </>
                ) : (
                  <span>Generate QR code</span>
                )}
              </button>
            </>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 w-full text-center">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
