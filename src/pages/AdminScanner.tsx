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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [manualId, setManualId] = useState("");
  const [showManual, setShowManual] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
    fetchEvents();
  }, []);

  const checkAdmin = async () => {
    setIsAuthLoading(true);
    const admin = await isUserAdmin();
    setIsAdmin(admin);
    setIsAuthLoading(false);
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title, slug")
      .eq("is_active", true)
      .order("start_at", { ascending: false });
    
    if (data) {
      setEvents(data);
      if (data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    }
  };

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

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !manualId.trim()) {
      toast.error("Please select an event and enter a registration ID.");
      return;
    }

    setProcessing(true);
    try {
      // 1. Get Event Details
      const event = events.find(e => e.id === selectedEventId);
      if (!event) throw new Error("Event not found.");

      const { data: eventData, error: eventErr } = await supabase
        .from("events")
        .select("slug, id, check_in_start, check_in_end")
        .eq("id", selectedEventId)
        .single();

      if (eventErr || !eventData) throw new Error("Event data not found.");

      // Admin check
      const { data: adminUser } = await supabase.auth.getUser();
      const adminEmail = adminUser?.user?.email?.toLowerCase() || "";
      const isMainAdmin = ADMIN_EMAILS.includes(adminEmail);

      // Time window check
      if (!isMainAdmin) {
        const nowMs = Date.now();
        if (eventData.check_in_start) {
          const startMs = new Date(eventData.check_in_start).getTime();
          if (nowMs < startMs) throw new Error("Check-in hasn't started yet.");
        }
        if (eventData.check_in_end) {
          const endMs = new Date(eventData.check_in_end).getTime();
          if (nowMs > endMs) throw new Error("Check-in is closed.");
        }
      }

      const tableName = eventData.slug 
        ? `event_reg_${eventData.slug.toLowerCase().replace(/-/g, "_")}`
        : `event_reg_${eventData.id.replace(/-/g, "_")}`;

      const { data: updatedReg, error: updateErr } = await supabase
        .from(tableName as any)
        .update({
          check_in_status: "checked_in",
          checked_in_at: new Date().toISOString(),
          checked_in_by: adminEmail || "Admin"
        })
        .eq("registration_id", manualId.trim())
        .select("name")
        .single();

      if (updateErr) throw new Error("Invalid Registration ID for this event.");

      toast.success(`Successfully checked in ${updatedReg.name}!`, {
        icon: <CheckCircle className="text-green-500" />
      });
      setManualId("");
    } catch (err: any) {
      toast.error(err.message || "Check-in failed");
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-purple-500 w-12 h-12" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-md w-full bg-card/40 backdrop-blur-xl border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="text-red-500 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-8 text-lg">
            This scanner is reserved for authorized event organizers. Please sign in with an admin account to proceed.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => navigate("/signin")}
              className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-100 transition-colors shadow-lg"
            >
              Organiser Login
            </button>
            <button 
              onClick={() => navigate("/")}
              className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-6">
      <div className="max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Event Scanner</h1>
          <p className="text-gray-400">Scan QR codes or enter IDs manually</p>
        </div>

        {/* Event Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Current Event</label>
          <select 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 p-4 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
          >
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>

        {/* Mode Toggles */}
        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/5">
          <button 
            onClick={() => setShowManual(false)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${!showManual ? 'bg-zinc-800 text-white shadow-xl' : 'text-gray-500'}`}
          >
            QR Scanner
          </button>
          <button 
            onClick={() => setShowManual(true)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${showManual ? 'bg-zinc-800 text-white shadow-xl' : 'text-gray-500'}`}
          >
            Manual Entry
          </button>
        </div>

        {/* Main Interface */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/5 bg-zinc-950">
          {!showManual ? (
            <div className="relative aspect-[3/4]">
              {hasPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950">
                  <Camera size={48} className="mb-4 text-red-500" />
                  <p className="font-medium">Camera access denied.</p>
                  <p className="text-sm text-gray-500 mt-2">Please enable camera permissions to use the scanner.</p>
                </div>
              )}

              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-[60px] border-black/60" />
                <div className="absolute top-[50px] left-[50px] w-12 h-12 border-t-4 border-l-4 border-purple-500 rounded-tl-lg" />
                <div className="absolute top-[50px] right-[50px] w-12 h-12 border-t-4 border-r-4 border-purple-500 rounded-tr-lg" />
                <div className="absolute bottom-[50px] left-[50px] w-12 h-12 border-b-4 border-l-4 border-purple-500 rounded-bl-lg" />
                <div className="absolute bottom-[50px] right-[50px] w-12 h-12 border-b-4 border-r-4 border-purple-500 rounded-br-lg" />
                
                {/* Scanning animation line */}
                <div className="absolute inset-x-[60px] top-[60px] h-1 bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-bounce" />
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Enter the participant's Registration ID exactly as it appears on their pass.</p>
                <form onSubmit={handleManualCheckIn} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Reg ID</label>
                    <input 
                      type="text"
                      placeholder="e.g. REG-12A2E38C"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value.toUpperCase())}
                      className="w-full bg-zinc-900 border border-white/10 p-5 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none font-mono text-lg tracking-wider"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={processing}
                    className="w-full py-5 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-500 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
                  >
                    {processing ? <Loader2 className="animate-spin mx-auto" /> : "Check In Participant"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Global Processing Loader */}
          {processing && !showManual && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <span className="font-bold text-lg tracking-wide">Processing...</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-bold">Secure Admin Console</p>
        </div>
      </div>
    </div>
  );
}
