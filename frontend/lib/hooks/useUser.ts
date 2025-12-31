import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';

type UserProfile = Database['app_auth']['Tables']['users']['Row'];

export function useUser() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user && mounted) {
          const { data, error } = await supabase
            .schema('app_auth')
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            if (mounted) setUserProfile(data);
          } else {
             // Retry logic or handling for missing profile (potentially not created by trigger yet)
             console.log("User profile not found immediately, might be creating...");
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
         const { data } = await supabase
            .schema('app_auth')
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
         if (data && mounted) setUserProfile(data);
      } else {
        if (mounted) setUserProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { userProfile, loading };
}
