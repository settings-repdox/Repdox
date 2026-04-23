import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Camera, Loader2 } from "lucide-react";
import { isUserAdmin, ADMIN_EMAILS } from "@/lib/adminService";
import { useNavigate } from "react-router-dom";

export default function AdminScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    isUserAdmin().then((admin) => {
      setIsAdmin(admin);
      if (!admin) {
        toast.error("Unauthorized. You must be an admin to access the scanner.");
        navigate("/");
      }
    });
  }, [navigate]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
        videoRef.current.play();
        setHasPermission(true);
        setScanning(true);
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasPermission(false);
      toast.error("Camera access denied. Please grant permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      setScanning(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      startCamera();
    }
    return () => stopCamera();
  }, [isAdmin]);

  const processScan = async (qrData: string) => {
    if (processing || qrData === lastScanned) return;
    setProcessing(true);

    try {
      const parsed = JSON.parse(qrData);
      const { user_id, event_id, registration_id } = parsed;

      if (!user_id || !event_id || !registration_id) {
        throw new Error("Invalid QR code format.");
      }

      // 1. Get Event Details to know which table to query and check time restrictions
      const { data: eventData, error: eventErr } = await supabase
        .from("events")
        .select("slug, id, check_in_start, check_in_end")
        .eq("id", event_id)
        .single();

      if (eventErr || !eventData) {
        throw new Error("Event not found in database.");
      }

      const { data: adminUser } = await supabase.auth.getUser();
      const adminEmail = adminUser?.user?.email?.toLowerCase() || "";
      const isMainAdmin = ADMIN_EMAILS.includes(adminEmail);

      // Check time window if not a main admin
      if (!isMainAdmin) {
        const nowMs = Date.now();
        if (eventData.check_in_start) {
          const startMs = new Date(eventData.check_in_start).getTime();
          if (nowMs < startMs) throw new Error("Check-in hasn't started yet for this event.");
        }
        if (eventData.check_in_end) {
          const endMs = new Date(eventData.check_in_end).getTime();
          if (nowMs > endMs) throw new Error("Check-in is closed for this event.");
        }
      }

      const tableName = eventData.slug 
        ? `event_reg_${eventData.slug.toLowerCase().replace(/-/g, "_")}`
        : `event_reg_${eventData.id.replace(/-/g, "_")}`;

      // 2. Update Check-in Status
      const checkedInBy = adminEmail || "Admin";

      const { data: updatedReg, error: updateErr } = await supabase
        .from(tableName as any)
        .update({
          check_in_status: "checked_in",
          checked_in_at: new Date().toISOString(),
          checked_in_by: checkedInBy
        })
        .eq("registration_id", registration_id)
        .select("name, check_in_status")
        .single();

      if (updateErr) {
        if (updateErr.code === 'PGRST116') {
           throw new Error("Registration ID not found for this event.");
        }
        throw new Error("Failed to update check-in status.");
      }

      toast.success(`Successfully checked in ${updatedReg.name}!`, {
        icon: <CheckCircle className="text-green-500" />
      });
      
      setLastScanned(qrData);
      
      // Reset last scanned after a few seconds so they can scan it again if needed
      setTimeout(() => setLastScanned(null), 5000);

    } catch (err: any) {
      toast.error(err.message || "Failed to process QR code", {
        icon: <XCircle className="text-red-500" />
      });
      setLastScanned(qrData);
      setTimeout(() => setLastScanned(null), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      canvasRef.current.height = videoRef.current.videoHeight;
      canvasRef.current.width = videoRef.current.videoWidth;
      const ctx = canvasRef.current.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          processScan(code.data);
        }
      }
    }
    
    if (scanning) {
      requestAnimationFrame(tick);
    }
  };

  if (isAdmin === null) return null;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 mt-16 max-w-md mx-auto">
      <div className="w-full text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Event Scanner</h1>
        <p className="text-muted-foreground">Point your camera at a participant's QR code to check them in.</p>
      </div>

      <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/30">
        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-zinc-900">
            <Camera size={48} className="mb-4 opacity-50" />
            <p>Camera access denied. Please enable camera permissions in your browser settings to use the scanner.</p>
          </div>
        )}

        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanner overlay UI */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-[40px] border-black/40" />
          <div className="absolute inset-x-[40px] inset-y-[40px] border-2 border-white/50" />
          {/* Corner brackets */}
          <div className="absolute top-[30px] left-[30px] w-8 h-8 border-t-4 border-l-4 border-purple-500" />
          <div className="absolute top-[30px] right-[30px] w-8 h-8 border-t-4 border-r-4 border-purple-500" />
          <div className="absolute bottom-[30px] left-[30px] w-8 h-8 border-b-4 border-l-4 border-purple-500" />
          <div className="absolute bottom-[30px] right-[30px] w-8 h-8 border-b-4 border-r-4 border-purple-500" />
        </div>

        {processing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-background/90 p-4 rounded-xl flex items-center gap-3">
              <Loader2 className="animate-spin text-purple-500" />
              <span className="font-semibold">Verifying ticket...</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Secure check-in powered by Repdox.
      </div>
    </div>
  );
}
