'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Project {
  id: string
  name: string
  description: string
  status: string
  project_type: string
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)

  // New project state
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newProjectType, setNewProjectType] = useState('development')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data: projectsData, error: projectsError } = await supabase
        .schema('app_projects')
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      setProjects(projectsData || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // We need organization_id. For MVP let's see if we can get it or insert without it if nullable (it is not null in schema).
      // We need to fetch the user's organization.
      const { data: userData } = await supabase
        .schema('app_auth')
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      const orgId = userData?.organization_id

      const { data, error } = await supabase
        .schema('app_projects')
        .from('projects')
        .insert([
          {
            name: newProjectName,
            description: newProjectDesc,
            project_type: newProjectType,
            owner_id: user.id,
            organization_id: orgId, // Might be null
            status: 'active'
          }
        ])
        .select()

      if (error) throw error

      setProjects([data[0], ...projects])
      setIsNewProjectOpen(false)
      setNewProjectName('')
      setNewProjectDesc('')
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Error creating project')
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new project to your workspace.
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                 <select
                    id="type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                    value={newProjectType}
                    onChange={(e) => setNewProjectType(e.target.value)}
                  >
                    <option value="development">Development</option>
                    <option value="insurance">Insurance</option>
                    <option value="analytics">Analytics</option>
                    <option value="operations">Operations</option>
                  </select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createProject}>Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/project/${project.id}`} className="block">
              <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-card text-card-foreground">
                <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                <div className="flex justify-between items-center text-sm">
                   <span className="bg-secondary px-2 py-1 rounded capitalize">{project.project_type}</span>
                   <span className={`px-2 py-1 rounded capitalize ${project.status === 'active' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'}`}>
                     {project.status}
                   </span>
                </div>
              </div>
            </Link>
          ))}
          {projects.length === 0 && (
             <div className="col-span-full text-center text-gray-500 py-10">
                No projects found. Create one to get started.
             </div>
          )}
        </div>
      )}
    </div>
  )
}
