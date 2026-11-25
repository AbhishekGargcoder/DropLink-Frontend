import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";

interface QRCodeDisplayProps {
  value: string;
}

export default function QRCodeDisplay({ value }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-inner text-gray-900">
      <div className="p-2 bg-white rounded-xl">
        <QRCodeSVG
          value={value}
          size={210}
          level="M"
          marginSize={2}
        />
      </div>

      <div className="flex flex-col items-center gap-2 w-full text-center">
        <p className="text-xs font-semibold text-gray-700">
          Scan with your phone camera or DropLink app
        </p>

        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-600" />
              <span>Link copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy pairing link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
