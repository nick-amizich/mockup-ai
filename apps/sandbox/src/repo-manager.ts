import { execSync, exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

const REPOS_BASE_DIR = '/tmp/mockup-ai-repos'
const MAX_REPO_AGE_MS = 1000 * 60 * 60 * 24 // 24 hours

interface RepoInfo {
  owner: string
  name: string
  branch: string
  token: string
}

interface CloneResult {
  repoPath: string
  fileCount: number
}

/**
 * Manages Git repository cloning and caching for context
 */
export class RepoManager {
  private clonedRepos: Map<string, { path: string; clonedAt: Date }> = new Map()

  constructor() {
    // Ensure repos directory exists
    this.ensureReposDir()
  }

  private async ensureReposDir(): Promise<void> {
    try {
      await fs.mkdir(REPOS_BASE_DIR, { recursive: true })
    } catch (err) {
      console.error('Failed to create repos directory:', err)
    }
  }

  /**
   * Get repo cache key
   */
  private getCacheKey(repo: RepoInfo): string {
    return `${repo.owner}-${repo.name}-${repo.branch}`
  }

  /**
   * Clone a repository (shallow clone for speed)
   */
  async cloneRepo(repo: RepoInfo): Promise<CloneResult> {
    const cacheKey = this.getCacheKey(repo)
    const repoPath = path.join(REPOS_BASE_DIR, cacheKey)

    // Check if already cloned and not stale
    const cached = this.clonedRepos.get(cacheKey)
    if (cached) {
      const age = Date.now() - cached.clonedAt.getTime()
      if (age < MAX_REPO_AGE_MS) {
        console.log(`Using cached repo: ${repo.owner}/${repo.name}`)
        const fileCount = await this.countFiles(repoPath)
        return { repoPath, fileCount }
      }
      // Stale cache, remove it
      await this.removeRepo(cacheKey)
    }

    // Check if repo exists on disk (from previous session)
    try {
      await fs.access(repoPath)
      console.log(`Found existing repo: ${repo.owner}/${repo.name}`)
      // Pull latest changes
      await this.pullLatest(repoPath, repo)
      this.clonedRepos.set(cacheKey, { path: repoPath, clonedAt: new Date() })
      const fileCount = await this.countFiles(repoPath)
      return { repoPath, fileCount }
    } catch {
      // Repo doesn't exist, clone it
    }

    console.log(`Cloning repo: ${repo.owner}/${repo.name} (branch: ${repo.branch})`)

    // Build clone URL with token for auth
    const cloneUrl = `https://${repo.token}@github.com/${repo.owner}/${repo.name}.git`

    try {
      // Shallow clone with specific branch
      await execAsync(
        `git clone --depth 1 --single-branch --branch ${repo.branch} "${cloneUrl}" "${repoPath}"`,
        {
          timeout: 120000, // 2 minute timeout
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: '0' // Disable git prompts
          }
        }
      )

      // Remove .git directory to prevent accidental commits
      await fs.rm(path.join(repoPath, '.git'), { recursive: true, force: true })

      // Cache the cloned repo
      this.clonedRepos.set(cacheKey, { path: repoPath, clonedAt: new Date() })

      const fileCount = await this.countFiles(repoPath)
      console.log(`Cloned ${repo.owner}/${repo.name}: ${fileCount} files`)

      return { repoPath, fileCount }
    } catch (err) {
      console.error(`Failed to clone repo ${repo.owner}/${repo.name}:`, err)
      throw new Error(`Failed to clone repository: ${repo.owner}/${repo.name}`)
    }
  }

  /**
   * Pull latest changes from remote
   */
  private async pullLatest(repoPath: string, repo: RepoInfo): Promise<void> {
    try {
      // Re-add .git for pulling (we removed it after clone)
      // Actually, we can't pull without .git, so we just use the cached version
      // For now, we rely on the cache timeout to refresh repos
      console.log(`Using cached version of ${repo.owner}/${repo.name}`)
    } catch (err) {
      console.warn(`Failed to pull latest for ${repo.owner}/${repo.name}:`, err)
    }
  }

  /**
   * Remove a cached repository
   */
  async removeRepo(cacheKey: string): Promise<void> {
    const repoPath = path.join(REPOS_BASE_DIR, cacheKey)
    try {
      await fs.rm(repoPath, { recursive: true, force: true })
      this.clonedRepos.delete(cacheKey)
      console.log(`Removed cached repo: ${cacheKey}`)
    } catch (err) {
      console.error(`Failed to remove repo ${cacheKey}:`, err)
    }
  }

  /**
   * Count files in a directory (excluding common excludes)
   */
  private async countFiles(dirPath: string): Promise<number> {
    const excludes = [
      'node_modules', '.git', '.next', 'dist', 'build',
      '.cache', '__pycache__', '.venv', 'vendor'
    ]

    let count = 0

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (excludes.includes(entry.name)) continue
        if (entry.name.startsWith('.')) continue

        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await walk(fullPath)
        } else if (entry.isFile()) {
          count++
        }
      }
    }

    await walk(dirPath)
    return count
  }

  /**
   * Get file structure for a repository (for context)
   */
  async getFileStructure(repoPath: string, maxFiles = 500): Promise<string[]> {
    const excludes = [
      'node_modules', '.git', '.next', 'dist', 'build',
      '.cache', '__pycache__', '.venv', 'vendor',
      'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
    ]

    const codeExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte',
      '.py', '.rb', '.go', '.rs', '.java', '.kt',
      '.css', '.scss', '.less', '.sass',
      '.html', '.htm', '.json', '.yaml', '.yml'
    ]

    const files: string[] = []

    const walk = async (dir: string, relativePath = ''): Promise<void> => {
      if (files.length >= maxFiles) return

      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (files.length >= maxFiles) break
        if (excludes.includes(entry.name)) continue
        if (entry.name.startsWith('.') && entry.name !== '.env.example') continue

        const fullPath = path.join(dir, entry.name)
        const relPath = path.join(relativePath, entry.name)

        if (entry.isDirectory()) {
          await walk(fullPath, relPath)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (codeExtensions.includes(ext) || entry.name === 'package.json' || entry.name === 'README.md') {
            files.push(relPath)
          }
        }
      }
    }

    await walk(repoPath)
    return files.sort()
  }

  /**
   * Read a file from the repository
   */
  async readFile(repoPath: string, filePath: string): Promise<string> {
    const fullPath = path.join(repoPath, filePath)

    // Security: ensure path doesn't escape repo
    const normalizedPath = path.normalize(fullPath)
    if (!normalizedPath.startsWith(repoPath)) {
      throw new Error('Path traversal attempt detected')
    }

    const content = await fs.readFile(fullPath, 'utf-8')
    return content
  }

  /**
   * Check if a path exists in the repository
   */
  async pathExists(repoPath: string, filePath: string): Promise<boolean> {
    const fullPath = path.join(repoPath, filePath)
    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Link repository to a workspace
   * Creates a symlink in the workspace pointing to the cloned repo
   */
  async linkToWorkspace(repoPath: string, workspacePath: string): Promise<void> {
    const linkPath = path.join(workspacePath, 'repo')

    try {
      // Remove existing link if present
      await fs.rm(linkPath, { force: true })

      // Create symlink
      await fs.symlink(repoPath, linkPath, 'dir')
      console.log(`Linked repo to workspace: ${linkPath}`)
    } catch (err) {
      console.error('Failed to link repo to workspace:', err)
      throw err
    }
  }

  /**
   * Cleanup old cached repos
   */
  async cleanup(): Promise<void> {
    try {
      const entries = await fs.readdir(REPOS_BASE_DIR, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const dirPath = path.join(REPOS_BASE_DIR, entry.name)
        const stats = await fs.stat(dirPath)
        const age = Date.now() - stats.mtime.getTime()

        if (age > MAX_REPO_AGE_MS) {
          await fs.rm(dirPath, { recursive: true, force: true })
          this.clonedRepos.delete(entry.name)
          console.log(`Cleaned up stale repo: ${entry.name}`)
        }
      }
    } catch (err) {
      console.error('Failed to cleanup repos:', err)
    }
  }
}

// Singleton instance
export const repoManager = new RepoManager()
