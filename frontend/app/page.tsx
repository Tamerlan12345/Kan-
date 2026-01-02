'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Layout } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      } else {
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        
        {/* Шапка карточки */}
        <div className="bg-primary/5 p-6 text-center border-b border-gray-100 dark:border-gray-700">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <Layout className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Kanban
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Система управления задачами с ИИ
          </p>
        </div>

        {/* Форма входа */}
        <div className="p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary))',
                  }
                }
              }
            }}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Адрес электронной почты',
                  password_label: 'Пароль',
                  button_label: 'Войти',
                  loading_button_label: 'Вход...',
                  link_text: 'Уже есть аккаунт? Войти',
                },
                sign_up: {
                  email_label: 'Адрес электронной почты',
                  password_label: 'Пароль',
                  button_label: 'Зарегистрироваться',
                  loading_button_label: 'Регистрация...',
                  link_text: 'Нет аккаунта? Зарегистрироваться',
                },
                forgotten_password: {
                  link_text: 'Забыли пароль?',
                  button_label: 'Восстановить пароль',
                }
              }
            }}
            theme="default" // Можно поставить 'dark' если нужно
            providers={[]} // Если нужны Google/Github, добавь ['google']
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
          />
        </div>
      </div>
    </div>
  )
}
