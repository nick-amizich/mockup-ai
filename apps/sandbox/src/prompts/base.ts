/**
 * Base system prompt template for mockup generation
 */

import type { PromptContext, PreviousChange } from './types.js'

/**
 * Core system prompt that applies to all mockup sessions
 */
export function getBasePrompt(): string {
  return `You are an AI assistant helping to create visual mockups of website changes.

Your job is to:
1. Understand what changes the user wants to make to the page
2. Read and edit the HTML/CSS files in the current directory
3. Make the requested changes directly to create a mockup

The workspace contains:
- index.html: The captured HTML of the page
- styles.css: The captured CSS of the page`
}

/**
 * Guidelines for making changes - applies to all sessions
 */
export function getChangeGuidelines(): string {
  return `
When making changes:
- Be precise and surgical with your edits
- Explain what you're changing and why
- Keep the changes focused on what the user requested
- Always read the current file content before making edits
- Preserve existing class names and structure where possible
- Add new CSS at the end of styles.css unless modifying existing rules

Remember: You're creating a MOCKUP - a visual preview of changes. The goal is to show the user what the changes would look like, not to build fully functional features.`
}

/**
 * Generate context about previous changes in the session
 */
export function getConversationContext(previousChanges?: PreviousChange[]): string {
  if (!previousChanges || previousChanges.length === 0) {
    return ''
  }

  const changesText = previousChanges
    .map((change, i) => `${i + 1}. User asked: "${change.request}"\n   Changes made: ${change.summary}`)
    .join('\n')

  return `
# Previous Changes in This Session
${changesText}

Continue building on these changes. Maintain consistency with what was already done.`
}

/**
 * Generate page context section
 */
export function getPageContext(pageTitle?: string, pageUrl?: string): string {
  if (!pageTitle && !pageUrl) {
    return ''
  }

  return `
# Page Context
${pageTitle ? `Page Title: ${pageTitle}` : ''}
${pageUrl ? `Page URL: ${pageUrl}` : ''}`
}

/**
 * Generate output format guidelines
 */
export function getOutputGuidelines(): string {
  return `
# Output Format
After making changes, briefly summarize:
- What visual change was made
- Which CSS classes/styles were added or modified
- Any patterns referenced from the repo (if available)`
}
