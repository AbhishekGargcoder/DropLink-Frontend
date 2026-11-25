import { useCallback, useEffect, useState } from "react";
import {
  getPairedDevices,
  unpairDevice,
  type PairedDevice,
} from "../services/device.service";

export const usePairedDevices = () => {
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDevices = useCallback(async () => {
    const credential = localStorage.getItem("credential");
    if (!credential) {
      setDevices([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await getPairedDevices();
      setDevices(result);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setDevices([]);
      } else {
        setError("Unable to load paired devices.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const addDevice = useCallback((device: PairedDevice) => {
    setDevices((current) => {
      if (current.some((item) => item.id === device.id)) {
        return current;
      }
      return [device, ...current];
    });
  }, []);
  const removeDevice = useCallback(async (deviceId: string) => {
    await unpairDevice(deviceId);
    setDevices((current) => current.filter((device) => device.id !== deviceId));
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  return {
    devices,
    loading,
    error,
    refreshDevices,
    addDevice,
    removeDevice,
  };
};
