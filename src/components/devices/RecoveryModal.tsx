import { useCallback, useEffect, useState } from "react";
import { Clock, RefreshCw, Smartphone, X } from "lucide-react";
import QRCodeDisplay from "./QRCodeDisplay";
import {
  createRecoverySession,
  getRecoveryUrl,
  type RecoverySession,
} from "../../services/recovery.service";

interface RecoveryModalProps {
  laptopDeviceId?: string;
  phone: { id: string; name: string } | null;
  onClose: () => void;
}

export default function RecoveryModal({
  laptopDeviceId,
  phone,
  onClose,
}: RecoveryModalProps) {
  const [session, setSession] = useState<RecoverySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const generateRecoveryQr = useCallback(async () => {
    if (!laptopDeviceId || !phone) return;

    setLoading(true);
    setError(null);
    setSession(null);

    try {
      const created = await createRecoverySession(laptopDeviceId, phone.id);
      setSession(created);
    } catch (err: unknown) {
      const response = (
        err as { response?: { data?: { message?: string } } }
      ).response;
      setError(response?.data?.message || "Unable to create a recovery code.");
    } finally {
      setLoading(false);
    }
  }, [laptopDeviceId, phone]);

  useEffect(() => {
    if (phone && laptopDeviceId) {
      const timer = window.setTimeout(() => {
        void generateRecoveryQr();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return;
  }, [phone, laptopDeviceId, generateRecoveryQr]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const updateTimer = () => {
      setSecondsRemaining(
        Math.max(
          0,
          Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000)
        )
      );
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [session]);

  if (!phone) return null;

  const expired = secondsRemaining !== null && secondsRemaining <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#111827] p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recover {phone.name}</h2>
            <p className="mt-1 text-xs text-gray-400">
              Restore this phone's secure credential and chat history
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Close recovery dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-[320px] flex-col items-center justify-center gap-5">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <RefreshCw className="animate-spin text-blue-400" size={28} />
              <span className="text-sm">Generating recovery QR code...</span>
            </div>
          ) : expired ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                <Clock size={32} />
              </div>
              <h3 className="font-semibold">Recovery Code Expired</h3>
              <button
                onClick={() => void generateRecoveryQr()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500"
              >
                <RefreshCw size={16} />
                Generate New Code
              </button>
            </div>
          ) : session ? (
            <>
              <QRCodeDisplay value={getRecoveryUrl(session.qrToken)} />
              {secondsRemaining !== null && (
                <div className="flex items-center gap-1 text-xs text-gray-400 font-mono">
                  <Clock size={13} />
                  <span>
                    {Math.floor(secondsRemaining / 60)}:
                    {String(secondsRemaining % 60).padStart(2, "0")}
                  </span>
                </div>
              )}
              <p className="text-center text-xs text-gray-400">
                Open DropLink on this phone and scan this recovery QR code.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800 text-blue-400">
                <Smartphone size={34} />
              </div>
              <p className="text-sm text-gray-300">No recovery code created yet.</p>
              <button
                onClick={() => void generateRecoveryQr()}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500"
              >
                Generate Recovery QR
              </button>
            </div>
          )}

          {error && (
            <p className="w-full rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-center text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
