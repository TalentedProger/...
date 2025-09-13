import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { storage } from './storage';
import { insertMessageSchema } from '@shared/schema';

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
      const { userId } = message;
      
      if (!userId) {
        ws.send(JSON.stringify({
          type: 'auth_error',
          message: 'User ID required'
        }));
        return;
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        ws.send(JSON.stringify({
          type: 'auth_error',
          message: 'User not found'
        }));
        return;
      }

      ws.userId = user.id;
      ws.userStatus = user.status;

      if (user.status !== 'approved') {
        ws.send(JSON.stringify({
          type: 'auth_error',
          message: 'User not approved for chat'
        }));
        return;
      }

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
      
      if (!content?.trim()) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Message content required'
        }));
        return;
      }

      const globalRoom = await storage.getOrCreateGlobalRoom();
      const targetRoomId = roomId || globalRoom.id;

      const newMessage = await storage.createMessage({
        content: content.trim(),
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
