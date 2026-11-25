import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Send,
  Copy,
  Check,
  ExternalLink,
  Link as LinkIcon,
  FileText,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Layers,
} from "lucide-react";
import { useSocket } from "../context/SocketContext";
import {
  shareContent,
  getSharedItems,
  markShareRead,
  type SharedItem,
  type ShareType,
} from "../../services/share.service";
import type { PairedDevice } from "../../services/device.service";
import FileSharePanel from "../files/FileSharePanel";

interface ShareSectionProps {
  targetDevices: PairedDevice[];
  currentDeviceId?: string;
}
// targetDevices = all phones
//  curretnDeviceId = current laptop id
export default function ShareSection({ targetDevices, currentDeviceId: propCurrentDeviceId }: ShareSectionProps) {
  // extract current socket, connection status, and current device from context
  const { socket, isConnected, currentDevice } = useSocket(); 

  const myDeviceId = propCurrentDeviceId || currentDevice?.id;

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [filterDeviceId, setFilterDeviceId] = useState<string>("ALL");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [shares, setShares] = useState<SharedItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-select first target device if not set or invalid
  useEffect(() => {
    if (targetDevices.length > 0 && (!selectedDeviceId || !targetDevices.some((d) => d.id === selectedDeviceId))) {
      setSelectedDeviceId(targetDevices[0].id);
    }
  }, [targetDevices, selectedDeviceId]);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const items = await getSharedItems();
      setShares(items);
    } catch {
      // Ignore initial history failure if offline
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Listen for real-time incoming shares
  useEffect(() => {
    if (!socket) return;

    const handleNewShare = (item: {
      id: string;
      content: string;
      type: ShareType;
      senderDeviceId: string;
      receiverDeviceId?: string;
      createdAt: string;
      senderDevice?: { id: string; deviceName: string; deviceType: "MOBILE" | "DESKTOP" };
      receiverDevice?: { id: string; deviceName: string; deviceType: "MOBILE" | "DESKTOP" };
    }) => {
      const sender = item.senderDevice || targetDevices.find((d) => d.id === item.senderDeviceId);
      const receiver = item.receiverDevice || (currentDevice
        ? { id: currentDevice.id, deviceName: currentDevice.deviceName, deviceType: currentDevice.deviceType }
        : undefined);

      const newItem: SharedItem = {
        id: item.id,
        content: item.content,
        type: item.type,
        senderDeviceId: item.senderDeviceId,
        receiverDeviceId: item.receiverDeviceId || myDeviceId || "",
        createdAt: item.createdAt,
        readAt: null,
        senderDevice: sender
          ? { id: sender.id, deviceName: sender.deviceName, deviceType: sender.deviceType }
          : undefined,
        receiverDevice: receiver
          ? { id: receiver.id, deviceName: receiver.deviceName, deviceType: receiver.deviceType }
          : undefined,
      };

      setShares((prev) => [newItem, ...prev.filter((p) => p.id !== item.id)]);

      // Mark as read in backend
      void markShareRead(item.id).catch(() => {});
    };

    socket.on("share:new", handleNewShare);

    return () => {
      socket.off("share:new", handleNewShare);
    };
  }, [socket, targetDevices, myDeviceId, currentDevice]);

  const detectType = (text: string): ShareType => {
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        new URL(trimmed);
        return "LINK";
      } catch {
        return "TEXT";
      }
    }
    return "TEXT";
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || !selectedDeviceId) return;

    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    const shareType = detectType(content);
    const targetDev = targetDevices.find((d) => d.id === selectedDeviceId);

    try {
      const created = await shareContent({
        receiverDeviceId: selectedDeviceId,
        content: content.trim(),
        type: shareType,
      });

      // Ensure created item has populated sender/receiver devices for immediate display
      const populatedItem: SharedItem = {
        ...created,
        senderDeviceId: created.senderDeviceId || myDeviceId || "",
        receiverDeviceId: selectedDeviceId,
        senderDevice: created.senderDevice || (currentDevice
          ? { id: currentDevice.id, deviceName: currentDevice.deviceName, deviceType: currentDevice.deviceType }
          : undefined),
        receiverDevice: created.receiverDevice || (targetDev
          ? { id: targetDev.id, deviceName: targetDev.deviceName, deviceType: targetDev.deviceType }
          : undefined),
      };

      setShares((prev) => [populatedItem, ...prev.filter((p) => p.id !== created.id)]);
      setContent("");
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 2000);
    } catch (err: any) {
      setSendError(err?.response?.data?.message || "Failed to send content. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setContent(text);
    } catch {
      // Clipboard read permission might be denied
    }
  };

  // Filter messages by selected target device if requested
  const filteredShares = useMemo(() => {
    if (filterDeviceId === "ALL" || targetDevices.length <= 1) {
      return shares;
    }
    return shares.filter(
      (s) => s.senderDeviceId === filterDeviceId || s.receiverDeviceId === filterDeviceId
    );
  }, [shares, filterDeviceId, targetDevices.length]);

  if (targetDevices.length === 0) {
    return null;
  }

  const selectedDevice = targetDevices.find((d) => d.id === selectedDeviceId);

  return (
    <div className="space-y-6">
      {/* Send Card */}
      <div className="rounded-2xl border border-gray-800 bg-[#151821] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Share Text or Link</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Send instantly to your connected device
            </p>
          </div>

          {/* Target Device Selector */}
          {targetDevices.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Send to:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  setFilterDeviceId(e.target.value);
                }}
                className="bg-[#0B0D12] border border-gray-700 text-xs text-white rounded-xl px-3 py-1.5 outline-none focus:border-blue-500 font-medium"
              >
                {targetDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.deviceName} ({d.platform})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-[#0B0D12] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300">
              <span className="text-gray-500">To:</span>
              <span className="font-semibold text-white">{selectedDevice?.deviceName}</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="space-y-3">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a message, paste a URL, or drop notes here..."
              rows={3}
              maxLength={10000}
              className="w-full bg-[#0B0D12] border border-gray-800 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/80 transition resize-none font-sans"
            />

            <button
              type="button"
              onClick={handlePasteClipboard}
              className="absolute right-3 bottom-3 text-xs bg-gray-800/80 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded-md transition"
            >
              Paste
            </button>
          </div>

          {sendError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
              {sendError}
            </p>
          )}
    {/* file upload */}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {content.trim() && (
                <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-0.5 rounded text-gray-300">
                  {detectType(content) === "LINK" ? <LinkIcon size={12} /> : <FileText size={12} />}
                  {detectType(content)}
                </span>
              )}
              <span>{content.length}/10000</span>
            </div>

            <button
              type="submit"
              disabled={!content.trim() || !selectedDeviceId || isSending || !isConnected}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-600/20 text-white"
            >
              {isSending ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : sendSuccess ? (
                <>
                  <Check size={15} className="text-green-300" />
                  <span>Sent!</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>


      <FileSharePanel
      targetDevices={targetDevices}
      currentDeviceId={myDeviceId}
    />

      {/* History Feed */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-300">Recent Activity</h3>
            {filteredShares.length > 0 && (
              <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                {filteredShares.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Multi-device Conversation Filters */}
            {targetDevices.length > 1 && (
              <div className="flex items-center gap-1 bg-[#151821] border border-gray-800 p-0.5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setFilterDeviceId("ALL")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition text-[11px] font-medium ${
                    filterDeviceId === "ALL"
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Layers size={12} /> All
                </button>
                {targetDevices.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setFilterDeviceId(d.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition text-[11px] font-medium truncate max-w-[120px] ${
                      filterDeviceId === d.id
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Smartphone size={12} /> {d.deviceName}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => void loadHistory()}
              disabled={isLoadingHistory}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 p-1.5 rounded-lg hover:bg-gray-800 transition"
              title="Refresh messages"
            >
              <RefreshCw size={13} className={isLoadingHistory ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {filteredShares.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-800 p-8 text-center bg-[#151821]/40">
            <FileText className="mx-auto mb-2 text-gray-600" size={28} />
            <p className="text-sm font-medium text-gray-400">No shared content yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Sent text and links will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredShares.map((item) => {
              // Exact outgoing determination:
              // 1. If myDeviceId is known: item.senderDeviceId === myDeviceId
              // 2. Otherwise: if receiverDeviceId is in targetDevices, it was sent from here to a target device
              const isOutgoing = myDeviceId
                ? item.senderDeviceId === myDeviceId
                : targetDevices.some((d) => d.id === item.receiverDeviceId);

              const otherDevice = isOutgoing
                ? (item.receiverDevice || targetDevices.find((d) => d.id === item.receiverDeviceId))
                : (item.senderDevice || targetDevices.find((d) => d.id === item.senderDeviceId));

              const otherDeviceName = otherDevice?.deviceName || "Paired Device";
              const isUrl = item.type === "LINK";

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition ${
                    isOutgoing
                      ? "border-gray-800 bg-[#13161F]"
                      : "border-blue-900/40 bg-[#131A29]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {isOutgoing ? (
                        <span className="flex items-center gap-1 text-gray-400">
                          <ArrowUpRight size={14} className="text-gray-400" />
                          <span>Sent to</span>
                          <span className="text-gray-200 font-semibold">
                            {otherDeviceName}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-400">
                          <ArrowDownLeft size={14} className="text-blue-400" />
                          <span>Received from</span>
                          <span className="text-blue-200 font-semibold">
                            {otherDeviceName}
                          </span>
                        </span>
                      )}

                      <span className="text-gray-600">•</span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isUrl && (
                        <a
                          href={item.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition"
                          title="Open link in new tab"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}

                      <button
                        onClick={() => handleCopy(item.id, item.content)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                        title="Copy to clipboard"
                      >
                        {copiedId === item.id ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  {isUrl ? (
                    <a
                      href={item.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-400 hover:underline break-all block"
                    >
                      {item.content}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-200 whitespace-pre-wrap break-words font-sans select-text">
                      {item.content}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
