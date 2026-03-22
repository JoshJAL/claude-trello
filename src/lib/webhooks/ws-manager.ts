/**
 * In-memory WebSocket connection manager.
 * Maps userId → set of connected WebSocket-like senders.
 * Used by the webhook processor to push events to connected clients.
 */

export interface WsClient {
  send(data: string): void;
  close(): void;
}

export interface WsMessage {
  type: "webhook_event" | "session_status" | "cost_alert";
  data: Record<string, unknown>;
}

// userId → set of connected clients
const connections = new Map<string, Set<WsClient>>();

/**
 * Register a WebSocket client for a user.
 */
export function addClient(userId: string, client: WsClient): void {
  let clients = connections.get(userId);
  if (!clients) {
    clients = new Set();
    connections.set(userId, clients);
  }
  clients.add(client);
}

/**
 * Remove a WebSocket client for a user.
 */
export function removeClient(userId: string, client: WsClient): void {
  const clients = connections.get(userId);
  if (clients) {
    clients.delete(client);
    if (clients.size === 0) {
      connections.delete(userId);
    }
  }
}

/**
 * Broadcast a message to all WebSocket clients for a user.
 */
export function broadcast(userId: string, message: WsMessage): void {
  const clients = connections.get(userId);
  if (!clients || clients.size === 0) return;

  const data = JSON.stringify(message);
  for (const client of clients) {
    try {
      client.send(data);
    } catch {
      // Client disconnected — will be cleaned up on close
    }
  }
}

/**
 * Get count of connected clients for a user (for diagnostics).
 */
export function getClientCount(userId: string): number {
  return connections.get(userId)?.size ?? 0;
}

/**
 * Get total number of connected clients across all users.
 */
export function getTotalClientCount(): number {
  let total = 0;
  for (const clients of connections.values()) {
    total += clients.size;
  }
  return total;
}
