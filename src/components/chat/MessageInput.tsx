import { useState, useRef, useCallback, KeyboardEvent, DragEvent } from "react";
import { Paperclip, Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (text: string) => void | Promise<void>;
  onSendFile: (file: File) => void | Promise<void>;
  disabled: boolean;
  /** When true only file attachment is blocked — text chat stays enabled */
  disableFileOnly?: boolean;
}

const MAX_ROWS = 5;
const LINE_HEIGHT = 24;

const MessageInput = ({ onSendMessage, onSendFile, disabled, disableFileOnly }: MessageInputProps) => {
  const [text, setText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fileDisabled = disabled || !!disableFileOnly;

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text);
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS * LINE_HEIGHT)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !fileDisabled) {
      onSendFile(file);
      e.target.value = "";
    }
  };

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!fileDisabled) setIsDragging(true);
    },
    [fileDisabled],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (fileDisabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onSendFile(file);
    },
    [fileDisabled, onSendFile],
  );

  return (
    <div
      className="relative border-t border-border bg-surface px-4 py-3"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-foreground/30 bg-elevated/80">
          <span className="text-sm text-muted-foreground">Drop file to send</span>
        </div>
      )}
      <div className="mx-auto flex max-w-2xl items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={fileDisabled}
          aria-label="Attach file"
          className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          ref={textareaRef}
          placeholder="Type a message..."
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-border bg-elevated px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-foreground/30 disabled:opacity-50"
          style={{ lineHeight: `${LINE_HEIGHT}px`, maxHeight: MAX_ROWS * LINE_HEIGHT }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          aria-label="Send message"
          className="rounded-lg bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
