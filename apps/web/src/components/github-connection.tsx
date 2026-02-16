'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Github, Link, Unlink, Loader2 } from 'lucide-react'

interface GitHubStatus {
  connected: boolean
  github_username?: string
  connected_at?: string
}

export function GitHubConnection() {
  const [status, setStatus] = useState<GitHubStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/github/status')
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      console.error('Failed to fetch GitHub status:', err)
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    window.location.href = '/api/github/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect GitHub? This will unlink all repositories from your projects.')) {
      return
    }

    setDisconnecting(true)
    try {
      const response = await fetch('/api/github/disconnect', { method: 'DELETE' })
      if (response.ok) {
        setStatus({ connected: false })
      }
    } catch (err) {
      console.error('Failed to disconnect GitHub:', err)
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Github className="h-4 w-4" />
            GitHub Integration
          </CardTitle>
          <CardDescription>
            Connect GitHub to give Claude access to your source code
          </CardDescription>
        </div>
        {status?.connected && (
          <Badge variant="success" className="gap-1">
            <Link className="h-3 w-3" />
            Connected
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {status?.connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Github className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">@{status.github_username}</p>
                <p className="text-sm text-muted-foreground">
                  Connected {status.connected_at ? new Date(status.connected_at).toLocaleDateString() : ''}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="gap-1"
            >
              {disconnecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Unlink className="h-3 w-3" />
              )}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-center text-sm text-muted-foreground">
              Connect your GitHub account to link repositories to projects.
              Claude will use the source code for context-aware mockups.
            </p>
            <Button onClick={handleConnect} className="gap-2">
              <Github className="h-4 w-4" />
              Connect GitHub
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
