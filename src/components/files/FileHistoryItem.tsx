import { ArrowDownToLine, File, Image, Send } from "lucide-react";
import type { SharedFileRecord } from "../types/file";

interface FileHistoryItemProps {
  item: SharedFileRecord;
  onDownload: (fileId: string) => void;
  downloading?: boolean;
}

const formatSize = (value: number | string): string => {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FileHistoryItem({
  item,
  onDownload,
  downloading = false,
}: FileHistoryItemProps) {
  const isImage = item.mimeType.startsWith("image/");

  return (
    <article className="flex items-center gap-3 rounded-xl border border-gray-800 bg-[#151821] p-3">
      <div className="rounded-lg bg-gray-800 p-2 text-blue-400">
        {isImage ? <Image size={20} /> : <File size={20} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {item.fileName}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          {item.isOutgoing ? (
            <span className="inline-flex items-center gap-1">
              <Send size={12} /> Sent to {item.otherDeviceName}
            </span>
          ) : (
            <span>From {item.otherDeviceName}</span>
          )}
          {" · "}
          {formatSize(item.size)}
          {" · "}
          {new Date(item.createdAt).toLocaleString()}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDownload(item.id)}
        disabled={downloading}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowDownToLine size={14} />
        {downloading ? "Downloading..." : "Download"}
      </button>
    </article>
  );
}