import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Menu, Send, Paperclip, Mic, Bot, Code, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import MessageBubble from "./MessageBubble";
import { getAIProviders, getSelectedProvider } from "@/lib/aiProviders";
import { generateChatName } from "@/lib/chatStorage";
import type { Message } from "@shared/schema";

interface ChatWindowProps {
  chatId: string | null;
  onSidebarToggle: () => void;
  isMobile: boolean;
}

// Helper function to make error messages user-friendly
function getUserFriendlyErrorMessage(errorMessage: string): string {
  if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
    return "You've reached the daily limit for this AI model. Try again tomorrow or switch to a different model.";
  } else if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
    return "The AI service couldn't verify your access. Please check your API key in settings.";
  } else if (errorMessage.includes("network") || errorMessage.includes("connection")) {
    return "Network connection issue. Please check your internet connection and try again.";
  } else if (errorMessage.includes("timeout")) {
    return "The AI took too long to respond. Please try sending your message again.";
  } else if (errorMessage.includes("model") || errorMessage.includes("400")) {
    return "There's an issue with the selected AI model. Try switching to a different model.";
  } else if (errorMessage.includes("429")) {
    return "Too many requests sent too quickly. Please wait a moment and try again.";
  } else if (errorMessage.includes("500") || errorMessage.includes("502") || errorMessage.includes("503")) {
    return "The AI service is temporarily unavailable. Please try again in a few minutes.";
  }
  return "Something went wrong while sending your message. Please try again.";
}

export default function ChatWindow({ chatId, onSidebarToggle, isMobile }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-pro");
  const [selectedProviderId, setSelectedProviderId] = useState("gemini-1.5-pro");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const providers = getAIProviders();
  const activeProvider = getSelectedProvider();

  // Group providers by their group property
  const groupedProviders = providers.reduce((groups, provider) => {
    const group = provider.group || 'Other';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(provider);
    return groups;
  }, {} as Record<string, typeof providers>);

  // Helper function to get icon for tags
  const getTagIcon = (tag: string) => {
    switch (tag) {
      case 'coding': return <Code className="h-3 w-3" />;
      case 'study': case 'maths': return <Calculator className="h-3 w-3" />;
      default: return null;
    }
  };

  // Load selected model from localStorage
  useEffect(() => {
    const savedProviderId = localStorage.getItem("chatbot-selected-provider");
    if (savedProviderId) {
      const provider = providers.find(p => p.id === savedProviderId);
      if (provider) {
        setSelectedModel(provider.modelId);
        setSelectedProviderId(provider.id);
      }
    } else if (providers.length > 0) {
      // Default to the first provider if none selected and set it as selected
      const firstProvider = providers[0];
      setSelectedModel(firstProvider.modelId);
      setSelectedProviderId(firstProvider.id);
      localStorage.setItem("chatbot-selected-model", firstProvider.modelId);
      localStorage.setItem("chatbot-selected-provider", firstProvider.id);
    }
  }, [providers]);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/chats", chatId, "messages"],
    enabled: !!chatId,
  });

  const { data: chatData } = useQuery({
    queryKey: ["/api/chats", chatId],
    enabled: !!chatId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      let actualChatId = chatId;
      
      // If chatId is "new" or null, create a new chat first
      if (!chatId || chatId === "new") {
        const chatName = generateChatName(content);
        const newChatResponse = await apiRequest("POST", "/api/chats", {
          id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          name: chatName
        });
        const newChat = await newChatResponse.json();
        actualChatId = newChat.id;
        
        // Update URL to reflect the new chat ID
        window.history.replaceState(null, '', `/chat/${actualChatId}`);
      }
      
      const conversationMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content }
      ];

      // Get selected provider information
      const selectedProvider = getSelectedProvider();
      
      const providerType = selectedProvider?.endpoint.includes('anthropic') ? 'anthropic' :
                          selectedProvider?.endpoint.includes('cohere') ? 'cohere' :
                          selectedProvider?.endpoint.includes('generativelanguage') ? 'gemini' :
                          selectedProvider?.endpoint.includes('mistral') ? 'mistral' :
                          selectedProvider?.endpoint.includes('api.openai') ? 'openai' : 'github';

      const response = await apiRequest("POST", "/api/chat", {
        chatId: actualChatId,
        messages: conversationMessages,
        model: selectedModel,
        endpoint: selectedProvider?.endpoint,
        apiKey: selectedProvider?.apiKey,
        provider: providerType,
      });
      return { response: await response.json(), chatId: actualChatId };
    },
    onSuccess: (data) => {
      const { chatId: newChatId } = data;
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", newChatId, "messages"] });
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Something went wrong";
      const userFriendlyMessage = getUserFriendlyErrorMessage(errorMessage);
      
      toast({
        title: "Message failed to send",
        description: userFriendlyMessage,
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigator.clipboard.writeText(errorMessage)}
          >
            Copy Error
          </Button>
        ),
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessageMutation.isPending]);

  if (!chatId) {
    return (
      <main className="flex-1 flex flex-col min-w-0">
        <header className="glass-card rounded-none border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSidebarToggle}
                  className="glass-card hover:bg-accent/20"
                  data-testid="button-toggle-sidebar"
                >
                  <Menu className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
              <h2 className="text-xl font-bold adixdev-glow adixdev-hover-effect">ADIxGPT</h2>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-breathe"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-smooth-pulse" style={{animationDelay: '1s'}}></div>
          
          <div className="text-center py-8 z-10 relative">
            <div className="w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl adixdev-floating adixdev-pulse-ring">
              <Bot className="h-10 w-10 text-foreground" />
            </div>
            <h3 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
              Welcome to ADIxGPT
            </h3>
            <p className="text-muted-foreground mb-8 text-lg">Experience the power of AI conversation</p>
            
            {/* Animated Start Conversation Button */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500 opacity-60 group-hover:opacity-90 animate-gentle-glow"></div>
              <Button 
                className="relative bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-xl transform transition-all duration-300 hover:scale-105 active:scale-95 border-0 animate-breathe"
                onClick={() => window.location.href = '/chat/new'}
                data-testid="button-start-conversation"
              >
                <span className="relative z-10 flex items-center space-x-3">
                  <span>Start Conversation</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white/80 rounded-full animate-floating-dot"></div>
                    <div className="w-2 h-2 bg-white/80 rounded-full animate-floating-dot"></div>
                    <div className="w-2 h-2 bg-white/80 rounded-full animate-floating-dot"></div>
                  </div>
                </span>
              </Button>
            </div>
            
            <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-smooth-pulse"></div>
                <span>AI Ready</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-smooth-pulse" style={{animationDelay: '0.7s'}}></div>
                <span>Multiple Models</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-smooth-pulse" style={{animationDelay: '1.4s'}}></div>
                <span>Real-time Chat</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-w-0">
      {/* TopBar */}
      <header className="glass-card rounded-none border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSidebarToggle}
                className="glass-card hover:bg-accent/20"
                data-testid="button-toggle-sidebar"
              >
                <Menu className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <h2 className="font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent" data-testid="text-chat-name">
                  ADIxGPT Chat
                </h2>
                <p className="text-sm text-muted-foreground">
                  Model: <span className="font-medium text-accent" data-testid="text-active-model">{selectedModel}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Select 
                      value={selectedProviderId} 
                      onValueChange={(providerId) => {
                        const provider = providers.find(p => p.id === providerId);
                        if (provider) {
                          setSelectedModel(provider.modelId);
                          setSelectedProviderId(provider.id);
                          localStorage.setItem("chatbot-selected-model", provider.modelId);
                          localStorage.setItem("chatbot-selected-provider", provider.id);
                        }
                      }}
                    >
                      <SelectTrigger className="glass-input rounded-xl w-48 text-sm font-medium" data-testid="select-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(groupedProviders).map(([groupName, groupProviders]) => (
                          <SelectGroup key={groupName}>
                            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
                              {groupName}
                            </SelectLabel>
                            {groupProviders.map(provider => (
                              <SelectItem key={provider.id} value={provider.id}>
                                <div className="flex items-center space-x-2">
                                  <span>{provider.displayName}</span>
                                  {provider.tags?.map((tag, index) => (
                                    <span key={`${provider.id}-${tag}-${index}`} className="text-muted-foreground">
                                      {getTagIcon(tag)}
                                    </span>
                                  ))}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>{activeProvider?.tooltip || "Select a model to chat with"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              <span data-testid="text-rate-limit">{activeProvider?.requestsPerMinute || 3}/min limit</span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6" data-testid="messages-container">
        <div className="max-w-4xl mx-auto space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="glass-card p-4 rounded-2xl h-20"></div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center relative">
              <div className="text-center py-8 animate-fade-in">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl animate-bounce">
                  <Bot className="h-10 w-10 text-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Ready to Chat!
                </h3>
                <p className="text-muted-foreground text-lg mb-6">Ask me anything about development, design, or technology.</p>
                
                {/* Centered Input for New Chat */}
                <div className="max-w-2xl mx-auto animate-slide-up">
                  <form onSubmit={handleSubmit} className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={message}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message to start the conversation..."
                      className="w-full glass-input rounded-3xl p-6 pr-16 resize-none min-h-[60px] max-h-[120px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-lg shadow-xl border-2 border-primary/20 focus:border-primary/50 transition-all duration-300"
                      disabled={sendMessageMutation.isPending}
                      data-testid="input-message-centered"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      className="absolute right-4 bottom-4 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white rounded-2xl w-12 h-12 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg"
                      data-testid="button-send-message-centered"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                  <div className="flex items-center justify-center mt-4 text-sm text-muted-foreground">
                    <span>Press Enter to send • {message.length}/4000 characters</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              
              {sendMessageMutation.isPending && (
                <div className="flex justify-start message-bubble animate-fade-in">
                  <div className="max-w-[80%] md:max-w-[70%]">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1 animate-pulse shadow-lg">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="glass-card p-4 rounded-2xl rounded-tl-md shadow-lg border border-border">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-accent rounded-full animate-bounce"></div>
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-accent rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-accent rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                          </div>
                          <span className="text-sm text-muted-foreground font-medium">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input Area - Show when messages exist or for new chats */}
      {(messages.length > 0 || chatId === "new") && (
        <div className="border-t border-border p-6 animate-slide-up">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-end space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="w-full glass-input rounded-2xl p-4 pr-12 resize-none min-h-[50px] max-h-[120px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300"
                    disabled={sendMessageMutation.isPending}
                    data-testid="input-message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="absolute right-3 bottom-3 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 px-2">
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span data-testid="text-char-count">{message.length}/4000 characters</span>
                    <span>Press Enter to send</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-accent/20 text-muted-foreground hover:text-accent"
                      data-testid="button-attach-file"
                    >
                      <Paperclip className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-accent/20 text-muted-foreground hover:text-accent"
                      data-testid="button-voice-input"
                    >
                      <Mic className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
