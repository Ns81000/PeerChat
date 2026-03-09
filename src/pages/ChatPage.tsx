import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useRoom } from "@/hooks/useRoom";
import { useChat } from "@/hooks/useChat";
import { useFileTransfer } from "@/hooks/useFileTransfer";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatWindow from "@/components/chat/ChatWindow";
import MessageInput from "@/components/chat/MessageInput";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ChatPage = () => {
  const { pin } = useParams<{ pin: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isHost = searchParams.get("host") === "true";
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const { isConnected, error, userCount, userId, userLabel, roomId, hostLeft, disconnect } = useRoom({
    pin: pin || "",
    isHost,
  });

  const { messages, sendMessage, addLocalFileMessage, cleanup } = useChat({
    roomId,
    userId: userLabel,
  });

  const { sendFile, sendProgress, isSending, error: fileError } = useFileTransfer({
    pin: pin || "",
    roomId,
    userId: userLabel,
    addLocalFileMessage,
  });

  const prevFileErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (fileError && fileError !== prevFileErrorRef.current) {
      toast.error(fileError);
    }
    prevFileErrorRef.current = fileError;
  }, [fileError]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (hostLeft) {
      disconnect();
      toast.info("The host has left. Room is closing.");
      navigate("/");
    }
  }, [hostLeft, disconnect, navigate]);

  const handleLeave = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeave = () => {
    setShowLeaveDialog(false);
    disconnect();
    navigate("/");
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
          <p className="text-lg text-destructive">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
          <p className="text-sm text-muted-foreground">
            {isHost ? "Creating room..." : "Connecting to room..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <ChatHeader
        pin={pin || ""}
        userCount={userCount}
        isConnected={isConnected}
        onLeave={handleLeave}
      />

      {sendProgress && (
        <div className="border-b border-border bg-surface px-4 py-2 space-y-1.5">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="truncate max-w-[200px]">Sending: {sendProgress.fileName}</span>
              <span>
                {sendProgress.sent === 0 ? "Uploading..." : `${Math.round((sendProgress.sent / sendProgress.total) * 100)}%`}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden">
              {sendProgress.sent === 0 ? (
                <div className="h-full w-1/3 rounded-full bg-foreground animate-pulse" />
              ) : (
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-150"
                  style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <ChatWindow messages={messages} currentUserId="self" userCount={userCount} />
      <MessageInput
        onSendMessage={sendMessage}
        onSendFile={sendFile}
        disabled={!isConnected || isSending}
      />

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Leave chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You'll be disconnected from the room. Chat history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-elevated">
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatPage;
