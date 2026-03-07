import type { ReactNode } from "react";
import type { DisplayMessage, FileMessage } from "@/lib/messageSchema";
import FilePreview from "@/components/chat/FilePreview";
import { Download } from "lucide-react";

interface MessageBubbleProps {
  message: DisplayMessage;
  currentUserId: string;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const URL_REGEX = /https?:\/\/[^\s<>]+/g;

function renderTextWithLinks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(URL_REGEX);
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-foreground break-all"
      >
        {url}
      </a>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

const MessageBubble = ({ message, currentUserId }: MessageBubbleProps) => {
  if (message.type === "system") {
    return (
      <div className="flex justify-center py-1 animate-fade-in">
        <span className="text-xs text-system-text">{message.content}</span>
      </div>
    );
  }

  if (message.type === "file-message") {
    const fileMsg = message as FileMessage;
    const isOwn = fileMsg.senderId === currentUserId;
    const isImage = fileMsg.mimeType.startsWith("image/");
    const isVideo = fileMsg.mimeType.startsWith("video/");
    const isAudio = fileMsg.mimeType.startsWith("audio/");

    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-fade-in`}>
        <div className={`max-w-[75%] rounded-xl px-4 py-3 ${isOwn ? "bg-own-bubble" : "bg-their-bubble"}`}>
          {!isOwn && (
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {fileMsg.senderLabel}
            </p>
          )}
          {(isImage || isVideo || isAudio) && (
            <FilePreview mimeType={fileMsg.mimeType} objectUrl={fileMsg.objectUrl} fileName={fileMsg.fileName} />
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">📄 {fileMsg.fileName}</span>
            <span className="text-xs text-system-text">{formatFileSize(fileMsg.fileSize)}</span>
            <a
              href={fileMsg.objectUrl}
              download={fileMsg.fileName}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="mt-1 text-right text-[0.65rem] text-system-text">
            {formatTime(fileMsg.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  const isOwn = message.senderId === currentUserId;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-fade-in`}>
      <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isOwn ? "bg-own-bubble" : "bg-their-bubble"}`}>
        {!isOwn && (
          <p className="mb-0.5 text-xs font-medium text-muted-foreground">
            {message.senderLabel}
          </p>
        )}
        <p className="text-sm text-foreground">{renderTextWithLinks(message.content)}</p>
        <p className="mt-1 text-right text-[0.65rem] text-system-text">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
