export type FileTransferStatus = "queued" | "uploading" | "sent" | "failed";

export interface SharedFileRecord {
  id: string;
  fileName: string;
  mimeType: string;
  size: number | string;
  createdAt: string;
  otherDeviceName: string;
  isOutgoing: boolean;
}