import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { generatePin } from "@/lib/generatePin";
import { Shield, Zap, Ghost } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    const pin = generatePin();
    navigate(`/chat/${pin}?host=true`);
  };

  const handleJoin = () => {
    navigate("/join");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-5xl font-light tracking-tight text-foreground">
            PeerChat
          </h1>
          <p className="text-sm text-muted-foreground">
            Private. Instant. Gone.
          </p>
        </div>

        <div className="flex gap-4">
          <Button variant="hero" onClick={handleStart}>
            Start
          </Button>
          <Button variant="hero-ghost" onClick={handleJoin}>
            Join
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          No accounts. No storage. No trace.
        </p>

        <div className="mt-8 flex gap-8 text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="text-xs">Encrypted</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Zap className="h-5 w-5" />
            <span className="text-xs">Peer-to-Peer</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Ghost className="h-5 w-5" />
            <span className="text-xs">Ephemeral</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
