import { io, Socket } from "socket.io-client";

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:3000`;
  }
  return "http://localhost:3000";
};

export const SOCKET_URL = getSocketUrl();

export const createDeviceSoket = (credential: string): Socket => {
  const socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: {
      credential: credential.trim(),
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  return socket;
};
