import type { Chat } from "@shared/schema";

export function generateChatId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function saveChatToStorage(chat: Chat): void {
  const chats = getChatsFromStorage();
  const existingIndex = chats.findIndex(c => c.id === chat.id);
  
  if (existingIndex >= 0) {
    chats[existingIndex] = chat;
  } else {
    chats.unshift(chat);
  }
  
  localStorage.setItem("chatbot-chats", JSON.stringify(chats));
}

export function getChatsFromStorage(): Chat[] {
  try {
    const chats = localStorage.getItem("chatbot-chats");
    return chats ? JSON.parse(chats) : [];
  } catch {
    return [];
  }
}

export function removeChatFromStorage(chatId: string): void {
  const chats = getChatsFromStorage().filter(c => c.id !== chatId);
  localStorage.setItem("chatbot-chats", JSON.stringify(chats));
}

export function generateChatName(firstMessage?: string): string {
  if (firstMessage && firstMessage.trim().length > 0) {
    // Clean up the message and use first 1-10 words
    const cleanedMessage = firstMessage.trim().replace(/\s+/g, ' ');
    const words = cleanedMessage.split(' ').slice(0, 10);
    const chatName = words.join(' ');
    
    // If less than 1 word or empty, use fallback
    if (words.length < 1 || chatName.trim().length === 0) {
      return getFormattedDateTime();
    }
    
    // Truncate if too long but keep meaningful content
    return chatName.length > 60 ? chatName.substring(0, 57) + '...' : chatName;
  }
  
  return getFormattedDateTime();
}

export function getFormattedDateTime(): string {
  const now = new Date();
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (now.toDateString() === today.toDateString()) {
    return `Today ${timeString}`;
  } else if (now.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${timeString}`;
  } else {
    return `${now.toLocaleDateString()} ${timeString}`;
  }
}
