import { useState, useRef, KeyboardEvent, ClipboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PIN_LENGTH } from "@/lib/peerConfig";

const JoinPage = () => {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (pasted.length === PIN_LENGTH) {
      setDigits(pasted.split(""));
      inputRefs.current[PIN_LENGTH - 1]?.focus();
    }
  };

  const handleJoin = () => {
    const pin = digits.join("");
    if (pin.length === PIN_LENGTH) {
      navigate(`/chat/${pin}?host=false`);
    }
  };

  const isComplete = digits.every((d) => d !== "");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 animate-fade-in">
        <button
          onClick={() => navigate("/")}
          className="self-start flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h2 className="text-2xl font-light text-foreground">Enter Room PIN</h2>

        <div className="flex gap-3">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="h-14 w-11 rounded-lg border border-border bg-surface text-center font-mono text-2xl font-semibold text-foreground outline-none transition-colors focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          ))}
        </div>

        <Button variant="hero" className="w-full" onClick={handleJoin} disabled={!isComplete}>
          Join Room
        </Button>
      </div>
    </div>
  );
};

export default JoinPage;
