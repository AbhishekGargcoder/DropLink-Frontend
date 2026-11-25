import api from "./api";
import type { PairedDevice } from "./device.service";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface RecoverySession {
  sessionId: string;
  qrToken: string;
  expiresAt: string;
}

export interface RecoveryResponse {
  device: PairedDevice;
  credential: string;
}

export const createRecoverySession = async (
  laptopDeviceId: string,
  phoneDeviceId: string
): Promise<RecoverySession> => {
  // laptop creates recovery session therefore laptopId shoould be there in api
  const response = await api.post<ApiResponse<RecoverySession>>(
    `/api/devices/${laptopDeviceId}/recovery/create`,
    { targetDeviceId: phoneDeviceId }
  );
  return response.data.data;
};

export const confirmRecoverySession = async (
  qrToken: string
): Promise<RecoveryResponse> => {
  const response = await api.post<ApiResponse<RecoveryResponse>>(
    "/api/devices/recovery/confirm",
    { qrToken }
  );
  return response.data.data;
};

export const getRecoveryUrl = (token: string): string => {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}/pair?mode=recovery&token=${encodeURIComponent(token)}`;
  }
  return token;
};
