import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import EventCard from "@/components/EventCard";
import EventFilters from "@/components/EventFilters";

export default function EventsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get filters from URL or defaults
  const searchQuery = searchParams.get('search') || '';
  const selectedType = searchParams.get('type') || 'all';
  const selectedFormat = searchParams.get('format') || 'all';

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_at', { ascending: true });
      
      if (error) throw error;
      
      const parsedEvents = (data || []).map(event => ({
        ...event,
        type: event.type as string | string[],
        format: event.format as string | string[],
      }));

      const now = new Date();
      const futureEvents = parsedEvents.filter(e => new Date(e.end_at) >= now);
      const pastEvents = parsedEvents.filter(e => new Date(e.end_at) < now);

      futureEvents.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
      pastEvents.sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime());

      return [...futureEvents, ...pastEvents];
    },
  });

  // Filter events client-side
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === 'all' || 
      (Array.isArray(event.type) ? event.type.includes(selectedType) : event.type === selectedType);
    const matchesFormat = selectedFormat === 'all' || 
      (Array.isArray(event.format) ? event.format.includes(selectedFormat) : event.format === selectedFormat);
    
    return matchesSearch && matchesType && matchesFormat;
  });

  // Update URL params
  const updateSearchParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === '' || value === 'all') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  const activeFiltersCount = 
    (searchQuery ? 1 : 0) + 
    (selectedType !== 'all' ? 1 : 0) + 
    (selectedFormat !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setSearchParams({});
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-accent/10 to-background border-b border-border/50">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-7xl font-bold text-foreground mb-4">
              All Events
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Discover hackathons, workshops, MUNs, and gaming tournaments. Find your next challenge.
            </p>
              <div className="mt-6 flex justify-center md:justify-center">
                <Link to="/events/new">
                  <Button className="mr-3">Create Event</Button>
                </Link>
              </div>
          </motion.div>
        </div>
      </section>

      {/* Filters & Events */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <EventFilters
            searchQuery={searchQuery}
            onSearchChange={(value) => updateSearchParams('search', value)}
            selectedType={selectedType}
            onTypeChange={(value) => updateSearchParams('type', value)}
            selectedFormat={selectedFormat}
            onFormatChange={(value) => updateSearchParams('format', value)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={clearFilters}
          />

          {/* Events Grid/List */}
          <div className="mt-8">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-64 bg-muted rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground">
                  No events match your filters. Try adjusting the date or type.
                </p>
              </div>
            ) : (
              <motion.div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-6'
                }
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {filteredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                  >
                    <EventCard event={event} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      
    </div>
  );
}
