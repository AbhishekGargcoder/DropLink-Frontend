import api from "./api";
import type { PairedDevice } from "./device.service";
export type { PairedDevice };

export type PairingStatus = "PENDING" | "COMPLETED" | "EXPIRED";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface PairingSession {
  sessionId: string;
  qrtoken: string;
  expiresAt: string;
}

interface PairingStatusData {
  sessionId: string;
  status: PairingStatus;
  pairedDevice: PairedDevice | null;
}

export const createPairingSession = async (): Promise<PairingSession> => {
  const res = await api.post<ApiResponse<PairingSession>>("/api/pairing/create");
  return res.data.data;
};

export const getPairingStatus = async (sessionId: string): Promise<PairingStatusData> => {
  const response = await api.get<ApiResponse<PairingStatusData>>(
    `/api/pairing/status/${sessionId}`
  );
  return response.data.data;
};

export const getPairingUrl = (token: string): string => {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}/pair?token=${encodeURIComponent(token)}`;
  }
  return token;
};

// ######## MOBILE APP SIDE ########
export type MobilePlatform = "ANDROID" | "IOS" | "UNKNOWN";

export interface ConfirmPairingInput {
  qrToken: string;
  deviceName: string;
  platform: MobilePlatform;
  existingCredential?: string; // Pass when re-pairing an existing device
}

export interface ConfirmPairingResponse {
  device: PairedDevice;
  credential: string;
}

export const confirmPairing = async (
  data: ConfirmPairingInput
): Promise<ConfirmPairingResponse> => {
  const response = await api.post<ApiResponse<ConfirmPairingResponse>>(
    "/api/pairing/confirm",
    data
  );
  return response.data.data;
};
