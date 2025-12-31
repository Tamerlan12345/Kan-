import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';

type UserProfile = Database['app_auth']['Tables']['users']['Row'];

export function useUser() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .schema('app_auth')
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            setUserProfile(data);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
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
         if (data) setUserProfile(data);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { userProfile, loading };
}
