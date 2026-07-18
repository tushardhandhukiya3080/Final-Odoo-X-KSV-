import { io, type Socket } from "socket.io-client";
import { useAuth } from "../store/auth";

let socket: Socket | null = null;

export function getSocket(): Socket {
  const token = useAuth.getState().accessToken;
  if (!socket) {
    socket = io("/", {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });
  } else {
    // keep auth token fresh
    socket.auth = { token };
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
