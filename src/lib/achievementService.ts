import { supabase } from "@/integrations/supabase/client";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'profile' | 'events' | 'social' | 'special';
  requirement: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
}

export const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>[] = [
  // Profile Achievements
  { id: 'profile_complete', title: 'Completionist', description: 'Complete 100% of your profile', icon: '✨', category: 'profile', requirement: 100 },
  { id: 'avatar_uploaded', title: 'Show Your Face', description: 'Upload a profile picture', icon: '📸', category: 'profile', requirement: 1 },
  { id: 'social_connected', title: 'Social Butterfly', description: 'Add 3 or more social links', icon: '🦋', category: 'social', requirement: 3 },
  
  // Event Achievements
  { id: 'event_creator', title: 'Event Organizer', description: 'Create your first event', icon: '🎪', category: 'events', requirement: 1 },
  { id: 'event_master', title: 'Event Master', description: 'Create 5 events', icon: '🏆', category: 'events', requirement: 5 },
  { id: 'participant', title: 'Participant', description: 'Register for your first event', icon: '🎟️', category: 'events', requirement: 1 },
  { id: 'super_participant', title: 'Super Participant', description: 'Register for 10 events', icon: '🌟', category: 'events', requirement: 10 },
  { id: 'checked_in', title: 'Attendee', description: 'Check in to an event', icon: '✅', category: 'events', requirement: 1 },
  
  // Special Achievements
  { id: 'early_adopter', title: 'Early Adopter', description: 'One of the first 100 users', icon: '🚀', category: 'special', requirement: 1 },
  { id: 'verified', title: 'Verified', description: 'Verify your email address', icon: '✓', category: 'special', requirement: 1 },
];

export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  // Get user's profile completion
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get user's events
  const { data: createdEvents } = await supabase
    .from('events')
    .select('id')
    .eq('created_by', userId);

  // Get user's registrations
  const { data: registrations } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('user_id', userId);

  // Get user data
  const { data: { user } } = await supabase.auth.getUser();

  // Calculate progress
  const profileFields = [
    profile?.full_name,
    profile?.date_of_birth,
    profile?.bio,
    profile?.avatar_url,
    profile?.phone,
    profile?.location,
    profile?.website,
    profile?.company,
    profile?.job_title,
  ];
  const profileCompletion = Math.round(
    (profileFields.filter(f => f && f.toString().trim() !== '').length / profileFields.length) * 100
  );

  const socialLinks = [
    profile?.linkedin_url,
    profile?.github_url,
    profile?.twitter_url,
    profile?.instagram_url,
    profile?.portfolio_url,
  ].filter(Boolean).length;

  const checkedInEvents = registrations?.filter(r => r.check_in_status === 'checked_in').length || 0;

  return ACHIEVEMENTS.map(achievement => {
    let progress = 0;
    let unlocked = false;

    switch (achievement.id) {
      case 'profile_complete':
        progress = profileCompletion;
        unlocked = profileCompletion >= 100;
        break;
      case 'avatar_uploaded':
        progress = profile?.avatar_url ? 1 : 0;
        unlocked = !!profile?.avatar_url;
        break;
      case 'social_connected':
        progress = socialLinks;
        unlocked = socialLinks >= 3;
        break;
      case 'event_creator':
        progress = createdEvents?.length || 0;
        unlocked = (createdEvents?.length || 0) >= 1;
        break;
      case 'event_master':
        progress = createdEvents?.length || 0;
        unlocked = (createdEvents?.length || 0) >= 5;
        break;
      case 'participant':
        progress = registrations?.length || 0;
        unlocked = (registrations?.length || 0) >= 1;
        break;
      case 'super_participant':
        progress = registrations?.length || 0;
        unlocked = (registrations?.length || 0) >= 10;
        break;
      case 'checked_in':
        progress = checkedInEvents;
        unlocked = checkedInEvents >= 1;
        break;
      case 'verified':
        progress = user?.email_confirmed_at ? 1 : 0;
        unlocked = !!user?.email_confirmed_at;
        break;
      default:
        break;
    }

    return {
      ...achievement,
      unlocked,
      progress,
    };
  });
}