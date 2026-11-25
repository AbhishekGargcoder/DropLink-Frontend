import api from "./api";

export type ShareType = "TEXT" | "LINK";

export interface DeviceInfo {
  id: string;
  deviceName: string;
  deviceType: "MOBILE" | "DESKTOP";
}

export interface SharedItem {
  id: string;
  content: string;
  type: ShareType;
  senderDeviceId: string;
  receiverDeviceId: string;
  createdAt: string;
  readAt: string | null;
  senderDevice?: DeviceInfo;
  receiverDevice?: DeviceInfo;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

export interface CreateShareInput {
  receiverDeviceId: string;
  content: string;
  type: ShareType;
}

export const shareContent = async (input: CreateShareInput): Promise<SharedItem> => {
  const response = await api.post<ApiResponse<SharedItem>>("/api/shares/text", input);
  return response.data.data;
};

export const getSharedItems = async (): Promise<SharedItem[]> => {
  const response = await api.get<ApiResponse<SharedItem[]>>("/api/shares");
  return response.data.data;
};
 
export const markShareRead = async (shareId: string): Promise<void> => {
  await api.patch(`/api/shares/${shareId}/read`);
};