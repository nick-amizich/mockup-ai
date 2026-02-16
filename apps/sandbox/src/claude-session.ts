import { query, type SDKMessage, type SDKAssistantMessage, type SDKResultMessage } from '@anthropic-ai/claude-code'
import { WorkspaceManager } from './workspace-manager.js'
import { composeSystemPrompt, createDefaultContext, type PromptContext, type TechStack, type CodePatterns, type PreviousChange } from './prompts/index.js'
import { detectTechStack, extractPatterns } from './pattern-extractor.js'

interface SessionEvent {
  type: 'message' | 'tool_use' | 'error' | 'ticket_created' | 'thinking' | 'done'
  content?: string
  tool?: string
  error?: string
  ticket?: TicketData
}

interface TicketData {
  title: string
  prompt: string
  changes: {
    html: string
    css: string
  }
}

interface ClaudeSessionConfig {
  apiKey?: string
  pageTitle?: string
  pageUrl?: string
}

export class ClaudeSession {
  private workspace: WorkspaceManager
  private onEvent: (event: SessionEvent) => void
  private userRequests: string[] = []
  private changeSummaries: string[] = []
  private conversationHistory: SDKMessage[] = []
  private sessionId: string | null = null
  private abortController: AbortController | null = null
  private config: ClaudeSessionConfig
  private promptContext: PromptContext | null = null
  private techStackDetected: boolean = false

  constructor(
    workspace: WorkspaceManager,
    onEvent: (event: SessionEvent) => void,
    config: ClaudeSessionConfig = {}
  ) {
    this.workspace = workspace
    this.onEvent = onEvent
    this.config = config
  }

  /**
   * Initialize prompt context by detecting tech stack and extracting patterns
   */
  private async initializePromptContext(): Promise<void> {
    if (this.techStackDetected) return

    const repoPath = this.workspace.getRepoPath()

    if (repoPath) {
      try {
        // Detect tech stack from repo
        const techStack = await detectTechStack(repoPath)
        console.log('Detected tech stack:', techStack)

        // Extract code patterns
        const patterns = await extractPatterns(repoPath)
        console.log(`Extracted ${patterns.cssClasses.length} CSS classes, ${patterns.componentPatterns.length} components`)

        this.promptContext = {
          techStack,
          patterns,
          pageTitle: this.config.pageTitle,
          pageUrl: this.config.pageUrl,
          previousChanges: []
        }
      } catch (err) {
        console.error('Failed to detect tech stack:', err)
        this.promptContext = createDefaultContext()
        this.promptContext.pageTitle = this.config.pageTitle
        this.promptContext.pageUrl = this.config.pageUrl
      }
    } else {
      // No repo context, use defaults
      this.promptContext = createDefaultContext()
      this.promptContext.pageTitle = this.config.pageTitle
      this.promptContext.pageUrl = this.config.pageUrl
    }

    this.techStackDetected = true
  }

  /**
   * Build previous changes for conversation context
   */
  private getPreviousChanges(): PreviousChange[] {
    const changes: PreviousChange[] = []

    for (let i = 0; i < this.userRequests.length - 1; i++) {
      changes.push({
        request: this.userRequests[i],
        summary: this.changeSummaries[i] || 'Changes applied'
      })
    }

    return changes
  }

  /**
   * Get the system prompt using the new prompt composer
   */
  private getSystemPrompt(): string {
    const hasRepo = this.workspace.hasRepoContext()
    const repoStructure = hasRepo ? this.workspace.getRepoStructureSummary() : ''

    // If we have prompt context, use the new composer
    if (this.promptContext) {
      // Update previous changes for multi-turn context
      this.promptContext.previousChanges = this.getPreviousChanges()

      return composeSystemPrompt(this.promptContext, repoStructure)
    }

    // Fallback to basic prompt if context not initialized
    const basePrompt = `You are an AI assistant helping to create visual mockups of website changes.

Your job is to:
1. Understand what changes the user wants to make to the page
2. Read and edit the HTML/CSS files in the current directory
3. Make the requested changes directly to create a mockup

The workspace contains:
- index.html: The captured HTML of the page
- styles.css: The captured CSS of the page`

    const repoPrompt = hasRepo ? `
- repo/: The actual source code repository

IMPORTANT: Use the repo/ directory to understand:
- Component patterns (React/Vue/etc)
- CSS class naming conventions
- File organization patterns
- Design system tokens and variables

${repoStructure}

When making mockup changes:
- Reference existing component patterns from repo/ when relevant
- Use the same CSS class naming conventions as the actual codebase
- Consider how the mockup would translate to real code` : ''

    const closingPrompt = `

When making changes:
- Be precise and surgical with your edits
- Explain what you're changing and why
- Keep the changes focused on what the user requested
- Always read the current file content before making edits

Remember: You're creating a MOCKUP - a visual preview of changes. The goal is to show the user what the changes would look like, not to build fully functional features.`

    return basePrompt + repoPrompt + closingPrompt
  }

  async sendMessage(userMessage: string): Promise<void> {
    this.userRequests.push(userMessage)

    try {
      // Initialize prompt context on first message (async tech stack detection)
      await this.initializePromptContext()

      await this.runClaude(userMessage)
    } catch (error) {
      console.error('Error in Claude session:', error)
      this.onEvent({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to process your request. Please try again.'
      })
    }
  }

  private async runClaude(prompt: string): Promise<void> {
    const workspacePath = this.workspace.getWorkspacePath()

    // Create abort controller for this request
    this.abortController = new AbortController()

    console.log(`Running Claude Code SDK in ${workspacePath}`)
    console.log(`Prompt: ${prompt}`)

    // Build environment variables, including API key if provided
    const env: Record<string, string> = {}
    if (this.config.apiKey) {
      env.ANTHROPIC_API_KEY = this.config.apiKey
      console.log('Using provided API key for authentication')
    } else if (process.env.ANTHROPIC_API_KEY) {
      env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
      console.log('Using environment API key for authentication')
    } else {
      console.log('No API key provided, will use CLI authentication')
    }

    try {
      // Use the Claude Code SDK's query function
      // It returns an async generator that yields SDKMessage objects
      const queryResult = query({
        prompt,
        options: {
          // Set the working directory for file operations
          cwd: workspacePath,
          // Only allow file-related tools
          allowedTools: ['Read', 'Edit', 'Write', 'Glob', 'Grep'],
          // System prompt for context
          customSystemPrompt: this.getSystemPrompt(),
          // Max turns to prevent infinite loops
          maxTurns: 10,
          // Permission mode - auto-accept edits within workspace
          permissionMode: 'acceptEdits',
          // Resume from previous session if we have one
          ...(this.sessionId && { resume: this.sessionId }),
          // Abort controller
          abortController: this.abortController,
          // Pass environment variables (including API key for cloud deployment)
          ...(Object.keys(env).length > 0 && { env })
        }
      })

      // Process streaming messages
      const messages: SDKMessage[] = []
      let lastAssistantText = ''

      for await (const message of queryResult) {
        messages.push(message)
        this.handleMessage(message)

        // Capture session ID from init message
        if (message.type === 'system' && 'subtype' in message && message.subtype === 'init') {
          this.sessionId = message.session_id
          console.log('Claude session initialized:', this.sessionId)
        }

        // Capture assistant text for summary
        if (message.type === 'assistant') {
          const assistantMsg = message as SDKAssistantMessage
          const content = assistantMsg.message?.content
          if (Array.isArray(content)) {
            const textBlocks = content
              .filter((b): b is { type: 'text'; text: string } => b.type === 'text' && 'text' in b)
              .map(b => b.text)
              .join('')
            if (textBlocks) {
              lastAssistantText = textBlocks
            }
          }
        }

        // Handle result
        if (message.type === 'result') {
          const resultMsg = message as SDKResultMessage
          if (resultMsg.subtype === 'success') {
            console.log(`Claude completed in ${resultMsg.num_turns} turns`)
          } else {
            console.log(`Claude ended with ${resultMsg.subtype}`)
          }
        }
      }

      // Store conversation history for multi-turn
      this.conversationHistory = messages

      // Store the change summary for conversation context
      if (lastAssistantText) {
        // Extract a concise summary (first 200 chars or until first double newline)
        const summaryEnd = Math.min(
          lastAssistantText.indexOf('\n\n') > 0 ? lastAssistantText.indexOf('\n\n') : 200,
          200
        )
        this.changeSummaries.push(lastAssistantText.substring(0, summaryEnd).trim())
        console.log('Claude completed response')
      } else {
        this.changeSummaries.push('Changes applied')
      }

      this.onEvent({ type: 'done' })

    } catch (error) {
      if (error instanceof Error) {
        // Check for common auth errors
        if (error.message.includes('not logged in') || error.message.includes('authentication') || error.message.includes('API key')) {
          const hasApiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY
          this.onEvent({
            type: 'error',
            error: hasApiKey
              ? 'Invalid or expired API key. Please check your ANTHROPIC_API_KEY.'
              : 'Authentication required. Set ANTHROPIC_API_KEY environment variable or run "claude login" for local development.'
          })
        } else {
          this.onEvent({
            type: 'error',
            error: error.message
          })
        }
      }
      throw error
    }
  }

  private handleMessage(message: SDKMessage): void {
    switch (message.type) {
      case 'assistant': {
        const assistantMsg = message as SDKAssistantMessage
        const content = assistantMsg.message?.content
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && 'text' in block) {
              this.onEvent({
                type: 'message',
                content: block.text
              })
            } else if (block.type === 'tool_use' && 'name' in block) {
              this.onEvent({
                type: 'tool_use',
                tool: block.name
              })
            }
          }
        }
        break
      }

      case 'result': {
        const resultMsg = message as SDKResultMessage
        if (resultMsg.subtype !== 'success') {
          this.onEvent({
            type: 'error',
            error: `Session ended: ${resultMsg.subtype}`
          })
        }
        break
      }

      case 'system': {
        // System messages are for internal tracking
        if ('subtype' in message && message.subtype === 'init') {
          console.log('System init:', message.session_id)
        }
        break
      }
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  async generateTicket(): Promise<TicketData> {
    const diff = await this.workspace.getDiff()

    // Generate title from user requests
    const title = this.userRequests.length > 0
      ? `Mockup: ${this.userRequests[0].substring(0, 50)}${this.userRequests[0].length > 50 ? '...' : ''}`
      : 'Website Mockup'

    // Generate Claude Code prompt
    const prompt = this.generateClaudeCodePrompt()

    return {
      title,
      prompt,
      changes: diff
    }
  }

  private generateClaudeCodePrompt(): string {
    const requests = this.userRequests.map((r, i) => `${i + 1}. "${r}"`).join('\n')

    // Build tech stack section if detected
    let techStackSection = ''
    if (this.promptContext && this.promptContext.techStack.framework !== 'vanilla') {
      const { framework, styling, typescript, uiLibrary } = this.promptContext.techStack
      techStackSection = `
## Detected Tech Stack
- Framework: ${framework}${typescript ? ' + TypeScript' : ''}
- Styling: ${styling}
${uiLibrary ? `- UI Library: ${uiLibrary}` : ''}

Adapt the mockup changes to match your ${framework} patterns and ${styling} conventions.
`
    }

    // Build patterns section if we have CSS classes
    let patternsSection = ''
    if (this.promptContext?.patterns.cssClasses.length) {
      const topClasses = this.promptContext.patterns.cssClasses.slice(0, 10)
      patternsSection = `
## Common CSS Classes in Codebase
${topClasses.map(c => `- ${c}`).join('\n')}

Use these established patterns where applicable.
`
    }

    return `# Mockup Implementation Request

## What the User Requested
${requests}
${techStackSection}
## Changes Made in Mockup

The following changes were made to create the visual mockup. Implement these changes in the actual codebase:

### Summary of Changes

${this.getSummaryFromHistory()}
${patternsSection}
## Implementation Notes
- The mockup uses placeholder/hardcoded content where dynamic data is needed
- Review each change and adapt for your actual component structure
- Consider existing styling patterns in your codebase

## How to Implement
1. Navigate to your project root
2. Run \`claude\` to start Claude Code
3. Paste this entire prompt
4. Claude will read the relevant files and implement the changes

---
*Generated by Mockup AI*`
  }

  private getSummaryFromHistory(): string {
    // Extract assistant responses from conversation history
    const assistantMessages = this.conversationHistory
      .filter((m): m is SDKAssistantMessage => m.type === 'assistant')

    if (assistantMessages.length === 0) {
      return 'Changes were made based on user requests.'
    }

    // Get text from the last assistant message
    const lastMessage = assistantMessages[assistantMessages.length - 1]
    const content = lastMessage.message?.content
    if (Array.isArray(content)) {
      const textBlocks = content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text' && 'text' in b)
        .map(b => b.text)
        .join('')

      return textBlocks.substring(0, 500)
    }

    return 'Changes were made based on user requests.'
  }
}
