import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app.js';
import { initSocketServer } from '../sockets/socket.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

describe('Phase 10: Socket.io Foundation', () => {
  let io: any;
  let httpServer: HttpServer;
  let port: number;

  beforeAll(async () => {
    const app = createApp();
    httpServer = createServer(app);
    io = initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    io.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it('1. Server starts successfully and accepts connections', () => {
    expect(io).toBeDefined();
    expect(httpServer.listening).toBe(true);
  });

  it('2. Missing token is rejected safely', async () => {
    const client: ClientSocket = Client(`http://localhost:${port}`, {
      autoConnect: false,
    });

    await new Promise<void>((resolve) => {
      client.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication error: Missing token');
        client.close();
        resolve();
      });
      client.connect();
    });
  });

  it('3. Invalid token is rejected safely', async () => {
    const client: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: 'invalid_token_string' },
      autoConnect: false,
    });

    await new Promise<void>((resolve) => {
      client.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication error: Invalid or expired token');
        client.close();
        resolve();
      });
      client.connect();
    });
  });

  it('4. Valid token connects and establishes user context', async () => {
    const token = jwt.sign(
      { sub: 'test_user_id', role: 'seeker' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1m' }
    );

    const client: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token },
      autoConnect: false,
    });

    const serverContextPromise = new Promise<void>((resolve) => {
      io.on('connection', (socket: any) => {
        expect(socket.user).toBeDefined();
        expect(socket.user.userId).toBe('test_user_id');
        expect(socket.user.role).toBe('seeker');
        resolve();
      });
    });

    const clientConnectPromise = new Promise<void>((resolve) => {
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.close();
        resolve();
      });
    });

    client.connect();
    await Promise.all([serverContextPromise, clientConnectPromise]);
  });
});
