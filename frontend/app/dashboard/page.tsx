'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Project {
  id: string
  name: string
  description: string
  project_type: string
  status: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // New Project State
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      fetchProjects()
    }
    checkUser()
  }, [router])

  const fetchProjects = async () => {
    setLoading(true)
    // In a real app we might filter by organization_id from user metadata or profile
    const { data, error } = await supabase
      .schema('app_projects')
      .from('projects')
      .select('*')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .order('created_at', { ascending: false } as any)

    if (error) {
      console.error('Error fetching projects:', error)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setProjects(data as any || [])
    }
    setLoading(false)
  }

  const handleCreateProject = async () => {
    if (!newProjectName) return

    // Need organization_id. For now, fetch from user's app_auth.users record
    const { data: userData } = await supabase
        .schema('app_auth')
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

    // Fallback or handle error. If no org, maybe create one?
    // For this demo, assuming user has an org or we just insert with null if allowed (it is nullable in schema but logic might require it)

    const { data, error } = await supabase
      .schema('app_projects')
      .from('projects')
      .insert({
        name: newProjectName,
        organization_id: userData?.organization_id,
        owner_id: user.id
      })
      .select()

    if (error) {
      console.error('Error creating project:', error)
      alert('Error creating project')
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setProjects([data[0] as any, ...projects])
      setIsCreateOpen(false)
      setNewProjectName('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome back, {user?.email}</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Start a new project board for your team.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateProject}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Analytics Widgets Placeholder */}
        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Team Velocity</CardTitle>
              <CardDescription>Average points per sprint</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24.5</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Project Health</CardTitle>
              <CardDescription>Overall status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Good</div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Projects</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <p>Loading projects...</p>
            ) : projects.length === 0 ? (
               <p className="text-gray-500">No projects found. Create one to get started.</p>
            ) : (
              projects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>{project.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{project.status}</span>
                      <span>{project.project_type}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
