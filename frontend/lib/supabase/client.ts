import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
        const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login'
        if (!isLoginPage && typeof window !== 'undefined') {
             window.location.href = '/login'
        }
    }
})
