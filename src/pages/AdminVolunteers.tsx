import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getVolunteerApplications, 
  updateVolunteerStatus, 
  isUserAdmin 
} from "@/lib/adminService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Users, 
  Mail, 
  Phone, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck,
  Calendar,
  MessageSquare,
  Sparkles,
  Video,
  Clock,
  ExternalLink
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/timeUtils";

export default function AdminVolunteers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin status on mount
  useEffect(() => {
    isUserAdmin().then(setIsAdmin);
  }, []);

  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [interviewTime, setInterviewTime] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: applications = [], isLoading, isError, error } = useQuery({
    queryKey: ["volunteer-applications"],
    enabled: isAdmin === true,
    queryFn: getVolunteerApplications,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, time, link }: { id: string; status: string; time?: string; link?: string }) => 
      updateVolunteerStatus(id, status, time, link),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["volunteer-applications"] });
      setIsDialogOpen(false);
      setSelectedApp(null);
      toast({
        title: `Status Updated`,
        description: `Application status changed to ${variables.status.toUpperCase()}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have administrative privileges to access this page.</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (isAdmin === null || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
          <p className="text-muted-foreground italic">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-600 font-bold tracking-wider uppercase text-xs">
              <ShieldCheck className="w-4 h-4" />
              Admin Portal
            </div>
            <h1 className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Join Us Applications
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Manage volunteer applications. Review details, schedule interviews, or approve/reject candidates.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </header>

        {applications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 bg-card/30 border-2 border-dashed border-border rounded-3xl"
          >
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">No applications yet</h2>
            <p className="text-muted-foreground mt-2">When users apply to join, they will appear here.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
              {applications.map((app: any) => (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <Card className="h-full border-border/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <CardHeader className="bg-muted/5 border-b border-border/50">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-xl font-bold">{app.full_name}</CardTitle>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" /> {app.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" /> {app.phone}
                            </span>
                          </div>
                        </div>
                        <Badge className={`
                          ${app.status === 'approved' ? 'bg-emerald-500' : 
                            app.status === 'interview' ? 'bg-blue-500' :
                            app.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'} 
                          text-white font-bold
                        `}>
                          {app.status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Preferred Role
                          </div>
                          <p className="text-sm font-medium">{app.role_preference}</p>
                        </div>
                        <div className="space-y-1.5">
                          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Applied On
                          </div>
                          <p className="text-sm font-medium">{formatDate(app.created_at)}</p>
                        </div>
                      </div>

                      {app.status === 'interview' && (
                        <div className="grid gap-4 md:grid-cols-2 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                          <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-blue-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Interview Time
                            </div>
                            <p className="text-sm font-bold">
                              {app.interview_time ? new Date(app.interview_time).toLocaleString() : 'Not set'}
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-blue-500 flex items-center gap-1">
                              <Video className="w-3 h-3" /> Meet Link
                            </div>
                            {app.meet_link ? (
                              <a 
                                href={app.meet_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Open Link <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-muted-foreground italic">Not set</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Motivation
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed bg-accent/30 p-4 rounded-xl italic">
                          "{app.motivation}"
                        </p>
                      </div>
                    </CardContent>

                    <CardFooter className="grid grid-cols-3 gap-3 p-4 bg-muted/5 border-t border-border/10">
                      <Button 
                        onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'rejected' })}
                        disabled={updateStatusMutation.isPending}
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-xl"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                      <Button 
                        onClick={() => {
                          setSelectedApp(app);
                          setInterviewTime(app.interview_time || "");
                          setMeetLink(app.meet_link || "");
                          setIsDialogOpen(true);
                        }}
                        disabled={updateStatusMutation.isPending}
                        variant="outline"
                        className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10 rounded-xl"
                      >
                        <Calendar className="w-4 h-4 mr-2" /> Interview
                      </Button>
                      <Button 
                        onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'approved' })}
                        disabled={updateStatusMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Interview Scheduling Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0e0c1e] text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Schedule Interview</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set the interview time and provide a meet link for {selectedApp?.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-bold text-purple-400">Date & Time</Label>
              <Input
                id="time"
                type="datetime-local"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-purple-500 h-12 rounded-xl text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link" className="text-sm font-bold text-cyan-400">Meeting Link (Google Meet/Zoom)</Label>
              <Input
                id="link"
                placeholder="https://meet.google.com/..."
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-cyan-500 h-12 rounded-xl text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setIsDialogOpen(false)}
              className="text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => updateStatusMutation.mutate({ 
                id: selectedApp.id, 
                status: 'interview', 
                time: interviewTime, 
                link: meetLink 
              })}
              disabled={updateStatusMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 font-bold px-8 rounded-xl"
            >
              {updateStatusMutation.isPending ? "Scheduling..." : "Save & Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
