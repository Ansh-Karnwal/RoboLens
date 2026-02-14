import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { ClientWSMessage } from '../types';

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private onMessage: ((msg: ClientWSMessage) => void) | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[WS] Client connected (${this.clients.size} total)`);

      ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as ClientWSMessage;
          if (this.onMessage) {
            this.onMessage(msg);
          }
        } catch (err) {
          console.error('[WS] Invalid message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected (${this.clients.size} total)`);
      });

      ws.on('error', (err) => {
        console.error('[WS] Error:', err.message);
        this.clients.delete(ws);
      });
    });
  }

  setMessageHandler(handler: (msg: ClientWSMessage) => void): void {
    this.onMessage = handler;
  }

  broadcast(type: string, data: Record<string, unknown>): void {
    const message = JSON.stringify({ type, data });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
