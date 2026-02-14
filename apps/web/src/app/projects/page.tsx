'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FolderOpen, ExternalLink, Loader2 } from 'lucide-react'

interface Project {
  id: string
  name: string
  url: string | null
  created_at: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const supabase = createClient()

  async function fetchProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    setProjects((data as Project[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('projects').insert({
      name,
      url: url || null,
      user_id: user.id,
    })

    if (!error) {
      setName('')
      setUrl('')
      setShowForm(false)
      fetchProjects()
    }

    setCreating(false)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Organize your mockups by website</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create Project</CardTitle>
            <CardDescription>Add a new project to organize your mockups</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createProject} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Project Name
                </label>
                <Input
                  id="name"
                  placeholder="My Website"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="url" className="text-sm font-medium">
                  Website URL (optional)
                </label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    {project.name}
                  </CardTitle>
                  {project.url && (
                    <CardDescription className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {project.url}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 font-medium">No projects yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Create a project to organize your mockups
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
