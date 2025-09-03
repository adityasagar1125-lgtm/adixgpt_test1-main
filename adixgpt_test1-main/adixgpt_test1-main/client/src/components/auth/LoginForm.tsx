import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, LogIn } from "lucide-react";
import { LocalUser, insertLocalUserSchema } from "@shared/schema";

interface LoginFormProps {
  onLogin: (user: LocalUser) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate username
      const validatedData = insertLocalUserSchema.parse({ username: username.trim() });
      
      // Create user object
      const user: LocalUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: validatedData.username,
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage
      localStorage.setItem("chatbot-user", JSON.stringify(user));
      
      toast({
        title: "Welcome!",
        description: `Logged in as ${user.username}`,
      });

      onLogin(user);
    } catch (error) {
      toast({
        title: "Invalid username",
        description: error instanceof Error ? error.message : "Please enter a valid username",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      <Card className="w-full max-w-md glass-card border-border/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Welcome!</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your username to start chatting with AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-input"
                required
                data-testid="input-username"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                "Logging in..."
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Continue
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}