// ─── WebSocket Real-Time Server ─────────────────────────────────────
// Manages WebSocket connections and broadcasts events to connected clients
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { verifyToken } from '../middleware/auth.js';
import db from '../database/index.js';

// ─── Types ──────────────────────────────────────────────────────────
export interface WSEvent {
  type: string;
  data: any;
  targetUserId?: string;       // Send to specific user
  targetUserIds?: string[];    // Send to multiple users
  excludeUserId?: string;      // Exclude a user (e.g., sender)
  adminOnly?: boolean;         // Only send to admin users
}

interface ClientInfo {
  ws: WebSocket;
  userId: string;
  isAdmin: boolean;
  connectedAt: number;
}

// ─── WebSocket Manager ──────────────────────────────────────────────
class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientInfo> = new Map(); // userId → ClientInfo
  private userIdToSockets: Map<string, Set<WebSocket>> = new Map(); // userId → Set of sockets
  // Track active livestreams: userId → { hostId, hostName, hostAvatar, startedAt }
  public activeStreams: Map<string, { hostId: string; hostName: string; hostAvatar: string; startedAt: number }> = new Map();

  /**
   * Initialize the WebSocket server, attached to an existing HTTP server
   */
  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      console.log('[WS] New connection attempt');

      // We'll authenticate after connection via a message
      // This avoids URL-based token leaking in logs
      let authenticated = false;
      let userId = '';
      let isAdmin = false;
      let authTimeout: ReturnType<typeof setTimeout>;

      // Timeout: close connection if not authenticated within 10 seconds
      authTimeout = setTimeout(() => {
        if (!authenticated) {
          console.log('[WS] Connection timed out - no auth');
          ws.close(4001, 'Authentication timeout');
        }
      }, 10000);

      ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());

          // Handle authentication
          if (msg.type === 'auth' && msg.token) {
            try {
              const payload = verifyToken(msg.token);
              if (!payload || !payload.userId) {
                ws.close(4003, 'Invalid token');
                return;
              }

              authenticated = true;
              userId = payload.userId;
              isAdmin = !!payload.isAdmin;
              clearTimeout(authTimeout);

              // Store client info
              this.clients.set(userId, {
                ws,
                userId,
                isAdmin,
                connectedAt: Date.now(),
              });

              // Track sockets per user (multiple tabs/devices)
              if (!this.userIdToSockets.has(userId)) {
                this.userIdToSockets.set(userId, new Set());
              }
              this.userIdToSockets.get(userId)!.add(ws);

              // Send confirmation
              this.sendToSocket(ws, { type: 'auth:success', data: { userId, isAdmin } });

              // Broadcast user online status
              this.broadcast({ type: 'presence:online', data: { userId } }, { excludeUserId: userId });

              console.log(`[WS] User ${userId} connected (admin: ${isAdmin})`);
            } catch (err) {
              console.error('[WS] Auth failed:', err);
              ws.close(4003, 'Authentication failed');
            }
            return;
          }

          // Handle presence heartbeat
          if (msg.type === 'presence:heartbeat' && authenticated) {
            // Update last_seen_at in database
            try {
              db.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").run(userId);
            } catch { /* ignore */ }
            this.sendToSocket(ws, { type: 'presence:ack', data: {} });
            return;
          }

          // Handle typing indicator
          if (msg.type === 'chat:typing' && authenticated) {
            const { receiverId } = msg.data || {};
            if (receiverId) {
              this.sendToUser(receiverId, {
                type: 'chat:typing',
                data: { senderId: userId },
              });
            }
            return;
          }

          // Handle chat read receipts
          if (msg.type === 'chat:read' && authenticated) {
            const { contactId } = msg.data || {};
            if (contactId) {
              this.sendToUser(contactId, {
                type: 'chat:read',
                data: { readerId: userId },
              });
            }
            return;
          }

          // Handle request for online users list
          if (msg.type === 'presence:get-online' && authenticated) {
            const onlineUsersList = Array.from(this.userIdToSockets.keys());
            this.sendToSocket(ws, { type: 'presence:online-list', data: { users: onlineUsersList } });
            return;
          }

          // Handle call signaling (WebRTC)
          if (msg.type === 'call:signal' && authenticated) {
            const { targetUserId, signal } = msg.data || {};
            if (targetUserId) {
              this.sendToUser(targetUserId, {
                type: 'call:signal',
                data: { signal, fromId: userId },
              });
            }
            return;
          }

          // ─── Livestream events ─────────────────────────────────────
          // Handle livestream start notification
          if (msg.type === 'livestream:start' && authenticated) {
            const { streamId, title, userName, userAvatar } = msg.data || {};
            // Get user info from DB if not provided
            let name = userName;
            let avatar = userAvatar;
            if (!name) {
              try {
                const user = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(userId) as any;
                name = user?.name || 'مستخدم';
                avatar = user?.avatar || '';
              } catch { name = 'مستخدم'; }
            }
            // Broadcast to all other users that a livestream started
            this.broadcast({
              type: 'livestream:started',
              data: { streamId: streamId || userId, hostId: userId, hostName: name, hostAvatar: avatar, title: title || '' },
            }, { excludeUserId: userId });

            // Track active stream
            this.activeStreams.set(userId, { hostId: userId, hostName: name || 'مستخدم', hostAvatar: avatar || '', startedAt: Date.now() });
            return;
          }

          // Handle livestream end notification
          if (msg.type === 'livestream:end' && authenticated) {
            const { streamId } = msg.data || {};
            this.broadcast({
              type: 'livestream:ended',
              data: { streamId: streamId || userId, hostId: userId },
            }, { excludeUserId: userId });

            // Remove from active streams
            this.activeStreams.delete(userId);
            return;
          }

          // Handle livestream chat message
          if (msg.type === 'livestream:chat' && authenticated) {
            const { streamId, text } = msg.data || {};
            if (!text || !text.trim()) return; // Skip empty messages
            // Get user info
            let name = '';
            let avatar = '';
            try {
              const user = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(userId) as any;
              name = user?.name || 'مستخدم';
              avatar = user?.avatar || '';
            } catch { name = 'مستخدم'; }
            // Broadcast chat to all viewers EXCEPT the sender (sender already adds locally)
            this.broadcast({
              type: 'livestream:chat',
              data: { streamId: streamId || userId, userId, userName: name, userAvatar: avatar, text: text.trim(), time: new Date().toISOString() },
            }, { excludeUserId: userId });
            return;
          }

          // Handle livestream viewer join/leave
          if (msg.type === 'livestream:join' && authenticated) {
            const { streamId } = msg.data || {};
            // Notify the stream host
            this.sendToUser(streamId, {
              type: 'livestream:viewer-joined',
              data: { streamId, viewerId: userId },
            });
            return;
          }

          if (msg.type === 'livestream:leave' && authenticated) {
            const { streamId } = msg.data || {};
            this.sendToUser(streamId, {
              type: 'livestream:viewer-left',
              data: { streamId, viewerId: userId },
            });
            return;
          }

          // Handle livestream WebRTC signaling (broadcaster ↔ viewers)
          if (msg.type === 'livestream:signal' && authenticated) {
            const { streamId, signal } = msg.data || {};
            if (!signal) return;

            // Determine the correct recipient based on signal type and direction
            // Key insight: streamId is always the broadcaster's userId
            // The broadcaster is the person whose userId === streamId
            const isBroadcaster = (streamId === userId) || (this.activeStreams.has(userId));

            if (signal?.targetViewer) {
              // Broadcaster → Specific viewer (offer or ICE candidate for a specific viewer)
              this.sendToUser(signal.targetViewer, {
                type: 'livestream:signal',
                data: { streamId: streamId || userId, fromId: userId, signal },
              });
            } else if (signal?.type === 'answer') {
              // Viewer → Broadcaster (answer to an offer)
              // streamId in this case is the broadcaster's userId
              this.sendToUser(streamId, {
                type: 'livestream:signal',
                data: { streamId, fromId: userId, signal },
              });
            } else if (signal?.candidate && !isBroadcaster) {
              // Viewer's ICE candidate (no targetViewer) → send to broadcaster only
              this.sendToUser(streamId, {
                type: 'livestream:signal',
                data: { streamId, fromId: userId, signal },
              });
            } else if (signal?.candidate && isBroadcaster) {
              // Broadcaster's ICE candidate without targetViewer - shouldn't happen
              // but broadcast as fallback to all except sender
              this.broadcast({
                type: 'livestream:signal',
                data: { streamId: streamId || userId, fromId: userId, signal },
              }, { excludeUserId: userId });
            }
            return;
          }

        } catch (err) {
          console.error('[WS] Message parse error:', err);
        }
      });

      ws.on('close', () => {
        clearTimeout(authTimeout);
        if (userId) {
          // Remove from sockets map
          const sockets = this.userIdToSockets.get(userId);
          if (sockets) {
            sockets.delete(ws);
            if (sockets.size === 0) {
              this.userIdToSockets.delete(userId);
              this.clients.delete(userId);
              // Broadcast user offline
              this.broadcast({ type: 'presence:offline', data: { userId } });
            }
          }
          console.log(`[WS] User ${userId} disconnected`);
        }
      });

      ws.on('error', (err) => {
        console.error(`[WS] Error for user ${userId}:`, err.message);
      });
    });

    console.log('[WS] WebSocket server initialized on /ws');
  }

  /**
   * Send a message to a specific WebSocket connection
   */
  private sendToSocket(ws: WebSocket, event: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  /**
   * Send an event to a specific user (all their connections)
   */
  sendToUser(userId: string, event: any) {
    const sockets = this.userIdToSockets.get(userId);
    if (sockets) {
      const data = JSON.stringify(event);
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      }
    }
  }

  /**
   * Broadcast an event to all connected clients, with optional filtering
   * Uses userIdToSockets to reach ALL connections per user (multiple tabs/devices)
   */
  broadcast(event: WSEvent, options?: { excludeUserId?: string }) {
    if (!this.wss) return;

    const data = JSON.stringify(event);
    const excludeId = event.excludeUserId || options?.excludeUserId;

    // Use userIdToSockets instead of clients to reach all tabs/devices per user
    for (const [uid, sockets] of this.userIdToSockets) {
      if (uid === excludeId) continue;
      if (event.adminOnly) {
        // Check if any socket for this user is admin
        const clientInfo = this.clients.get(uid);
        if (!clientInfo?.isAdmin) continue;
      }
      if (event.targetUserIds && !event.targetUserIds.includes(uid)) continue;
      if (event.targetUserId && uid !== event.targetUserId) continue;

      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      }
    }
  }

  /**
   * Get list of online user IDs
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userIdToSockets.keys());
  }

  /**
   * Get count of connected clients
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userIdToSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /**
   * Emit a notification event to a specific user
   */
  emitNotification(userId: string, notification: any) {
    this.sendToUser(userId, {
      type: 'notification:new',
      data: notification,
    });
  }

  /**
   * Emit a new chat message event
   */
  emitChatMessage(receiverId: string, message: any) {
    this.sendToUser(receiverId, {
      type: 'chat:message',
      data: message,
    });
  }

  /**
   * Emit a friend request event
   */
  emitFriendRequest(addresseeId: string, requestData: any) {
    this.sendToUser(addresseeId, {
      type: 'friend:request',
      data: requestData,
    });
  }

  /**
   * Emit a friend request accepted event
   */
  emitFriendAccepted(requesterId: string, data: any) {
    this.sendToUser(requesterId, {
      type: 'friend:accepted',
      data: data,
    });
  }

  /**
   * Emit a call signal to a specific user (WebRTC signaling)
   */
  emitCallSignal(targetUserId: string, signalData: any) {
    this.sendToUser(targetUserId, {
      type: 'call:signal',
      data: signalData,
    });
  }

  /**
   * Emit admin event to all admin users
   */
  emitAdminEvent(eventType: string, data: any) {
    this.broadcast({
      type: `admin:${eventType}`,
      data,
      adminOnly: true,
    });
  }

  /**
   * Emit admin alert to ALL connected users (not just admins)
   * Used for the admin alert bar that appears at the top of every page
   */
  emitAdminAlert(alertData: any) {
    this.broadcast({
      type: 'admin:alert',
      data: alertData,
    });
  }

  /**
   * Emit livestream event (started/ended/chat)
   */
  emitLivestreamEvent(eventType: string, data: any, excludeUserId?: string) {
    this.broadcast({
      type: `livestream:${eventType}`,
      data,
    }, { excludeUserId });
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
export default wsManager;
