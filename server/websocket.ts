import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { storage } from './storage';
import { insertMessageSchema } from '@shared/schema';
import { verifyAuthToken } from './auth';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  userStatus?: string;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedWebSocket) => {
    console.log('WebSocket connection established');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'auth':
            await handleAuth(ws, message);
            break;

          case 'send_message':
            await handleSendMessage(ws, message);
            break;

          case 'join_room':
            await handleJoinRoom(ws, message);
            break;

          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  async function handleAuth(ws: AuthenticatedWebSocket, message: any) {
    try {
      const { token } = message;
      
      console.log(`[WebSocket] Auth attempt from client`);
      
      if (!token) {
        console.log(`[WebSocket] Auth failed: No token provided`);
        ws.send(JSON.stringify({
          type: 'auth_error',
          message: 'Authentication token required',
          code: 'NO_TOKEN'
        }));
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify the JWT token
      const tokenData = verifyAuthToken(token);
      if (!tokenData) {
        console.log(`[WebSocket] Auth failed: Token verification failed`);
        ws.send(JSON.stringify({
          type: 'auth_error',
          message: 'Invalid or expired authentication token',
          code: 'INVALID_TOKEN'
        }));
        ws.close(1008, 'Invalid token');
        return;
      }

      // Verify user still exists and has the same status
      const user = await storage.getUserById(tokenData.userId);
      if (!user) {
        ws.send(JSON.stringify({
          type: 'auth_error',
          message: 'User not found'
        }));
        ws.close(1008, 'User not found');
        return;
      }

      // Check if user status matches token (prevent using old tokens after status change)
      if (user.status !== tokenData.status) {
        ws.send(JSON.stringify({
          type: 'auth_error',
          message: 'User status has changed. Please re-authenticate'
        }));
        ws.close(1008, 'Status changed');
        return;
      }

      if (user.status !== 'approved') {
        ws.send(JSON.stringify({
          type: 'auth_error',
          message: 'User not approved for chat'
        }));
        ws.close(1008, 'Not approved');
        return;
      }

      // Authentication successful
      ws.userId = user.id;
      ws.userStatus = user.status;

      // Load chat history
      const globalRoom = await storage.getOrCreateGlobalRoom();
      const messages = await storage.getMessagesByRoomId(globalRoom.id, 50);

      ws.send(JSON.stringify({
        type: 'auth_success',
        user: {
          id: user.id,
          anonName: user.anonName,
          status: user.status
        },
        roomId: globalRoom.id
      }));

      ws.send(JSON.stringify({
        type: 'chat_history',
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt,
          user: msg.user ? {
            id: msg.user.id,
            anonName: msg.user.anonName
          } : null
        }))
      }));

    } catch (error) {
      console.error('Auth error:', error);
      ws.send(JSON.stringify({
        type: 'auth_error',
        message: 'Authentication failed'
      }));
      ws.close(1011, 'Authentication error');
    }
  }

  async function handleSendMessage(ws: AuthenticatedWebSocket, message: any) {
    try {
      if (!ws.userId || ws.userStatus !== 'approved') {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Not authenticated or not approved'
        }));
        return;
      }

      const { content, roomId } = message;
      
      // Validate message using insertMessageSchema
      const globalRoom = await storage.getOrCreateGlobalRoom();
      const targetRoomId = roomId || globalRoom.id;

      const messageData = {
        content: content,
        userId: ws.userId,
        roomId: targetRoomId
      };

      const validation = insertMessageSchema.safeParse(messageData);
      if (!validation.success) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Invalid message: ${validation.error.issues.map(i => i.message).join(', ')}`
        }));
        return;
      }

      // Additional content validation
      const trimmedContent = content?.trim();
      if (!trimmedContent || trimmedContent.length === 0) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Message content cannot be empty'
        }));
        return;
      }

      if (trimmedContent.length > 1000) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Message is too long (max 1000 characters)'
        }));
        return;
      }

      const newMessage = await storage.createMessage({
        content: trimmedContent,
        userId: ws.userId,
        roomId: targetRoomId
      });

      const user = await storage.getUserById(ws.userId);
      
      // Broadcast message to all connected clients in the room
      const broadcastData = JSON.stringify({
        type: 'new_message',
        message: {
          id: newMessage.id,
          content: newMessage.content,
          createdAt: newMessage.createdAt,
          user: {
            id: user?.id,
            anonName: user?.anonName
          }
        }
      });

      wss.clients.forEach((client: AuthenticatedWebSocket) => {
        if (client.readyState === WebSocket.OPEN && 
            client.userId && 
            client.userStatus === 'approved') {
          client.send(broadcastData);
        }
      });

    } catch (error) {
      console.error('Send message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to send message'
      }));
      
      // Close connection on repeated errors (security measure)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('ECONNRESET') || errorMessage.includes('Invalid')) {
        ws.close(1011, 'Message error');
      }
    }
  }

  async function handleJoinRoom(ws: AuthenticatedWebSocket, message: any) {
    // For MVP, we only have global room
    const globalRoom = await storage.getOrCreateGlobalRoom();
    ws.send(JSON.stringify({
      type: 'joined_room',
      roomId: globalRoom.id,
      roomName: 'Общий чат'
    }));
  }

  return wss;
}
