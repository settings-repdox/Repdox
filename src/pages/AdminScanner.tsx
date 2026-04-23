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
  const [scanStatus, setScanStatus] = useState<string>("Ready to scan");
  const [scanColor, setScanColor] = useState<string>("border-purple-500");
  const [lastCheckedName, setLastCheckedName] = useState<string | null>(null);
  const [isDetected, setIsDetected] = useState(false);
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

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn("Could not play beep:", e);
    }
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
    setProcessing(true);
    setScanStatus("Processing...");
    setScanColor("border-yellow-500");

    try {
      let user_id, event_id, registration_id;

      if (qrData.includes('|')) {
        // Fallback for userid|eventid|regid format
        const parts = qrData.split('|');
        user_id = parts[0];
        event_id = parts[1];
        registration_id = parts[2];
      } else if (qrData.startsWith('{')) {
        // Fallback for old JSON format
        try {
          const parsed = JSON.parse(qrData);
          user_id = parsed.user_id;
          event_id = parsed.event_id;
          registration_id = parsed.registration_id;
        } catch (e) {
          registration_id = qrData;
        }
      } else {
        // NEW format: Raw Registration ID
        registration_id = qrData.trim();
      }

      if (!registration_id) throw new Error("Invalid QR format");

      // 1. Get Event Details
      // Priority: 1. event_id from QR, 2. selectedEventId from dropdown
      const targetEventId = (event_id && event_id !== 'null') ? event_id : selectedEventId;
      
      if (!targetEventId) throw new Error("Please select an event in the scanner first.");

      const { data: eventData, error: eventErr } = await supabase
        .from("events")
        .select("slug, id, title, check_in_start, check_in_end")
        .eq("id", targetEventId)
        .single();

      if (eventErr || !eventData) throw new Error("Event not found");

      const { data: adminUser } = await supabase.auth.getUser();
      const isMainAdmin = ADMIN_EMAILS.includes(adminUser?.user?.email?.toLowerCase() || "");

      if (!isMainAdmin) {
        const now = Date.now();
        if (eventData.check_in_start && now < new Date(eventData.check_in_start).getTime()) {
          throw new Error(`Too early. Opens at ${new Date(eventData.check_in_start).toLocaleTimeString()}`);
        }
        if (eventData.check_in_end && now > new Date(eventData.check_in_end).getTime()) {
          throw new Error("Check-in is closed.");
        }
      }

      const baseSlug = eventData.slug?.toLowerCase().replace(/-/g, "_") || "";
      const tableName = `event_reg_${baseSlug}`;
      
      // Also try a simplified version if the slug has a year (e.g. solveforindia2026 -> solveforindia)
      const simplifiedName = `event_reg_${baseSlug.replace(/\d+$/, "")}`;

      let updateErr;
      let updatedReg;

      // Try primary table first
      const attemptUpdate = async (tName: string) => {
        return supabase
          .from(tName as any)
          .update({
            check_in_status: "checked_in",
            checked_in_at: new Date().toISOString(),
            checked_in_by: adminUser?.user?.email || "Admin"
          })
          .eq("registration_id", registration_id)
          .select("name")
          .single();
      };

      const result = await attemptUpdate(tableName);
      updatedReg = result.data;
      updateErr = result.error;

      // If failed and simplified name is different, try that
      if (updateErr && tableName !== simplifiedName) {
        const result2 = await attemptUpdate(simplifiedName);
        if (!result2.error) {
          updatedReg = result2.data;
          updateErr = null;
        }
      }

      if (updateErr) throw new Error(`ID not found in ${tableName} or ${simplifiedName}`);
      
      const reg = updatedReg as any;

      playBeep();
      setLastCheckedName(reg.name);
      setScanStatus(`Success: ${reg.name} checked in!`);
      setScanColor("border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]");
      toast.success(`Checked in ${reg.name}`);
      setLastScanned(qrData);
      setTimeout(() => {
        setLastScanned(null);
        setScanStatus("Ready to scan");
        setScanColor("border-purple-500");
      }, 5000);

    } catch (err: any) {
      setScanStatus(`Error: ${err.message}`);
      setScanColor("border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]");
      toast.error(err.message);
      setLastScanned(qrData);
      setTimeout(() => {
        setLastScanned(null);
        setScanStatus("Ready to scan");
        setScanColor("border-purple-500");
      }, 3000);
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

      const reg = updatedReg as any;
      toast.success(`Successfully checked in ${reg.name}!`, {
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      
      if (ctx) {
        // Boost contrast and brightness to help jsQR read through screen glare
        ctx.filter = 'contrast(1.4) brightness(1.1)';
        
        // SMART CROP: Focus on the center 70% of the frame to increase resolution for jsQR
        const size = Math.min(video.videoWidth, video.videoHeight) * 0.8;
        const x = (video.videoWidth - size) / 2;
        const y = (video.videoHeight - size) / 2;
        
        canvas.width = size;
        canvas.height = size;
        
        ctx.drawImage(video, x, y, size, size, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (code) {
          // Visual feedback that SOMETHING was detected
          setIsDetected(true);
          setTimeout(() => setIsDetected(false), 200);
          
          console.log("QR Code Detected:", code.data);
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
        <div className="text-center space-y-2 relative">
          {scanning && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Scanner Active</span>
            </div>
          )}
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
        <div className={`relative rounded-3xl overflow-hidden shadow-2xl border-4 bg-zinc-950 transition-all duration-300 ${
          isDetected ? 'border-blue-500 scale-[1.02]' : scanColor
        }`}>
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
                
                {/* Moving Laser Line */}
                <div className="absolute inset-x-[60px] top-[60px] h-0.5 bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-[scan_2s_linear_infinite]" />
                
                <style>{`
                  @keyframes scan {
                    0%, 100% { top: 60px; opacity: 0.8; }
                    50% { top: calc(100% - 60px); opacity: 1; }
                  }
                `}</style>
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
                <span className="font-bold text-lg tracking-wide">Verifying...</span>
              </div>
            </div>
          )}
        </div>

        {/* Live Status Message */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3 ${
          scanColor.includes('green') ? 'bg-green-500/10 border-green-500/20 text-green-400' :
          scanColor.includes('red') ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          scanColor.includes('yellow') ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
          'bg-zinc-900 border-white/5 text-gray-400'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            scanColor.includes('green') ? 'bg-green-500' :
            scanColor.includes('red') ? 'bg-red-500' :
            scanColor.includes('yellow') ? 'bg-yellow-500' :
            'bg-purple-500'
          }`} />
          <span className="font-medium text-sm tracking-wide uppercase">{scanStatus}</span>
        </div>

        {/* Prominent Success Card */}
        {lastCheckedName && (
          <div className="bg-green-500/20 border border-green-500/50 p-6 rounded-3xl flex flex-col items-center gap-2 animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
              <CheckCircle className="text-white w-7 h-7" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-400 mt-2">Recently Checked In</p>
            <h2 className="text-2xl font-bold text-white text-center">{lastCheckedName}</h2>
          </div>
        )}

        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-bold">Secure Admin Console</p>
        </div>
      </div>
    </div>
  );
}
