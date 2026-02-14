import { query, type SDKMessage, type SDKAssistantMessage, type SDKResultMessage } from '@anthropic-ai/claude-code'
import { WorkspaceManager } from './workspace-manager.js'

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

export class ClaudeSession {
  private workspace: WorkspaceManager
  private onEvent: (event: SessionEvent) => void
  private userRequests: string[] = []
  private conversationHistory: SDKMessage[] = []
  private sessionId: string | null = null
  private abortController: AbortController | null = null

  constructor(workspace: WorkspaceManager, onEvent: (event: SessionEvent) => void) {
    this.workspace = workspace
    this.onEvent = onEvent
  }

  private getSystemPrompt(): string {
    return `You are an AI assistant helping to create visual mockups of website changes.

Your job is to:
1. Understand what changes the user wants to make to the page
2. Read and edit the HTML/CSS files in the current directory
3. Make the requested changes directly to create a mockup

The workspace contains:
- index.html: The captured HTML of the page
- styles.css: The captured CSS of the page

When making changes:
- Be precise and surgical with your edits
- Explain what you're changing and why
- Keep the changes focused on what the user requested
- Always read the current file content before making edits

Remember: You're creating a MOCKUP - a visual preview of changes. The goal is to show the user what the changes would look like, not to build fully functional features.`
  }

  async sendMessage(userMessage: string): Promise<void> {
    this.userRequests.push(userMessage)

    try {
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
          abortController: this.abortController
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

      if (lastAssistantText) {
        console.log('Claude completed response')
      }

      this.onEvent({ type: 'done' })

    } catch (error) {
      if (error instanceof Error) {
        // Check for common auth errors
        if (error.message.includes('not logged in') || error.message.includes('authentication')) {
          this.onEvent({
            type: 'error',
            error: 'Claude is not logged in. Please run "claude login" first.'
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

    return `# Mockup Implementation Request

## What the User Requested
${requests}

## Changes Made in Mockup

The following changes were made to create the visual mockup. Implement these changes in the actual codebase:

### Summary of Changes

${this.getSummaryFromHistory()}

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
