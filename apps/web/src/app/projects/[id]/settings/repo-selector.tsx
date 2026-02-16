'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Github, Link, Unlink, Loader2, Search, GitBranch, Lock, Globe } from 'lucide-react'
import type { GitHubRepo } from '@mockup-ai/shared'

interface RepoSelectorProps {
  projectId: string
  currentRepo: {
    owner: string
    name: string
    fullName: string
    branch: string
  } | null
}

export function RepoSelector({ projectId, currentRepo }: RepoSelectorProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [search, setSearch] = useState('')
  const [showRepos, setShowRepos] = useState(false)
  const [linkedRepo, setLinkedRepo] = useState(currentRepo)

  const fetchRepos = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/github/repos')
      const data = await response.json()
      if (data.repos) {
        setRepos(data.repos)
      }
    } catch (err) {
      console.error('Failed to fetch repos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLinkRepo = async (repo: GitHubRepo) => {
    setLinking(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/repository`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_owner: repo.owner.login,
          repo_name: repo.name,
          default_branch: repo.default_branch
        })
      })

      if (response.ok) {
        setLinkedRepo({
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          branch: repo.default_branch
        })
        setShowRepos(false)
      }
    } catch (err) {
      console.error('Failed to link repo:', err)
    } finally {
      setLinking(false)
    }
  }

  const handleUnlinkRepo = async () => {
    if (!confirm('Are you sure you want to unlink this repository?')) {
      return
    }

    setUnlinking(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/repository`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setLinkedRepo(null)
      }
    } catch (err) {
      console.error('Failed to unlink repo:', err)
    } finally {
      setUnlinking(false)
    }
  }

  const handleShowRepos = () => {
    setShowRepos(true)
    if (repos.length === 0) {
      fetchRepos()
    }
  }

  const filteredRepos = repos.filter(repo =>
    repo.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (linkedRepo) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Github className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <a
                href={`https://github.com/${linkedRepo.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline"
              >
                {linkedRepo.fullName}
              </a>
              <Badge variant="outline" className="gap-1">
                <GitBranch className="h-3 w-3" />
                {linkedRepo.branch}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Claude will use this repository for context
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnlinkRepo}
          disabled={unlinking}
          className="gap-1"
        >
          {unlinking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Unlink className="h-3 w-3" />
          )}
          Unlink
        </Button>
      </div>
    )
  }

  if (!showRepos) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border p-6">
        <Github className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium">No repository linked</p>
          <p className="text-sm text-muted-foreground">
            Link a repository to enhance Claude's mockup capabilities
          </p>
        </div>
        <Button onClick={handleShowRepos} className="gap-2">
          <Link className="h-4 w-4" />
          Link Repository
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => setShowRepos(false)}>
          Cancel
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="max-h-[400px] space-y-2 overflow-y-auto">
          {filteredRepos.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {search ? 'No repositories match your search' : 'No repositories found'}
            </p>
          ) : (
            filteredRepos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleLinkRepo(repo)}
                disabled={linking}
                className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Github className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{repo.full_name}</span>
                      {repo.private ? (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Globe className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {repo.description}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="gap-1">
                  <GitBranch className="h-3 w-3" />
                  {repo.default_branch}
                </Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
