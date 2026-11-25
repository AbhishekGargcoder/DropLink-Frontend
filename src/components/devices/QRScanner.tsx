import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, AlertCircle, RefreshCw, KeyRound, ArrowRight } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (message: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [manualToken, setManualToken] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const hasScannedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  onScanRef.current = onScan;
  onErrorRef.current = onError;

  const startScanner = async () => {
    setScannerError(null);
    setIsInitializing(true);
    hasScannedRef.current = false;

    // Small delay to ensure DOM element is mounted
    await new Promise((r) => setTimeout(r, 100));

    const element = document.getElementById("qr-reader-container");
    if (!element) {
      setIsInitializing(false);
      return;
    }

    try {
      if (scannerRef.current && isScanningRef.current) {
        await scannerRef.current.stop();
        isScanningRef.current = false;
      }

      const html5QrCode = new Html5Qrcode("qr-reader-container");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          // Stop scanning immediately on successful read
          if (isScanningRef.current && scannerRef.current) {
            isScanningRef.current = false;
            scannerRef.current
              .stop()
              .then(() => {
                scannerRef.current?.clear();
              })
              .catch((err) => console.warn("Error stopping scanner after scan:", err))
              .finally(() => {
                onScanRef.current(decodedText);
              });
          } else {
            onScanRef.current(decodedText);
          }
        },
        () => {
          // Continuous frame scan miss - normal operation
        }
      );

      isScanningRef.current = true;
      setIsInitializing(false);
    } catch (err: any) {
      console.error("Failed to start QR scanner:", err);
      isScanningRef.current = false;
      setIsInitializing(false);

      let msg = "Could not start camera.";
      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
        msg = "Camera permission denied. Please grant camera access to scan QR codes.";
      } else if (err?.name === "NotFoundError" || err?.message?.includes("NotFound")) {
        msg = "No camera found on this device.";
      } else {
        msg = err?.message || "Failed to access camera.";
      }

      setScannerError(msg);
      onErrorRef.current?.(msg);
    }
  };

  useEffect(() => {
    void startScanner();

    return () => {
      if (scannerRef.current && isScanningRef.current) {
        isScanningRef.current = false;
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch((err) => console.warn("Error stopping scanner on unmount:", err));
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    onScan(manualToken.trim());
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Scanner Viewport */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black border border-gray-800 shadow-2xl flex items-center justify-center">
        {/* Camera Feed Container */}
        <div id="qr-reader-container" className="w-full h-full object-cover" />

        {/* Viewfinder Overlay */}
        {!scannerError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Darkened mask */}
            <div className="relative w-64 h-64 border-2 border-blue-500/80 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />

              {/* Animated Scan Beam */}
              {!isInitializing && (
                <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse shadow-[0_0_8px_#60a5fa]" />
              )}
            </div>
          </div>
        )}

        {/* Initializing State */}
        {isInitializing && (
          <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center">
            <RefreshCw className="animate-spin text-blue-400" size={32} />
            <p className="text-sm font-medium text-gray-300">Starting camera...</p>
          </div>
        )}

        {/* Error Fallback */}
        {scannerError && (
          <div className="absolute inset-0 bg-[#0F141C] p-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertCircle size={28} />
            </div>
            <div>
              <p className="font-semibold text-gray-200 text-sm">{scannerError}</p>
              <p className="text-xs text-gray-400 mt-1">
                You can retry camera access or enter the pairing code manually below.
              </p>
            </div>
            <button
              onClick={() => void startScanner()}
              className="flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 px-4 py-2 text-xs font-medium text-gray-200 transition"
            >
              <RefreshCw size={14} /> Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
        <Camera size={16} className="text-blue-400" />
        <span>Align the QR code within the frame</span>
      </div>

      {/* Manual Input Toggle / Form */}
      <div className="w-full mt-6">
        {!showManualInput ? (
          <button
            type="button"
            onClick={() => setShowManualInput(true)}
            className="w-full py-2.5 text-xs font-medium text-gray-400 hover:text-white flex items-center justify-center gap-2 border border-dashed border-gray-800 rounded-xl transition hover:border-gray-700"
          >
            <KeyRound size={14} />
            Enter pairing token or URL manually
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-3 bg-[#131722] p-4 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-300">Manual Pairing</span>
              <button
                type="button"
                onClick={() => setShowManualInput(false)}
                className="text-gray-500 hover:text-gray-300"
              >
                Hide
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste token or pair URL..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="flex-1 bg-[#0B0D12] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!manualToken.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 transition"
              >
                Pair <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
