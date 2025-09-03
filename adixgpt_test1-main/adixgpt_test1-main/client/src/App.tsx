import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ChatPage from "@/pages/chat";
import LoginForm from "@/components/auth/LoginForm";
import { LocalUser } from "@shared/schema";
import { loadApiKeys } from "./lib/aiProviders";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/chat/:chatId?" component={ChatPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize API keys on app start
    loadApiKeys();
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem("chatbot-user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Error parsing saved user:", error);
        localStorage.removeItem("chatbot-user");
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (newUser: LocalUser) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("chatbot-user");
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <LoginForm onLogin={handleLogin} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
