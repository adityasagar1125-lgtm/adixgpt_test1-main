import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@shared/schema";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: "Message copied",
        description: "Message content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const msgTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - msgTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      return msgTime.toLocaleDateString() + " " + msgTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end message-bubble" data-testid={`message-user-${message.id}`}>
        <div className="max-w-[80%] md:max-w-[70%]">
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl rounded-br-md shadow-lg">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex items-center justify-end mt-2 space-x-2">
            <span className="text-xs text-muted-foreground" data-testid="text-message-time">
              {formatTime(message.timestamp)}
            </span>
            <div className="w-2 h-2 bg-primary rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start message-bubble" data-testid={`message-assistant-${message.id}`}>
      <div className="max-w-[80%] md:max-w-[70%]">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <Bot className="h-4 w-4 text-foreground" />
          </div>
          <div className="glass-card p-4 rounded-2xl rounded-tl-md shadow-lg flex-1">
            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-card-foreground leading-relaxed">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({node, ...props}) => {
                    const {inline, className, children, ...rest} = props as any;
                    return inline ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...rest}>
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                        <code className="font-mono text-sm" {...rest}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                  blockquote: ({children}) => (
                    <blockquote className="border-l-4 border-primary pl-4 my-4 text-muted-foreground italic">
                      {children}
                    </blockquote>
                  ),
                  h1: ({children}) => <h1 className="text-xl font-bold mb-3 text-card-foreground">{children}</h1>,
                  h2: ({children}) => <h2 className="text-lg font-semibold mb-2 text-card-foreground">{children}</h2>,
                  h3: ({children}) => <h3 className="text-base font-medium mb-2 text-card-foreground">{children}</h3>,
                  p: ({children}) => <p className="mb-3 last:mb-0 text-card-foreground">{children}</p>,
                  ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                  li: ({children}) => <li className="text-card-foreground">{children}</li>,
                  a: ({href, children}) => (
                    <a href={href} className="text-primary hover:text-primary/80 underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  strong: ({children}) => <strong className="font-bold text-card-foreground">{children}</strong>,
                  em: ({children}) => <em className="italic text-card-foreground">{children}</em>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground" data-testid="text-message-time">
                  {formatTime(message.timestamp)}
                </span>
                {message.model && (
                  <span className="text-xs text-accent font-medium" data-testid="text-message-model">
                    {message.model}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-6 w-6 hover:bg-accent/20 text-muted-foreground hover:text-accent"
                  data-testid="button-copy-message"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-accent/20 text-muted-foreground hover:text-accent"
                  data-testid="button-like-message"
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                  data-testid="button-dislike-message"
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
