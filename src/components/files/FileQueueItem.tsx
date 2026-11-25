import { CheckCircle2, File, Image, RotateCcw, X } from "lucide-react";
import type { FileTransferStatus } from "../types/file";

interface FileQueueItemProps {
  file: File;
  status: FileTransferStatus;
  progress?: number;
  error?: string;
  onRemove?: () => void;
  onRetry?: () => void;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FileQueueItem({
  file,
  status,
  progress = 0,
  error,
  onRemove,
  onRetry,
}: FileQueueItemProps) {
  const isImage = file.type.startsWith("image/");
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="rounded-xl border border-gray-800 bg-[#151821] p-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-gray-800 p-2 text-blue-400">
          {isImage ? <Image size={20} /> : <File size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{file.name}</p>
          <p className="mt-0.5 text-xs text-gray-500">{formatSize(file.size)}</p>

          {status === "uploading" && (
            <div className="mt-2">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-gray-700"
                role="progressbar"
                aria-valuenow={clampedProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Uploading ${file.name}`}
              >
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-gray-400">
                {Math.round(clampedProgress)}%
              </p>
            </div>
          )}

          {status === "queued" && (
            <p className="mt-1 text-xs text-gray-400">Waiting to upload</p>
          )}

          {status === "sent" && (
            <p className="mt-1 flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 size={13} /> Sent
            </p>
          )}

          {status === "failed" && (
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-xs text-red-400">{error || "Upload failed"}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  <RotateCcw size={13} /> Retry
                </button>
              )}
            </div>
          )}
        </div>

        {onRemove && status !== "uploading" && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-white"
            aria-label={`Remove ${file.name}`}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}