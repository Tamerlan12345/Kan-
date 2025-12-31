'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, FolderKanban } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProjectListSkeleton } from '@/components/Skeletons'
import { EmptyState } from '@/components/EmptyState'
import { DICTIONARY, getStatusLabel } from '@/lib/dictionaries'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
  description: string
  status: string
  project_type: string
}

const projectSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }).max(50, { message: "Name must be less than 50 characters" }),
  description: z.string().max(200, { message: "Description must be less than 200 characters" }).optional(),
  type: z.string().min(1, { message: "Type is required" }),
})

type ProjectFormValues = z.infer<typeof projectSchema>

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'development',
    },
  })

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
      toast.error(DICTIONARY.errors.fetch_failed)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (values: ProjectFormValues) => {
    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("User not authenticated")
        return
      }

      const { data: userData } = await supabase
        .schema('app_auth')
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      const orgId = userData?.organization_id

      if (!orgId) {
        toast.error("User profile incomplete. Please wait a moment or contact support.")
        return
      }

      const { data, error } = await supabase
        .schema('app_projects')
        .from('projects')
        .insert([
          {
            name: values.name,
            description: values.description,
            project_type: values.type,
            owner_id: user.id,
            organization_id: orgId,
            status: 'active'
          }
        ])
        .select()

      if (error) throw error

      setProjects([data[0], ...projects])
      setIsNewProjectOpen(false)
      reset()
      toast.success(DICTIONARY.common.success)
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error(DICTIONARY.errors.create_failed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{DICTIONARY.projects.title}</h1>
        <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> {DICTIONARY.projects.create_project}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{DICTIONARY.projects.create_project}</DialogTitle>
              <DialogDescription>
                Add a new project to your workspace.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(createProject)} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  {DICTIONARY.projects.name_placeholder}
                </Label>
                <div className="col-span-3">
                    <Input
                    id="name"
                    {...register("name")}
                    className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  {DICTIONARY.projects.desc_placeholder}
                </Label>
                <div className="col-span-3">
                    <Textarea
                    id="description"
                    {...register("description")}
                    className={errors.description ? "border-red-500" : ""}
                    />
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  {DICTIONARY.projects.type_label}
                </Label>
                <div className="col-span-3">
                    <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="development">{DICTIONARY.status.development}</SelectItem>
                                <SelectItem value="insurance">{DICTIONARY.status.insurance}</SelectItem>
                                <SelectItem value="analytics">{DICTIONARY.status.analytics}</SelectItem>
                                <SelectItem value="operations">{DICTIONARY.status.operations}</SelectItem>
                            </SelectContent>
                        </Select>
                        )}
                    />
                     {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? DICTIONARY.common.loading : DICTIONARY.common.create}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <ProjectListSkeleton />
      ) : (
        <>
            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <Link key={project.id} href={`/project/${project.id}`} className="block group">
                    <div className="border rounded-lg p-6 hover:shadow-lg transition-all bg-card text-card-foreground group-hover:border-primary/50 h-full flex flex-col">
                        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                        <p className="text-muted-foreground mb-4 line-clamp-2 flex-grow">{project.description}</p>
                        <div className="flex justify-between items-center text-sm mt-auto pt-4 border-t">
                        <span className="bg-secondary px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">
                            {DICTIONARY.status[project.project_type as keyof typeof DICTIONARY.status] || project.project_type}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            project.status === 'active' ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'
                        }`}>
                            {getStatusLabel(project.status)}
                        </span>
                        </div>
                    </div>
                    </Link>
                ))}
                </div>
            ) : (
                <EmptyState
                    icon={FolderKanban}
                    title={DICTIONARY.projects.no_projects}
                    description="Create your first project to get started."
                    action={{
                        label: DICTIONARY.projects.create_first,
                        onClick: () => setIsNewProjectOpen(true)
                    }}
                />
            )}
        </>
      )}
    </div>
  )
}
