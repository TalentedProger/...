import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./websocket";
import { insertUserSchema } from "@shared/schema";
import { generateAuthToken, generateRefreshToken, verifyRefreshToken } from "./auth";
import crypto from 'crypto';
import querystring from 'querystring';

function parseInitData(initData: string) {
  return querystring.parse(initData);
}

function verifyInitData(initData: string, botToken: string): boolean {
  try {
    const params = initData.split('&').map(p => p.split('='));
    const kv: Record<string, string> = {};
    
    for (const [k, v] of params) {
      if (!k) continue;
      kv[k] = decodeURIComponent(v || '');
    }
    
    const hash = kv['hash'];
    if (!hash) return false;
    
    const keys = Object.keys(kv).filter(k => k !== 'hash').sort();
    const data_check_arr = keys.map(k => `${k}=${kv[k]}`);
    const data_check_string = data_check_arr.join('\n');

    const secret = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secret).update(data_check_string).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(hash, 'hex'));
  } catch (error) {
    console.error('Init data verification error:', error);
    return false;
  }
}

function generateAnonName(): string {
  const prefixes = ['User', 'Anon', 'Guest', 'Member'];
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}${suffix}`;
}


export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup WebSocket
  setupWebSocket(httpServer);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Development-only auth endpoint for testing
  app.post('/api/auth/dev', async (req, res) => {
    // CRITICAL SECURITY: Multiple layers of production protection
    
    // Primary check: NODE_ENV must not be production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[SECURITY] Dev endpoint access attempt blocked in production from IP: ${req.ip}`);
      return res.status(403).json({ error: 'Dev endpoint not available in production' });
    }

    // Secondary check: Explicitly require DEV_MODE flag
    if (process.env.DEV_MODE !== 'true') {
      console.warn(`[SECURITY] Dev endpoint access blocked - DEV_MODE not enabled from IP: ${req.ip}`);
      return res.status(403).json({ error: 'Dev endpoint disabled' });
    }

    // Tertiary check: Block if JWT_SECRET is production-grade (longer than dev fallback)
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length > 50) {
      console.warn(`[SECURITY] Dev endpoint blocked - production JWT detected from IP: ${req.ip}`);
      return res.status(403).json({ error: 'Dev endpoint not available with production secrets' });
    }

    try {
      // Allow specifying tgId for testing different users
      const { tgId } = req.body;
      const targetTgId = tgId ? BigInt(tgId) : BigInt(999999);
      
      // Get the specified user
      let user = await storage.getUserByTgId(targetTgId);
      
      if (!user) {
        user = await storage.createUser({
          tgId: targetTgId,
          username: null,
          anonName: generateAnonName(),
          status: targetTgId === BigInt(999999) ? 'approved' : 'pending',
        });
      }

      const token = generateAuthToken(user);
      const refreshToken = generateRefreshToken(user);

      console.log(`[DEV AUTH] Authenticated as user ${user.id} (${user.anonName}) with status: ${user.status}`);

      res.json({
        user: {
          id: user.id,
          anonName: user.anonName,
          status: user.status,
          createdAt: user.createdAt,
        },
        status: user.status,
        token,
        refreshToken
      });

    } catch (error) {
      console.error('Dev auth error:', error);
      res.status(500).json({ error: 'Dev authentication failed' });
    }
  });

  // Authentication endpoint
  app.post('/api/auth', async (req, res) => {
    try {
      const { initData } = req.body;
      
      console.log('[DEBUG] Auth request received:', {
        hasInitData: !!initData,
        initDataLength: initData?.length || 0,
        initDataPreview: initData?.substring(0, 50) + '...'
      });
      
      if (!initData) {
        console.log('[DEBUG] No initData provided');
        return res.status(400).json({ error: 'initData required' });
      }

      const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
      if (!botToken) {
        return res.status(500).json({ error: 'Bot token not configured' });
      }

      // Verify initData
      const isValid = verifyInitData(initData, botToken);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid initData' });
      }

      // Parse user data from initData
      const parsed = parseInitData(initData);
      let userData = null;
      
      if (parsed.user && typeof parsed.user === 'string') {
        try {
          userData = JSON.parse(parsed.user);
        } catch (e) {
          console.error('Failed to parse user data from initData:', e);
        }
      }

      if (!userData || !userData.id) {
        return res.status(400).json({ error: 'Invalid user data in initData' });
      }

      const tgId = BigInt(userData.id);
      let user = await storage.getUserByTgId(tgId);

      // Create user if not exists
      if (!user) {
        user = await storage.createUser({
          tgId,
          username: userData.username || null,
          anonName: generateAnonName(),
          status: 'pending',
        });
      }

      const token = generateAuthToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        user: {
          id: user.id,
          anonName: user.anonName,
          status: user.status,
          createdAt: user.createdAt,
        },
        status: user.status,
        token,
        refreshToken
      });

    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Token refresh endpoint
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      // Verify the refresh token
      const tokenData = verifyRefreshToken(refreshToken);
      if (!tokenData) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      // Get current user data to ensure still valid
      const user = await storage.getUserById(tokenData.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Check if user status matches token (prevent using old tokens after status change)
      if (user.status !== tokenData.status) {
        return res.status(401).json({ error: 'User status has changed. Please re-authenticate' });
      }

      // Generate new tokens
      const newToken = generateAuthToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        user: {
          id: user.id,
          anonName: user.anonName,
          status: user.status,
          createdAt: user.createdAt,
        },
        status: user.status,
        token: newToken,
        refreshToken: newRefreshToken
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  });

  // Get chat history
  app.get('/api/messages/:roomId?', async (req, res) => {
    try {
      const roomId = req.params.roomId ? parseInt(req.params.roomId) : null;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      let targetRoomId = roomId;
      if (!targetRoomId) {
        const globalRoom = await storage.getOrCreateGlobalRoom();
        targetRoomId = globalRoom.id;
      }

      const messages = await storage.getMessagesByRoomId(targetRoomId, limit);
      
      res.json({
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt,
          user: msg.user ? {
            id: msg.user.id,
            anonName: msg.user.anonName
          } : null
        }))
      });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to load messages' });
    }
  });

  return httpServer;
}
