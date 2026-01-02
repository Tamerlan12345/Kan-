'use client'

import Link from 'next/link'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  showBackButton?: boolean
}

export function Breadcrumbs({ items, showBackButton = true }: BreadcrumbsProps) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      {showBackButton && (
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2 h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        Home
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  )
}
