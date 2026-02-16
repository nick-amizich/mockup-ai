/**
 * Tech stack detection types for dynamic prompt generation
 */

export type FrameworkType = 'react' | 'vue' | 'svelte' | 'angular' | 'vanilla'
export type StylingType = 'tailwind' | 'css-modules' | 'styled-components' | 'vanilla'

export interface TechStack {
  framework: FrameworkType
  styling: StylingType
  typescript: boolean
  uiLibrary?: string // e.g., 'shadcn', 'mui', 'chakra'
}

export interface CodePatterns {
  // Component patterns found in the repo
  componentPatterns: ComponentPattern[]
  // CSS classes most commonly used
  cssClasses: string[]
  // Color tokens/variables found
  colorTokens: ColorToken[]
  // Layout patterns
  layoutPatterns: string[]
}

export interface ComponentPattern {
  name: string
  path: string
  type: 'component' | 'layout' | 'page'
}

export interface ColorToken {
  name: string
  value: string
  usage: 'background' | 'text' | 'border' | 'accent' | 'other'
}

export interface PromptContext {
  techStack: TechStack
  patterns: CodePatterns
  pageTitle?: string
  pageUrl?: string
  previousChanges?: PreviousChange[]
}

export interface PreviousChange {
  request: string
  summary: string
}
