"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "@/services/api";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Derive the backend origin from the (normalized) API base URL by
    // stripping the /api path — keeps socket + HTTP calls on the same host.
    const apiUrl = api.defaults.baseURL || "http://localhost:5000/api";
    const socketUrl = apiUrl.replace(/\/api\/?$/, "");

    const token =
      localStorage.getItem("adyapan-token") || sessionStorage.getItem("adyapan-token");

    const socketInstance = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
      transports: ["websocket", "polling"],
      auth: token ? { token } : undefined,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

