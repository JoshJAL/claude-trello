import { createContext, useContext } from "react";
import { useWebSocket } from "./useWebSocket";
import type { ConnectionStatus } from "./useWebSocket";
import { useSession } from "#/lib/auth-client";

interface RealtimeContextValue {
  status: ConnectionStatus;
  /** True when WebSocket is connected — use to disable polling */
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: "disconnected",
  isConnected: false,
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  // Only connect when user is authenticated
  const { status } = useWebSocket(isLoggedIn);

  return (
    <RealtimeContext.Provider
      value={{ status, isConnected: status === "connected" }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
