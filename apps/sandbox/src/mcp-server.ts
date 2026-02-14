/**
 * MCP Server for Workspace Tools
 *
 * Provides sandboxed file operations for Claude Code, restricted to the workspace directory.
 * This ensures Claude can only read/write files within the mockup workspace.
 *
 * Tools exposed:
 * - read_file: Read a file from the workspace
 * - write_file: Write content to a file in the workspace
 * - list_files: List all files in the workspace
 *
 * Usage:
 * The Claude Code SDK can connect to this MCP server for file operations.
 * This provides better isolation than using Claude's built-in tools.
 */

import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, resolve, relative, isAbsolute } from 'path'

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export interface MCPToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

export class WorkspaceMCPServer {
  private workspacePath: string

  constructor(workspacePath: string) {
    this.workspacePath = resolve(workspacePath)
  }

  /**
   * Get the list of available tools
   */
  getTools(): MCPTool[] {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file from the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path to the file within the workspace'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file in the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path to the file within the workspace'
            },
            content: {
              type: 'string',
              description: 'Content to write to the file'
            }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_files',
        description: 'List all files in the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            directory: {
              type: 'string',
              description: 'Relative path to directory (default: workspace root)'
            }
          },
          required: []
        }
      }
    ]
  }

  /**
   * Execute a tool with given arguments
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      switch (name) {
        case 'read_file':
          return await this.readFile(args.path as string)
        case 'write_file':
          return await this.writeFile(args.path as string, args.content as string)
        case 'list_files':
          return await this.listFiles(args.directory as string | undefined)
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true
          }
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      }
    }
  }

  /**
   * Validate and resolve a path to ensure it's within the workspace
   */
  private resolveSafePath(relativePath: string): string | null {
    // Don't allow absolute paths
    if (isAbsolute(relativePath)) {
      return null
    }

    // Resolve the full path
    const fullPath = resolve(this.workspacePath, relativePath)

    // Ensure the resolved path is within the workspace
    const relativeToWorkspace = relative(this.workspacePath, fullPath)
    if (relativeToWorkspace.startsWith('..') || isAbsolute(relativeToWorkspace)) {
      return null
    }

    return fullPath
  }

  private async readFile(path: string): Promise<MCPToolResult> {
    const safePath = this.resolveSafePath(path)
    if (!safePath) {
      return {
        content: [{ type: 'text', text: `Error: Path traversal not allowed: ${path}` }],
        isError: true
      }
    }

    if (!existsSync(safePath)) {
      return {
        content: [{ type: 'text', text: `Error: File not found: ${path}` }],
        isError: true
      }
    }

    const content = await readFile(safePath, 'utf-8')
    return {
      content: [{ type: 'text', text: content }]
    }
  }

  private async writeFile(path: string, content: string): Promise<MCPToolResult> {
    const safePath = this.resolveSafePath(path)
    if (!safePath) {
      return {
        content: [{ type: 'text', text: `Error: Path traversal not allowed: ${path}` }],
        isError: true
      }
    }

    // Ensure directory exists
    const dir = resolve(safePath, '..')
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(safePath, content, 'utf-8')
    return {
      content: [{ type: 'text', text: `Successfully wrote ${content.length} characters to ${path}` }]
    }
  }

  private async listFiles(directory?: string): Promise<MCPToolResult> {
    const targetDir = directory
      ? this.resolveSafePath(directory)
      : this.workspacePath

    if (!targetDir) {
      return {
        content: [{ type: 'text', text: `Error: Path traversal not allowed: ${directory}` }],
        isError: true
      }
    }

    if (!existsSync(targetDir)) {
      return {
        content: [{ type: 'text', text: `Error: Directory not found: ${directory || '/'}` }],
        isError: true
      }
    }

    const files: string[] = []

    const walk = async (dir: string, prefix: string = ''): Promise<void> => {
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

    await walk(targetDir)

    return {
      content: [{ type: 'text', text: files.join('\n') || '(empty workspace)' }]
    }
  }
}

/**
 * Create an MCP server configuration for use with Claude Code SDK
 *
 * This can be passed to the Claude Code SDK's mcpServers option
 * to provide sandboxed file operations.
 *
 * Example usage:
 * ```typescript
 * import { query } from '@anthropic-ai/claude-code'
 * import { createMCPServerConfig } from './mcp-server.js'
 *
 * const mcpConfig = createMCPServerConfig('/path/to/workspace')
 *
 * await query({
 *   prompt: 'Edit the index.html file',
 *   options: {
 *     mcpServers: [mcpConfig]
 *   }
 * })
 * ```
 */
export function createMCPServerConfig(workspacePath: string) {
  const server = new WorkspaceMCPServer(workspacePath)

  return {
    name: 'workspace',
    tools: server.getTools(),
    execute: (name: string, args: Record<string, unknown>) => server.executeTool(name, args)
  }
}
