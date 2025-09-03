import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Settings, Plus, Trash2, MessageSquare, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { generateChatId, saveChatToStorage } from "@/lib/chatStorage";
import type { Chat, LocalUser } from "@shared/schema";

interface ChatSidebarProps {
  activeChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onSettingsClick: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({
  activeChatId,
  onChatSelect,
  onSettingsClick,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  const { toast } = useToast();
  const [user, setUser] = useState<LocalUser | null>(null);

  useEffect(() => {
    // Load user data from localStorage
    const savedUser = localStorage.getItem("chatbot-user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Error parsing saved user:", error);
      }
    }
  }, []);

  const { data: chats = [], isLoading } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
  });

  const createChatMutation = useMutation({
    mutationFn: async (name: string) => {
      const chatId = generateChatId();
      const response = await apiRequest("POST", "/api/chats", {
        id: chatId,
        name,
      });
      return response.json();
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      saveChatToStorage(newChat);
      onChatSelect(newChat.id);
      toast({
        title: "New chat created",
        description: `Started "${newChat.name}"`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to create chat",
        variant: "destructive",
      });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const response = await apiRequest("DELETE", `/api/chats/${chatId}`);
      return response.json();
    },
    onSuccess: (_, deletedChatId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      if (activeChatId === deletedChatId) {
        onChatSelect(chats.find(c => c.id !== deletedChatId)?.id || "");
      }
      toast({
        title: "Chat deleted",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete chat",
        variant: "destructive",
      });
    },
  });

  const handleNewChat = () => {
    const chatName = `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    createChatMutation.mutate(chatName);
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChatMutation.mutate(chatId);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <aside
      className={cn(
        "w-80 flex-shrink-0 glass-card rounded-none border-r border-border sidebar-transition",
        !isOpen && "md:flex hidden -translate-x-full md:translate-x-0",
        isOpen && "flex"
      )}
      data-testid="chat-sidebar"
    >
      <div className="flex flex-col h-full w-full">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold adixdev-glow adixdev-hover-effect">ADIxGPT</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              className="glass-card hover:bg-accent/20"
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          
          <Button
            onClick={handleNewChat}
            disabled={createChatMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-medium adixdev-hover-effect adixdev-sparkle transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            data-testid="button-new-chat"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-card p-3 rounded-2xl animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted/50 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No chats yet</p>
              <p className="text-muted-foreground text-xs mt-1">Create your first chat to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  className={cn(
                    "p-3 glass-card rounded-2xl group cursor-pointer transition-colors hover:bg-accent/10",
                    activeChatId === chat.id && "border-l-4 border-primary bg-primary/10"
                  )}
                  data-testid={`chat-item-${chat.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {chat.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatTimeAgo(new Date(chat.createdAt))}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 hover:bg-destructive/20 text-destructive transition-all"
                      data-testid={`button-delete-chat-${chat.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{user?.username || "User"}</p>
              <p className="text-xs text-muted-foreground">Free Plan</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
