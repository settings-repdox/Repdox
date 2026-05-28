// src/pages/AuthCallback.tsx
// Handles OAuth redirects and email verification confirmations

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Processing...');

  useEffect(() => {
    let isMounted = true;
    const timeouts: NodeJS.Timeout[] = [];

    const safeSetTimeout = (fn: () => void, delay: number) => {
      const timer = setTimeout(() => {
        if (isMounted) fn();
      }, delay);
      timeouts.push(timer);
    };

    async function handleAuthCallback() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          if (isMounted) setMessage('Verification failed. Please try again.');
          safeSetTimeout(() => navigate('/signin'), 2000);
          return;
        }

        if (!session) {
          if (isMounted) setMessage('No session found. Redirecting to sign in...');
          safeSetTimeout(() => navigate('/signin'), 2000);
          return;
        }

        const user = session.user;
        
        if (user.email_confirmed_at) {
          if (isMounted) setMessage('Email verified! Setting up your account...');
          
          safeSetTimeout(() => navigate('/'), 1000);
        } else {
          if (isMounted) setMessage('Email not yet verified. Please check your email...');
          safeSetTimeout(() => navigate(`/verify-email?email=${encodeURIComponent(user.email || '')}`), 1500);
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        if (isMounted) setMessage('An error occurred. Redirecting...');
        safeSetTimeout(() => navigate('/signin'), 2000);
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {message}
        </h2>
        <p className="text-gray-600">
          Please wait while we complete the process.
        </p>
      </div>
    </div>
  );
}