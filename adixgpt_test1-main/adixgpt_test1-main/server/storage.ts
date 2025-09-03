import { type User, type InsertUser, type Chat, type InsertChat, type Message, type InsertMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat methods
  getChat(id: string): Promise<Chat | undefined>;
  getChatsByUserId(userId?: string): Promise<Chat[]>;
  createChat(chat: InsertChat): Promise<Chat>;
  deleteChat(id: string): Promise<void>;
  
  // Message methods
  getMessagesByChatId(chatId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessagesByChatId(chatId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private chats: Map<string, Chat>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.chats = new Map();
    this.messages = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getChat(id: string): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async getChatsByUserId(userId?: string): Promise<Chat[]> {
    return Array.from(this.chats.values())
      .filter(chat => !userId || chat.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const chat: Chat = {
      ...insertChat,
      createdAt: new Date(),
      userId: null,
    };
    this.chats.set(chat.id, chat);
    return chat;
  }

  async deleteChat(id: string): Promise<void> {
    this.chats.delete(id);
    // Also delete all messages for this chat
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.chatId === id)
      .map(([messageId]) => messageId);
    
    messagesToDelete.forEach(messageId => this.messages.delete(messageId));
  }

  async getMessagesByChatId(chatId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.chatId === chatId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
      model: insertMessage.model || null,
    };
    this.messages.set(id, message);
    return message;
  }

  async deleteMessagesByChatId(chatId: string): Promise<void> {
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.chatId === chatId)
      .map(([messageId]) => messageId);
    
    messagesToDelete.forEach(messageId => this.messages.delete(messageId));
  }
}

export const storage = new MemStorage();
