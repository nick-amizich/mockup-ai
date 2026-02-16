/**
 * Prompt Composer
 *
 * Combines all prompt modules to create a dynamic, context-aware system prompt
 * based on the detected tech stack and codebase patterns.
 */

import type { PromptContext, TechStack, CodePatterns, FrameworkType, StylingType } from './types.js'
import { getBasePrompt, getChangeGuidelines, getConversationContext, getPageContext, getOutputGuidelines } from './base.js'
import { getReactGuidance } from './frameworks/react.js'
import { getVueGuidance } from './frameworks/vue.js'
import { getSvelteGuidance } from './frameworks/svelte.js'
import { getVanillaGuidance } from './frameworks/vanilla.js'
import { getTailwindGuidance } from './styling/tailwind.js'
import { getCSSModulesGuidance } from './styling/css-modules.js'
import { getStyledComponentsGuidance } from './styling/styled-components.js'
import { getVanillaCSSGuidance } from './styling/vanilla-css.js'

export * from './types.js'

/**
 * Get framework-specific guidance based on detected framework
 */
function getFrameworkGuidance(framework: FrameworkType, typescript: boolean, uiLibrary?: string): string {
  switch (framework) {
    case 'react':
      return getReactGuidance(typescript, uiLibrary)
    case 'vue':
      return getVueGuidance(typescript)
    case 'svelte':
      return getSvelteGuidance(typescript)
    case 'angular':
      return '' // Angular-specific guidance could be added
    case 'vanilla':
    default:
      return getVanillaGuidance()
  }
}

/**
 * Get styling-specific guidance based on detected styling approach
 */
function getStylingGuidance(
  styling: StylingType,
  patterns?: CodePatterns
): string {
  switch (styling) {
    case 'tailwind':
      return getTailwindGuidance(
        patterns?.cssClasses,
        patterns?.colorTokens?.map(t => t.name)
      )
    case 'css-modules':
      return getCSSModulesGuidance()
    case 'styled-components':
      return getStyledComponentsGuidance()
    case 'vanilla':
    default:
      return getVanillaCSSGuidance()
  }
}

/**
 * Generate repo context section from patterns
 */
function getRepoContextSection(patterns?: CodePatterns, repoStructure?: string): string {
  if (!patterns && !repoStructure) {
    return ''
  }

  let section = `
- repo/: The actual source code repository

IMPORTANT: Use the repo/ directory to understand:
- Component patterns and naming conventions
- CSS class naming conventions
- File organization patterns
- Design system tokens and variables`

  if (repoStructure) {
    section += `

${repoStructure}`
  }

  if (patterns?.componentPatterns && patterns.componentPatterns.length > 0) {
    section += `

# Detected Component Patterns
${patterns.componentPatterns.slice(0, 10).map(c => `- ${c.name} (${c.path})`).join('\n')}`
  }

  if (patterns?.layoutPatterns && patterns.layoutPatterns.length > 0) {
    section += `

# Common Layout Patterns
${patterns.layoutPatterns.slice(0, 10).map(p => `- ${p}`).join('\n')}`
  }

  section += `

When making mockup changes:
- Reference existing component patterns from repo/ when relevant
- Use the same CSS class naming conventions as the actual codebase
- Consider how the mockup would translate to real code`

  return section
}

/**
 * Main function to compose a complete system prompt
 */
export function composeSystemPrompt(
  context: PromptContext,
  repoStructure?: string
): string {
  const parts: string[] = []

  // Add page context if available
  const pageContextSection = getPageContext(context.pageTitle, context.pageUrl)
  if (pageContextSection) {
    parts.push(pageContextSection)
  }

  // Base prompt
  parts.push(getBasePrompt())

  // Repo context section (if available)
  const repoSection = getRepoContextSection(context.patterns, repoStructure)
  if (repoSection) {
    parts.push(repoSection)
  }

  // Framework-specific guidance
  const frameworkGuidance = getFrameworkGuidance(
    context.techStack.framework,
    context.techStack.typescript,
    context.techStack.uiLibrary
  )
  if (frameworkGuidance) {
    parts.push(frameworkGuidance)
  }

  // Styling-specific guidance
  const stylingGuidance = getStylingGuidance(
    context.techStack.styling,
    context.patterns
  )
  if (stylingGuidance) {
    parts.push(stylingGuidance)
  }

  // Previous changes context
  const conversationContext = getConversationContext(context.previousChanges)
  if (conversationContext) {
    parts.push(conversationContext)
  }

  // Output guidelines
  parts.push(getOutputGuidelines())

  // Change guidelines (always last before any task)
  parts.push(getChangeGuidelines())

  return parts.join('\n')
}

/**
 * Create a default context when no tech stack is detected
 */
export function createDefaultContext(): PromptContext {
  return {
    techStack: {
      framework: 'vanilla',
      styling: 'vanilla',
      typescript: false
    },
    patterns: {
      componentPatterns: [],
      cssClasses: [],
      colorTokens: [],
      layoutPatterns: []
    }
  }
}
