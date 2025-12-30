import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <main className="max-w-3xl text-center space-y-8">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
          Управляй проектами с <span className="text-primary">AI-помощником</span>
        </h1>
        
        <p className="text-xl text-muted-foreground">
          Современный Kanban-трекер с искусственным интеллектом для эффективной работы команды.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="font-semibold text-lg px-8">
              Войти в систему
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="font-semibold text-lg px-8">
              Открыть доску (Демо)
            </Button>
          </Link>
        </div>
      </main>
      
      <footer className="mt-20 text-sm text-muted-foreground">
        © 2025 AI Kanban Project
      </footer>
    </div>
  );
}
