import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Globe, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function DiscordLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"verifying" | "ready" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);
  const [discordUser, setDiscordUser] = useState<{ id: string, username: string } | null>(null);
  const [repdoxUser, setRepdoxUser] = useState<any>(null);

  useEffect(() => {
    async function verifyLink() {
      if (!token) {
        setStatus("error");
        setError("Missing linking token.");
        return;
      }

      // 1. Get Discord Request info
      const { data: request, error: reqError } = await supabase
        .from("discord_link_requests")
        .select("*")
        .eq("token", token)
        .single();

      if (reqError || !request) {
        setStatus("error");
        setError("Invalid or expired linking token.");
        return;
      }

      // Check expiry
      if (new Date(request.expires_at) < new Date()) {
        setStatus("error");
        setError("Linking token has expired. Please try /link again in Discord.");
        return;
      }

      setDiscordUser({ id: request.discord_id, username: request.discord_username });

      // 2. Check Repdox Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus("ready");
        setRepdoxUser(null);
        return;
      }

      setRepdoxUser(user);
      setStatus("ready");
    }

    verifyLink();
  }, [token]);

  const handleLink = async () => {
    if (!repdoxUser || !discordUser || !token) return;

    setStatus("verifying");
    try {
      // 1. Update Profile
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          discord_id: discordUser.id,
          discord_username: discordUser.username
        })
        .eq("user_id", repdoxUser.id);

      if (updateError) throw updateError;

      // 2. Clean up request
      await supabase
        .from("discord_link_requests")
        .delete()
        .eq("token", token);

      setStatus("success");
      toast({
        title: "Account Linked!",
        description: `Your Repdox account is now linked to Discord user ${discordUser.username}.`,
      });
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("Failed to complete the linking process.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        class="max-w-md w-full bg-card border border-border/50 p-8 rounded-3xl shadow-2xl space-y-8"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-[#5865F2]/10 flex items-center justify-center">
            <Globe className="w-10 h-10 text-[#5865F2]" />
          </div>
        </div>

        {status === "verifying" && (
          <div className="space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Verifying Linking Request...</h2>
          </div>
        )}

        {status === "ready" && discordUser && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold italic">Link Discord Account</h2>
            <div className="p-4 bg-muted/50 rounded-2xl text-left border border-border">
              <p className="text-sm text-muted-foreground mb-1">Repdox Account:</p>
              <p className="font-bold text-foreground truncate">{repdoxUser?.email || "Guest"}</p>
              
              <div className="my-4 border-t border-border border-dashed" />
              
              <p className="text-sm text-muted-foreground mb-1">Discord Account:</p>
              <p className="font-bold text-[#5865F2]">{discordUser.username}</p>
            </div>

            {repdoxUser ? (
              <Button 
                onClick={handleLink}
                className="w-full h-14 text-lg font-bold bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-2xl shadow-lg shadow-[#5865F2]/20"
              >
                Confirm Automatic Link
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-yellow-500 font-medium">Please sign in to your Repdox account first.</p>
                <Button 
                  onClick={() => navigate(`/signin?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
                  className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-white/90 rounded-2xl"
                >
                  Sign In to Repdox
                </Button>
              </div>
            )}
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-black">Linked!</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can now close this window and go back to Discord. 
              Use <code className="bg-muted px-2 py-0.5 rounded">/sync</code> in the server to get your roles.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="w-full h-12 rounded-xl"
            >
              Go to Home
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold italic">Link Failed</h2>
            <p className="text-red-500/80 font-medium">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="w-full h-12 rounded-xl"
            >
              Back to Safety
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
