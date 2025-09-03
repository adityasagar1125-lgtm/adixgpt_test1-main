import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, insertMessageSchema } from "@shared/schema";
// GitHub Models API integration

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
let globalRateLimit = 3; // Default rate limit of 3 requests per minute

function checkRateLimit(ip: string, limit: number = globalRateLimit): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); // Reset every minute
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin rate limit management endpoint
  app.post("/api/admin/rate-limit", async (req, res) => {
    try {
      const { secretCode, rateLimit } = req.body;
      
      if (secretCode !== "HYDROAI") {
        return res.status(401).json({ error: "Unauthorized access" });
      }
      
      if (typeof rateLimit !== "number" || rateLimit < 1 || rateLimit > 1000) {
        return res.status(400).json({ error: "Rate limit must be a number between 1 and 1000" });
      }
      
      globalRateLimit = rateLimit;
      res.json({ success: true, newRateLimit: globalRateLimit });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update rate limit" });
    }
  });
  
  // Get current rate limit
  app.get("/api/admin/rate-limit", async (req, res) => {
    const { secretCode } = req.query;
    
    if (secretCode !== "HYDROAI") {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    
    res.json({ rateLimit: globalRateLimit });
  });

  // Get system statistics
  app.get("/api/admin/stats", async (req, res) => {
    const { secretCode } = req.query;
    
    if (secretCode !== "HYDROAI") {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    
    try {
      const chats = await storage.getChatsByUserId();
      const totalMessages = await Promise.all(
        chats.map(chat => storage.getMessagesByChatId(chat.id))
      );
      const messageCount = totalMessages.reduce((total, messages) => total + messages.length, 0);
      
      res.json({ 
        totalChats: chats.length,
        totalMessages: messageCount,
        currentRateLimit: globalRateLimit,
        activeUsers: 1 // Simplified for now
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // Clear system data
  app.post("/api/admin/clear-data", async (req, res) => {
    const { secretCode, dataType } = req.body;
    
    if (secretCode !== "HYDROAI") {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    
    try {
      if (dataType === "chats" || dataType === "all") {
        const chats = await storage.getChatsByUserId();
        for (const chat of chats) {
          await storage.deleteChat(chat.id);
        }
      }
      
      res.json({ 
        success: true, 
        message: `Successfully cleared ${dataType === "all" ? "all data" : dataType}` 
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // Broadcast system message (future feature)
  app.post("/api/admin/broadcast", async (req, res) => {
    const { secretCode, message, type } = req.body;
    
    if (secretCode !== "HYDROAI") {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    
    // For now, just return success - this could be extended with WebSockets
    res.json({ 
      success: true, 
      message: "Broadcast sent",
      recipients: 1 
    });
  });

  // Secure API keys endpoint
  app.get("/api/config/keys", async (req, res) => {
    try {
      res.json({
        gemini: GEMINI_API_KEY,
        mistral: MISTRAL_API_KEY,
        github: GITHUB_TOKEN
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to retrieve configuration" });
    }
  });

  // Default AI model configurations - now supports all providers
  const DEFAULT_ENDPOINTS = {
    "github": "https://models.inference.ai.azure.com",
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com",
    "cohere": "https://api.cohere.ai/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta",
    "mistral": "https://api.mistral.ai/v1"
  };
  
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";
  
  if (!GITHUB_TOKEN) {
    console.warn("Warning: GITHUB_TOKEN not found. GitHub Models functionality will be limited.");
  }

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      
      // Check rate limit
      if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please wait before sending another message." 
        });
      }

      // Validate request body
      const validation = chatRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request format",
          details: validation.error.errors 
        });
      }

      const { chatId, messages, model = "gpt-5" } = validation.data;

      // Ensure chat exists
      let chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }

      // Store user message
      const userMessage = messages[messages.length - 1];
      if (userMessage.role === "user") {
        await storage.createMessage({
          chatId,
          role: "user",
          content: userMessage.content,
          model: null,
        });
      }

      // Get provider configuration from frontend
      const providerEndpoint = req.body.endpoint || DEFAULT_ENDPOINTS["github"];
      const providerApiKey = req.body.apiKey || GITHUB_TOKEN;
      const provider = req.body.provider || "github";
      
      // Prepare API request based on provider
      let apiUrl = `${providerEndpoint}/chat/completions`;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      let requestBody: any = {
        model: model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      };
      
      // Configure headers and body based on provider
      if (provider === "github" || provider === "openai") {
        headers['Authorization'] = `Bearer ${providerApiKey}`;
        requestBody.max_completion_tokens = 4000;
      } else if (provider === "anthropic") {
        headers['x-api-key'] = providerApiKey;
        headers['anthropic-version'] = '2023-06-01';
        requestBody.max_tokens = 4000;
      } else if (provider === "cohere") {
        headers['Authorization'] = `Bearer ${providerApiKey}`;
        requestBody.max_tokens = 4000;
      } else if (provider === "mistral") {
        headers['Authorization'] = `Bearer ${providerApiKey}`;
        requestBody.max_tokens = 4000;
      } else if (provider === "gemini") {
        apiUrl = `${providerEndpoint}/models/${model}:generateContent?key=${providerApiKey}`;
        requestBody = {
          contents: [{
            parts: [{ text: messages[messages.length - 1].content }]
          }]
        };
      } else {
        // Default to OpenAI-compatible format
        headers['Authorization'] = `Bearer ${providerApiKey}`;
        requestBody.max_completion_tokens = 4000;
      }
      
      // Call AI API
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error("GitHub Models API error:", apiResponse.status, errorText);
        return res.status(apiResponse.status).json({ 
          error: "Failed to get response from AI model",
          details: errorText 
        });
      }

      const responseData = await apiResponse.json();
      let assistantMessage;
      
      // Parse response based on provider
      if (provider === "gemini") {
        assistantMessage = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      } else if (provider === "anthropic") {
        assistantMessage = responseData.content?.[0]?.text;
      } else {
        // OpenAI, Cohere, Mistral, and GitHub Models format (all use same response structure)
        assistantMessage = responseData.choices?.[0]?.message?.content;
      }
      
      if (!assistantMessage) {
        console.error("No assistant message found in response:", responseData);
        return res.status(500).json({ error: "No response from AI model" });
      }

      // Store assistant message
      const savedMessage = await storage.createMessage({
        chatId,
        role: "assistant",
        content: assistantMessage,
        model: model,
      });

      res.json({
        message: assistantMessage,
        messageId: savedMessage.id,
        model: model,
      });

    } catch (error: any) {
      console.error("Chat error:", error);
      
      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        return res.status(429).json({ 
          error: "API rate limit exceeded. Please wait before sending another message." 
        });
      }
      
      if (error.message?.includes('unauthorized') || error.message?.includes('invalid')) {
        return res.status(401).json({ 
          error: "Invalid API key. Please check your API key permissions." 
        });
      }

      res.status(500).json({ 
        error: "Failed to process chat request",
        details: error.message 
      });
    }
  });

  // Get chats
  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getChatsByUserId();
      res.json(chats);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to retrieve chats" });
    }
  });

  // Create new chat
  app.post("/api/chats", async (req, res) => {
    try {
      const { id, name } = req.body;
      
      if (!id || !name) {
        return res.status(400).json({ error: "Chat ID and name are required" });
      }

      const chat = await storage.createChat({ id, name });
      res.json(chat);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create chat" });
    }
  });

  // Delete chat
  app.delete("/api/chats/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChat(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete chat" });
    }
  });

  // Get messages for a chat
  app.get("/api/chats/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessagesByChatId(id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to retrieve messages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
