import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import type { DisplayMessage } from "@/lib/messageSchema";
import MessageBubble from "@/components/chat/MessageBubble";

interface ChatWindowProps {
  messages: DisplayMessage[];
  currentUserId: string;
  userCount: number;
}

const NEAR_BOTTOM_THRESHOLD = 150;

const ChatWindow = ({ messages, currentUserId, userCount }: ChatWindowProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const [showNewMessages, setShowNewMessages] = useState(false);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_THRESHOLD;
    isNearBottom.current = atBottom;
    if (atBottom) setShowNewMessages(false);
  }, []);

  useEffect(() => {
    if (isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowNewMessages(true);
    }
  }, [messages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMessages(false);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto px-4 py-4"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">
              {userCount > 1
                ? `${userCount} users in the room \u2014 start chatting!`
                : "Waiting for others to join..."}
            </p>
            <p className="mt-1 text-xs text-system-text">
              Share the PIN to invite people
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} currentUserId={currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {showNewMessages && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground shadow-md transition-colors hover:bg-elevated"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          New messages
        </button>
      )}
    </div>
  );
};

export default ChatWindow;
