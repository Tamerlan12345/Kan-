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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">

      {/* Left Side: Info / Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">CentrasFlow AI</h1>
          <div className="space-y-4 text-lg opacity-90">
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

        <div className="text-sm opacity-70">
          v1.2.0 • © 2025 CentrasFlow
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8 bg-card text-card-foreground p-8 rounded-xl shadow-lg border border-border">
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-bold">CentrasFlow AI</h1>
            <p className="text-sm text-muted-foreground mt-2">Sign in to continue</p>
          </div>

          <div className="text-center hidden lg:block">
            <h2 className="text-2xl font-bold tracking-tight">
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
                    brand: 'var(--primary)',
                    brandAccent: 'var(--primary)',
                    brandButtonText: 'var(--primary-foreground)',
                    defaultButtonBackground: 'var(--secondary)',
                    defaultButtonBackgroundHover: 'var(--secondary)',
                    inputBackground: 'transparent',
                    inputText: 'inherit',
                    inputBorder: 'var(--border)',
                    inputLabelText: 'var(--foreground)',
                  }
                }
              },
              className: {
                 input: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                 button: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full",
              }
            }}
            providers={[]}
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
          />
        </div>
      </div>
    </div>
  )
}
