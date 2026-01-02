'use client'

import { Button } from '@/components/ui/button'
import { LogOut, Layout, User } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const pathname = usePathname()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-gray-50/50 flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        CentrasFlow AI
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/dashboard">
                        <Button variant={pathname === '/dashboard' ? 'secondary' : 'ghost'} className="w-full justify-start">
                            <Layout className="mr-2 h-4 w-4" />
                            Проекты
                        </Button>
                    </Link>
                    {/* Add more links here */}
                </nav>

                <div className="p-4 border-t space-y-2">
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Профиль</span>
                    </div>
                    <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Выйти
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
  }
