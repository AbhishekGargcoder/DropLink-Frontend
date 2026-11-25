import api from "./api";
import axios from "axios";

export interface PairedDevice {
  id: string;
  deviceName: string;
  deviceType: "MOBILE" | "DESKTOP";
  platform: "ANDROID" | "IOS" | "WINDOWS" | "MACOS" | "LINUX" | "UNKNOWN";
  lastSeenAt?: string;
  createdAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  count?: number;
  message?: string;
  data: T;
}

export type PlatformType = "ANDROID" | "IOS" | "WINDOWS" | "MACOS" | "LINUX" | "UNKNOWN";

export const detectPlatform = (): PlatformType => {
  if (typeof navigator === "undefined") return "UNKNOWN";
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "ANDROID";
  if (/iphone|ipad|ipod/.test(ua)) return "IOS";
  if (/win/.test(ua)) return "WINDOWS";
  if (/mac/.test(ua)) return "MACOS";
  if (/linux/.test(ua)) return "LINUX";
  return "UNKNOWN";
};

export const getDefaultDeviceName = (type: "DESKTOP" | "MOBILE" = "DESKTOP"): string => {
  const platform = detectPlatform();
  if (type === "MOBILE") {
    if (platform === "IOS") return "iPhone";
    if (platform === "ANDROID") return "Android Phone";
    return "Mobile Device";
  }
  if (platform === "WINDOWS") return "Windows PC";
  if (platform === "MACOS") return "Mac";
  if (platform === "LINUX") return "Linux PC";
  return "Desktop Device";
};

export const registerDesktopDevice = async (
  deviceName = getDefaultDeviceName("DESKTOP"),
  platform: PlatformType = detectPlatform()
): Promise<{ device: PairedDevice; credential: string }> => {
  const response = await api.post<ApiResponse<{ device: PairedDevice; credential: string }>>(
    "/api/devices/register",
    {
      deviceName,
      platform,
    }
  );
  return response.data.data;
};

export const getPairedDevices = async (): Promise<PairedDevice[]> => {
  const response = await api.get<ApiResponse<PairedDevice[]>>("/api/devices");
  return response.data.data;
};

export const unpairDevice = async (deviceId: string): Promise<void> => {
  await api.delete(`/api/devices/${deviceId}`);
};

export const getCurrentDevice = async (): Promise<PairedDevice> => {
  const response = await api.get<ApiResponse<PairedDevice>>("/api/devices/me");
  return response.data.data;
};

export const renameCurrentDevice = async (
  deviceName: string
): Promise<PairedDevice> => {
  const response = await api.patch<ApiResponse<PairedDevice>>(
    "/api/devices/me",
    { deviceName }
  );
  return response.data.data;
};

export const ensureDeviceRegistered = async (): Promise<{ device: PairedDevice; credential: string }> => {
  const existingCredential = localStorage.getItem("credential");
  if (existingCredential) {
    try {
      const device = await getCurrentDevice();
      localStorage.setItem("currentDevice", JSON.stringify(device));
      return { device, credential: existingCredential };
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem("credential");
        localStorage.removeItem("currentDevice");
      } else {
        throw err;
      }
    }
  }
  const result = await registerDesktopDevice();
  localStorage.setItem("credential", result.credential);
  localStorage.setItem("currentDevice", JSON.stringify(result.device));
  return result;
};