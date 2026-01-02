'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.replace('/dashboard')
        } else {
          setCheckingSession(false)
        }
      } catch (e) {
        console.error(e)
        setCheckingSession(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Side: Info / Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-zinc-900 p-12 text-white">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">CentrasFlow AI</h1>
          <div className="space-y-4 text-lg text-zinc-400">
            <p>
              An intelligent Kanban system powered by AI to streamline your project management workflow.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>AI Task Decomposition</li>
              <li>Predictive Estimations</li>
              <li>Smart Analytics</li>
            </ul>
          </div>
        </div>

        <div className="text-sm text-zinc-500">
          v1.2.0 • © 2025 CentrasFlow
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-sm space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-bold">CentrasFlow AI</h1>
            <p className="text-sm text-muted-foreground mt-2">Sign in to continue</p>
          </div>

          <div className="text-center hidden lg:block">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Welcome Back
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your credentials to access your workspace
            </p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'rgb(15, 23, 42)',
                    brandAccent: 'rgb(30, 41, 59)',
                  }
                }
              }
            }}
            theme="light" // or dark based on system pref, but sticking to light for form container
            providers={[]}
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
          />
        </div>
      </div>
    </div>
  )
}
