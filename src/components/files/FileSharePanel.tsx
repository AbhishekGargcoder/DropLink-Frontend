import FileHistoryItem from "./FileHistoryItem";
import FileQueueItem from "./FileQueueItem";
import FilePicker from "./FilePicker";
import { useSocket } from "../context/SocketContext";
import {useState, useEffect, useCallback} from "react";
import {
  getSharedFiles,
  uploadSharedFile,
  downloadSharedFile,
} from "../../services/file.service";
import type { SharedFileRecord } from "../../services/file.service";
import type { PairedDevice } from "../../services/device.service";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface QueueItem {
  id: string;
  file: File;
  status: "queued" | "uploading" | "sent" | "failed";
  progress: number;
  error?: string;
}

interface FileSharePanelProps {
  targetDevices: PairedDevice[];
  currentDeviceId?: string;
}

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as { response?: { data?: { message?: string } } }
    ).response;
    if (response?.data?.message) return response.data.message;
  }
  return "File transfer failed. Please try again.";
};

const createQueueId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export default function FileSharePanel({
  targetDevices,
  currentDeviceId,
}: FileSharePanelProps) {
  const { socket } = useSocket();
  const [targetDeviceId, setTargetDeviceId] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<SharedFileRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      targetDevices.length > 0 &&
      !targetDevices.some((device) => device.id === targetDeviceId)
    ) {
      setTargetDeviceId(targetDevices[0].id);
    }
  }, [targetDevices, targetDeviceId]);

  const refreshHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const files = await getSharedFiles();
      setHistory(files);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  // A notification triggers a history refresh; the server remains the source of truth.
  useEffect(() => {
    if (!socket) return;

    socket.on("file:new", refreshHistory);
    return () => {
      socket.off("file:new", refreshHistory);
    };
  }, [socket, refreshHistory]);

  const handleFileSelection = (selected: File[]) => {
    const accepted: File[] = [];  
    const rejected: string[] = [];
    console.log("selected : ", selected);
    for (const file of selected) {
      const name = file.name.toLowerCase();
      const supported =
        file.type.startsWith("image/") ||
        file.type === "application/pdf" ||
        name.endsWith(".pdf") ||
        name.endsWith(".doc") ||
        name.endsWith(".docx");

      if (!supported) {
        rejected.push(`${file.name}: unsupported file type.`);
      } else if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}: exceeds the 50 MB limit.`);
      } else {
        accepted.push(file);
      }
    }

    setError(rejected.length ? rejected.join(" ") : null);
    setQueue((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: createQueueId(),
        file,
        status: "queued" as const,
        progress: 0,
      })),
    ]);

  };

  const uploadOne = async (item: QueueItem) => {
    if (!targetDeviceId) return;

    setError(null);
    setQueue((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, status: "uploading", progress: 0, error: undefined }
          : entry
      )
    );

    try {
      const uploaded = await uploadSharedFile(
        item.file,
        targetDeviceId,
        (progress) => {
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id ? { ...entry, progress } : entry
            )
          );
        }
      );

      setQueue((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, status: "sent", progress: 100 }
            : entry
        )
      );
      setHistory((current) => [
        uploaded,
        ...current.filter((entry) => entry.id !== uploaded.id),
      ]);
    } catch (uploadError) {
      setQueue((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "failed",
                error: getErrorMessage(uploadError),
              }
            : entry
        )
      );
    }
  };

  const uploadQueuedFiles = async () => {
    const pending = queue.filter(
      (item) => item.status === "queued" || item.status === "failed"
    );

    // Upload sequentially to avoid starting many large uploads at once.
    for (const item of pending) {
      await uploadOne(item);
    }
  };
const isUploading = queue.some((item) => item.status === "uploading");

const retryUpload = (id: string) => {
  const item = queue.find((entry) => entry.id === id);
  if (item) void uploadOne(item);
};
  const handleDownload = async (item: SharedFileRecord) => {
    try {
      setDownloadingId(item.id);
      const blob = await downloadSharedFile(item.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    } finally {
      setDownloadingId(null);
    }
  };

  const removeFromQueue = (id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  };

  if (targetDevices.length === 0) return null;

  return (
    <section className="space-y-5 rounded-2xl border border-gray-800 bg-[#151821] p-5">
      {targetDevices.length > 1 && (
        <label className="block text-xs text-gray-400">
          Send to
          <select
            value={targetDeviceId}
            onChange={(event) => setTargetDeviceId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0B0D12] px-3 py-2 text-sm text-white"
          >
            {targetDevices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.deviceName}
              </option>
            ))}
          </select>
        </label>
      )}  

      <FilePicker
        onFilesSelected={handleFileSelection}
        disabled={!targetDeviceId || isUploading}
      />

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </p>
      )}

      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item) => (
            <FileQueueItem
              key={item.id}
              file={item.file}
              status={item.status}
              progress={item.progress}
              error={item.error}
              onRemove={() => removeFromQueue(item.id)}
              onRetry={() => retryUpload(item.id)}
            />
          ))}

          {queue.some((item) => item.status === "queued" || item.status === "failed") && (
            <button
              type="button"
              onClick={() => void uploadQueuedFiles()}
              disabled={!targetDeviceId || isUploading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Upload files
            </button>
          )}
        </div>
      )}

      <div className="space-y-2 border-t border-gray-800 pt-4">
        <h3 className="text-sm font-medium text-gray-300">File history</h3>

        {loadingHistory ? (
          <p className="text-xs text-gray-400">Loading files...</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-gray-500">No files shared yet.</p>
        ) : (
          history.map((item) => {
            const isOutgoing = item.senderDeviceId === currentDeviceId;
            const otherDeviceName = isOutgoing
              ? item.receiverDevice?.deviceName ?? "paired device"
              : item.senderDevice?.deviceName ?? "paired device";

            return (
              <FileHistoryItem
                key={item.id}
                item={{
                  id: item.id,
                  fileName: item.fileName,
                  mimeType: item.mimeType,
                  size: item.size,
                  createdAt: item.createdAt,
                  isOutgoing,
                  otherDeviceName,
                }}
                onDownload={(fileId) => {
                  const file = history.find((entry) => entry.id === fileId);
                  if (file) void handleDownload(file);
                }}
                downloading={downloadingId === item.id}
              />
            );
          })
        )}
      </div>
    </section>
  );
}