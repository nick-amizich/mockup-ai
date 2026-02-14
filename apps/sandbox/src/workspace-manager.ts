import { mkdir, writeFile, readFile, rm, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export class WorkspaceManager {
  private sessionId: string
  private workspacePath: string
  private originalHtml: string = ''
  private originalCss: string = ''

  constructor(sessionId: string) {
    this.sessionId = sessionId
    this.workspacePath = join(tmpdir(), 'mockup-ai', sessionId)
  }

  async create(html: string, css: string): Promise<void> {
    this.originalHtml = html
    this.originalCss = css

    // Create workspace directory
    await mkdir(this.workspacePath, { recursive: true })

    // Write files
    await writeFile(join(this.workspacePath, 'index.html'), html)
    await writeFile(join(this.workspacePath, 'styles.css'), css)

    console.log(`Workspace created at ${this.workspacePath}`)
  }

  getWorkspacePath(): string {
    return this.workspacePath
  }

  async readFile(filename: string): Promise<string> {
    const filepath = join(this.workspacePath, filename)
    return readFile(filepath, 'utf-8')
  }

  async writeFile(filename: string, content: string): Promise<void> {
    const filepath = join(this.workspacePath, filename)
    await writeFile(filepath, content)
  }

  async listFiles(): Promise<string[]> {
    const files: string[] = []

    async function walk(dir: string, prefix: string = '') {
      const entries = await readdir(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const relativePath = prefix ? `${prefix}/${entry}` : entry
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          await walk(fullPath, relativePath)
        } else {
          files.push(relativePath)
        }
      }
    }

    if (existsSync(this.workspacePath)) {
      await walk(this.workspacePath)
    }

    return files
  }

  async getDiff(): Promise<{ html: string; css: string }> {
    const currentHtml = await this.readFile('index.html')
    const currentCss = await this.readFile('styles.css')

    return {
      html: this.generateDiff(this.originalHtml, currentHtml),
      css: this.generateDiff(this.originalCss, currentCss)
    }
  }

  private generateDiff(original: string, current: string): string {
    // Simple line-by-line diff
    const originalLines = original.split('\n')
    const currentLines = current.split('\n')
    const diff: string[] = []

    const maxLen = Math.max(originalLines.length, currentLines.length)

    for (let i = 0; i < maxLen; i++) {
      const origLine = originalLines[i] || ''
      const currLine = currentLines[i] || ''

      if (origLine !== currLine) {
        if (origLine && !currLine) {
          diff.push(`- ${origLine}`)
        } else if (!origLine && currLine) {
          diff.push(`+ ${currLine}`)
        } else {
          diff.push(`- ${origLine}`)
          diff.push(`+ ${currLine}`)
        }
      }
    }

    return diff.join('\n')
  }

  getOriginalHtml(): string {
    return this.originalHtml
  }

  getOriginalCss(): string {
    return this.originalCss
  }

  async cleanup(): Promise<void> {
    try {
      if (existsSync(this.workspacePath)) {
        await rm(this.workspacePath, { recursive: true, force: true })
        console.log(`Workspace ${this.sessionId} cleaned up`)
      }
    } catch (error) {
      console.error(`Failed to cleanup workspace ${this.sessionId}:`, error)
    }
  }
}
