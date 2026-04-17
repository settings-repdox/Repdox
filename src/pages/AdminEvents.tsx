import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  getPendingEvents, 
  approveEvent, 
  rejectEvent, 
  isUserAdmin 
} from "@/lib/adminService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Calendar, MapPin, CheckCircle, XCircle, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/timeUtils";
import { getEventImage } from "@/lib/eventImages";

export default function AdminEvents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin status on mount
  useEffect(() => {
    isUserAdmin().then(setIsAdmin);
  }, []);

  const { data: pendingEvents = [], isLoading, isError, error } = useQuery({
    queryKey: ["pending-events"],
    enabled: isAdmin === true,
    queryFn: getPendingEvents,
  });

  const approveMutation = useMutation({
    mutationFn: approveEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-events"] });
      toast({
        title: "Event Approved",
        description: "The event is now live on the platform.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-events"] });
      toast({
        title: "Event Rejected",
        description: "The event has been removed.",
        variant: "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
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

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 bg-red-500/10 p-12 rounded-3xl border border-red-500/20 max-w-lg">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-3xl font-bold">Error Fetching Events</h1>
          <p className="text-muted-foreground">{(error as any)?.message || "An unknown error occurred while fetching pending events."}</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 shadow-inner">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-600 font-bold tracking-wider uppercase text-xs">
              <ShieldCheck className="w-4 h-4" />
              Admin Portal
            </div>
            <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Pending Approval
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Review and approve new event submissions. Only approved events are visible to the public.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </header>

        {pendingEvents.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 bg-card/30 border-2 border-dashed border-border rounded-3xl"
          >
            <CheckCircle className="w-16 h-16 text-green-500/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">All caught up!</h2>
            <p className="text-muted-foreground mt-2">No events are currently awaiting approval.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pendingEvents.map((event) => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="h-full flex flex-col overflow-hidden border-border/50 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={getEventImage(event.image_url) || event.image_url || "/placeholder.png"}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-yellow-500 text-white font-bold px-3 py-1 shadow-lg">
                        PENDING REVIEW
                      </Badge>
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-2xl font-bold line-clamp-1">{event.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-4 h-4" />
                        {formatDate(event.start_at)}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3 italic">
                      {event.short_blurb || "No description provided."}
                    </p>
                  </CardContent>

                  <CardFooter className="grid grid-cols-2 gap-4 p-6 pt-2 border-t border-border/10 bg-muted/5">
                    <Button 
                      onClick={() => rejectMutation.mutate(event.id)}
                      disabled={rejectMutation.isPending}
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-xl h-12"
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button 
                      onClick={() => approveMutation.mutate(event.id)}
                      disabled={approveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
