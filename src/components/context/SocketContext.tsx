import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { getCurrentDevice, type PairedDevice } from "../../services/device.service"
import { SOCKET_URL } from "../../socket/socket";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  credential: string | null;
  currentDevice: PairedDevice | null;
  setCredential: (credential: string) => void;
  clearCredential: () => void;
  refreshCurrentDevice: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [credential, setCredentialState] = useState<string | null>(
    () => localStorage.getItem("credential")
  );
  const [currentDevice, setCurrentDevice] = useState<PairedDevice | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const setCredential = useCallback((value: string) => {
    localStorage.setItem("credential", value);
    setCredentialState(value);
  }, []);

  const clearCredential = useCallback(() => {
    localStorage.removeItem("credential");
    setCredentialState(null);
    setCurrentDevice(null);
  }, []);

  const refreshCurrentDevice = useCallback(async () => {
    const cred = localStorage.getItem("credential");
    if (!cred) {
      setCurrentDevice(null);
      return;
    }
    try {
      const device = await getCurrentDevice();
      setCurrentDevice(device);
    } catch {
      // If unauthorized or network error
    }
  }, []);

  useEffect(() => {
    if (credential) {
      void refreshCurrentDevice();
    } else {
      setCurrentDevice(null);
    }
  }, [credential, refreshCurrentDevice]);

  useEffect(() => {
    if (!credential || !SOCKET_URL) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const newSocket = io(SOCKET_URL, {
      autoConnect: true,
      auth: { credential },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    const handleConnect = () => {
      console.log("Socket connected:", newSocket.id);
      setIsConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
    };

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection failed:", error.message);
      setIsConnected(false);
    });

    return () => {
      newSocket.off("connect", handleConnect);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.disconnect();
      setIsConnected(false);
    };
  }, [credential]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        credential,
        currentDevice,
        setCredential,
        clearCredential,
        refreshCurrentDevice,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider");
  }
  return context;
}  