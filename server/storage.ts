import { users, messages, rooms, type User, type InsertUser, type Message, type InsertMessage, type Room, type InsertRoom } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUserById(id: number): Promise<User | undefined>;
  getUserByTgId(tgId: bigint): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: number, status: "pending" | "approved" | "rejected"): Promise<User | undefined>;
  getPendingUsers(): Promise<User[]>;

  // Message operations
  getMessagesByRoomId(roomId: number, limit?: number): Promise<(Message & { user: User | null })[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Room operations
  getRoomById(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  getOrCreateGlobalRoom(): Promise<Room>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByTgId(tgId: bigint): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.tgId, tgId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserStatus(id: number, status: "pending" | "approved" | "rejected"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getPendingUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.status, "pending"));
  }

  async getMessagesByRoomId(roomId: number, limit: number = 50): Promise<(Message & { user: User | null })[]> {
    const result = await db
      .select({
        id: messages.id,
        roomId: messages.roomId,
        userId: messages.userId,
        content: messages.content,
        createdAt: messages.createdAt,
        user: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return result.reverse();
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getRoomById(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room || undefined;
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const [room] = await db
      .insert(rooms)
      .values(insertRoom)
      .returning();
    return room;
  }

  async getOrCreateGlobalRoom(): Promise<Room> {
    const [existingRoom] = await db.select().from(rooms).where(eq(rooms.name, "global"));
    if (existingRoom) {
      return existingRoom;
    }

    return await this.createRoom({
      name: "global",
      type: "global",
    });
  }
}

export const storage = new DatabaseStorage();
