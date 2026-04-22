import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 text-center px-6">
        <h1 
          className="text-[12rem] font-display font-bold leading-none mb-4 select-none opacity-20"
          style={{
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundImage: "linear-gradient(to bottom, hsl(var(--foreground)), transparent)",
          }}
        >
          404
        </h1>
        
        <div className="max-w-md mx-auto -mt-20">
          <h2 className="text-3xl font-display font-bold mb-4 text-foreground">
            Lost in the Nebula?
          </h2>
          <p className="text-muted-foreground text-lg mb-12">
            The coordinates for <span className="text-primary font-mono">{location.pathname}</span> don't exist in our current database.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto gap-2 border-foreground/20 hover:border-foreground/60"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            
            <Button 
              size="lg"
              onClick={() => navigate("/")}
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 shadow-glow-purple"
            >
              <Home className="w-4 h-4" />
              Return Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
