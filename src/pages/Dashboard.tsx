import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Bookmark, FileText, Users, 
  GripVertical, Eye, EyeOff, Plus
} from 'lucide-react';

interface DashboardSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
  order: number;
  component: React.ReactNode;
}

interface DashboardProps {
  embeddedUser?: User | null;
  userEvents?: any[];
}

export default function Dashboard({ embeddedUser, userEvents = [] }: DashboardProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(embeddedUser ?? null);
  const [sections, setSections] = useState<DashboardSection[]>([]);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (embeddedUser) {
        // embedded in profile, user already passed in
        return;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate('/signin');
        return;
      }
      setUser(currentUser);
    };
    init();
  }, [navigate, embeddedUser]);

  useEffect(() => {
    loadDashboardPreferences();
  }, [userEvents]);

  const loadDashboardPreferences = () => {
    try {
      const stored = localStorage.getItem('dashboardPreferences');
      const prefs = stored ? JSON.parse(stored) : null;
      
      const defaultSections: DashboardSection[] = [
        { id: 'upcoming', title: 'Upcoming Events', icon: Calendar, visible: true, order: 0, component: <UpcomingEvents events={userEvents} /> },
        { id: 'joined', title: 'Events Joined', icon: Users, visible: true, order: 1, component: <JoinedEvents events={userEvents} /> },
        { id: 'saved', title: 'Saved Events', icon: Bookmark, visible: true, order: 2, component: <SavedEvents /> },
        { id: 'drafts', title: 'Draft Events', icon: FileText, visible: true, order: 3, component: <DraftEvents /> }
      ];

      if (prefs) {
        type Pref = { id: string; visible: boolean; order: number };
        const merged = defaultSections.map(section => {
          const pref = (prefs as Pref[]).find((p) => p.id === section.id);
          // Re-attach component from defaultSections
          const base = defaultSections.find(s => s.id === section.id);
          return pref ? { ...section, visible: pref.visible, order: pref.order, component: base?.component } : section;
        });
        setSections(merged.sort((a, b) => a.order - b.order));
      } else {
        setSections(defaultSections);
      }
    } catch (err) {
      console.error('Error loading dashboard preferences:', err);
    }
  };

  const saveDashboardPreferences = (newSections: DashboardSection[]) => {
    try {
      const prefs = newSections.map(s => ({ id: s.id, visible: s.visible, order: s.order }));
      localStorage.setItem('dashboardPreferences', JSON.stringify(prefs));
    } catch (err) {
      console.error('Error saving dashboard preferences:', err);
    }
  };

  const toggleVisibility = (id: string) => {
    const updated = sections.map(s => 
      s.id === id ? { ...s, visible: !s.visible } : s
    );
    setSections(updated);
    saveDashboardPreferences(updated);
  };

  const handleDragStart = (id: string) => {
    setDraggedSection(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === id) return;

    const draggedIndex = sections.findIndex(s => s.id === draggedSection);
    const targetIndex = sections.findIndex(s => s.id === id);

    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, removed);
    
    const reordered = newSections.map((s, i) => ({ ...s, order: i }));
    setSections(reordered);
    saveDashboardPreferences(reordered);
  };

  const visibleSections = sections.filter(s => s.visible);

  return (
    <div className="bg-background py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="px-4 md:px-0">
            <h1 className="text-3xl md:text-5xl font-bold">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2">Your personal control center</p>
          </div>
          <Button onClick={() => navigate('/events')}>
            <Plus className="w-4 h-4 mr-2" />
            Find Events
          </Button>
        </div>

        {/* Section Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Customize Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => toggleVisibility(section.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                      section.visible 
                        ? 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400' 
                        : 'bg-muted border-border opacity-60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{section.title}</span>
                    {section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Sections */}
        <div className="space-y-6">
          {visibleSections.map(section => (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(section.id)}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragEnd={() => setDraggedSection(null)}
              className={`transition ${draggedSection === section.id ? 'opacity-50' : ''}`}
            >
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {section.component}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventGrid({ events }: { events: any[] }) {
  const navigate = useNavigate();
  
  if (events.length === 0) {
    return <div className="text-sm text-muted-foreground py-4">No events found</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((reg) => {
        const event = reg.events;
        if (!event) return null;
        
        return (
          <div 
            key={reg.id}
            onClick={() => navigate(`/events/${event.slug}`)}
            className="group relative bg-card border border-border rounded-xl p-4 hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 flex-shrink-0">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground truncate group-hover:text-purple-500 transition-colors">
                  {event.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(event.start_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {reg.role || 'Participant'}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UpcomingEvents({ events = [] }: { events?: any[] }) {
  const upcoming = events.filter(reg => {
    if (!reg.events?.start_at) return false;
    return new Date(reg.events.start_at) > new Date();
  });

  return <EventGrid events={upcoming} />;
}

function JoinedEvents({ events = [] }: { events?: any[] }) {
  return <EventGrid events={events} />;
}

function SavedEvents() {
  return <div className="text-sm text-muted-foreground py-4">You haven't saved any events yet</div>;
}

function DraftEvents() {
  return <div className="text-sm text-muted-foreground py-4">No draft events found</div>;
}