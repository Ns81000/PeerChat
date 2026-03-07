import { useState } from "react";
import { Copy, Check, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatHeaderProps {
  pin: string;
  userCount: number;
  isConnected: boolean;
  onLeave: () => void;
}

const ChatHeader = ({ pin, userCount, isConnected, onLeave }: ChatHeaderProps) => {
  const [copied, setCopied] = useState(false);

  const copyPin = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied – silently ignore
    }
  };

  return (
    <TooltipProvider>
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-light text-foreground">PeerChat</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">PIN:</span>
            <span className="font-mono text-sm font-semibold text-foreground tracking-wider">
              {pin}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={copyPin}
                  aria-label={copied ? "PIN copied" : "Copy PIN"}
                  className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied!" : "Copy PIN"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="text-xs">{userCount}</span>
            {isConnected && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-500" />
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLeave}
                aria-label="Leave chat"
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leave chat</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
};

export default ChatHeader;
