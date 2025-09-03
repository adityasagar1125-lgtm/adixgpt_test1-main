import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import SettingsPanel from "@/components/chat/SettingsPanel";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ChatPage() {
  const [, params] = useRoute("/chat/:chatId?");
  const [activeChatId, setActiveChatId] = useState<string | null>(params?.chatId || null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (params?.chatId) {
      setActiveChatId(params.chatId);
    }
  }, [params?.chatId]);

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        activeChatId={activeChatId}
        onChatSelect={setActiveChatId}
        onSettingsClick={() => setIsSettingsOpen(true)}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <ChatWindow
        chatId={activeChatId}
        onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobile={isMobile}
      />
      
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
