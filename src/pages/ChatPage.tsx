import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { usePeer } from "@/hooks/usePeer";
import { clearGuestSession } from "@/lib/peerConfig";
import { useChat } from "@/hooks/useChat";
import { useFileTransfer } from "@/hooks/useFileTransfer";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatWindow from "@/components/chat/ChatWindow";
import MessageInput from "@/components/chat/MessageInput";
import type { FileMessage } from "@/lib/messageSchema";
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

  const onDataRef = useRef<(data: any, from: string) => void>(() => {});

  const { isConnected, isDisconnected, error, userCount, userId, send, disconnect } = usePeer({
    pin: pin || "",
    isHost,
    onData: (data, from) => onDataRef.current(data, from),
  });

  const { messages, fileTransfers, sendMessage, handleIncomingData, cleanup } = useChat({
    userId,
    sendToPeers: send,
  });

  onDataRef.current = handleIncomingData;

  const { sendFile, sendProgress, isSending, error: fileError } = useFileTransfer({
    userId,
    sendToPeers: send,
    addLocalFileMessage: (file: File, objectUrl: string) => {
      const fileMsg: FileMessage = {
        type: "file-message",
        id: crypto.randomUUID(),
        senderId: "self",
        senderLabel: userId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        objectUrl,
        timestamp: Date.now(),
      };
      handleIncomingData(fileMsg, "self");
    },
  });

  useEffect(() => {
    if (fileError) {
      toast.error(fileError);
    }
  }, [fileError]);

  useEffect(() => {
    // Only warn about signaling drops once the user is already in the chat room.
    // During initial connection this fires before the DataConnection is open
    // and just confuses the user — the reconnect is automatic and silent.
    if (isDisconnected && isConnected) {
      toast.warning("Signaling server disconnected. Existing connections still work.");
    }
  }, [isDisconnected, isConnected]);

  useEffect(() => {
    return () => {
      cleanup();
      disconnect();
    };
  }, [cleanup, disconnect]);

  const handleLeave = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeave = () => {
    setShowLeaveDialog(false);
    // Clear persisted identity so re-joining this room generates a fresh peer ID
    if (pin && !isHost) clearGuestSession(pin);
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

      {/* File transfer progress bars */}
      {(sendProgress || fileTransfers.size > 0) && (
        <div className="border-b border-border bg-surface px-4 py-2 space-y-1.5">
          {sendProgress && (
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="truncate max-w-[200px]">Sending: {sendProgress.fileName}</span>
                <span>{Math.round((sendProgress.sent / sendProgress.total) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-150"
                  style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          {Array.from(fileTransfers.entries()).map(([fileId, progress]) => (
            <div key={fileId} className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="truncate max-w-[200px]">Receiving: {progress.fileName}</span>
                <span>{Math.round((progress.received / progress.totalChunks) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground/60 transition-all duration-150"
                  style={{ width: `${(progress.received / progress.totalChunks) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <ChatWindow messages={messages} currentUserId="self" />
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
