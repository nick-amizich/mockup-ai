/**
 * Pattern Extractor
 *
 * Analyzes a repository to detect tech stack and extract code patterns
 * for use in dynamic prompt generation.
 */

import { promises as fs } from 'fs'
import path from 'path'
import type {
  TechStack,
  CodePatterns,
  ComponentPattern,
  ColorToken,
  FrameworkType,
  StylingType
} from './prompts/types.js'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/**
 * Detect the tech stack from repository files
 */
export async function detectTechStack(repoPath: string): Promise<TechStack> {
  let framework: FrameworkType = 'vanilla'
  let styling: StylingType = 'vanilla'
  let typescript = false
  let uiLibrary: string | undefined

  try {
    // Check package.json for dependencies
    const packageJsonPath = path.join(repoPath, 'package.json')
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson: PackageJson = JSON.parse(packageJsonContent)

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }

    // Detect framework
    if (allDeps['next'] || allDeps['react-dom']) {
      framework = 'react'
    } else if (allDeps['vue']) {
      framework = 'vue'
    } else if (allDeps['svelte'] || allDeps['@sveltejs/kit']) {
      framework = 'svelte'
    } else if (allDeps['@angular/core']) {
      framework = 'angular'
    }

    // Detect TypeScript
    typescript = !!(allDeps['typescript'] || allDeps['@types/react'] || allDeps['@types/node'])

    // Detect styling
    if (allDeps['tailwindcss']) {
      styling = 'tailwind'
    } else if (allDeps['styled-components'] || allDeps['@emotion/styled']) {
      styling = 'styled-components'
    } else if (framework === 'react' || framework === 'vue') {
      // React/Vue often use CSS modules by default
      const hasCSSModules = await checkForCSSModules(repoPath)
      if (hasCSSModules) {
        styling = 'css-modules'
      }
    }

    // Detect UI libraries
    if (allDeps['@radix-ui/react-dialog'] || allDeps['@radix-ui/react-dropdown-menu']) {
      uiLibrary = 'shadcn/ui'
    } else if (allDeps['@mui/material']) {
      uiLibrary = 'Material UI'
    } else if (allDeps['@chakra-ui/react']) {
      uiLibrary = 'Chakra UI'
    } else if (allDeps['antd']) {
      uiLibrary = 'Ant Design'
    }
  } catch {
    // No package.json or parse error, try file-based detection
    const files = await getRepoFiles(repoPath, 10)

    if (files.some(f => f.endsWith('.tsx') || f.endsWith('.jsx'))) {
      framework = 'react'
    } else if (files.some(f => f.endsWith('.vue'))) {
      framework = 'vue'
    } else if (files.some(f => f.endsWith('.svelte'))) {
      framework = 'svelte'
    }

    typescript = files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))

    // Check for Tailwind config
    if (files.some(f => f.includes('tailwind.config'))) {
      styling = 'tailwind'
    }
  }

  return { framework, styling, typescript, uiLibrary }
}

/**
 * Check if repository uses CSS Modules
 */
async function checkForCSSModules(repoPath: string): Promise<boolean> {
  const files = await getRepoFiles(repoPath, 50)
  return files.some(f => f.endsWith('.module.css') || f.endsWith('.module.scss'))
}

/**
 * Get a limited list of repo files
 */
async function getRepoFiles(repoPath: string, limit: number): Promise<string[]> {
  const files: string[] = []
  const excludes = ['node_modules', '.git', '.next', 'dist', 'build', '.cache']

  async function walk(dir: string): Promise<void> {
    if (files.length >= limit) return

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (files.length >= limit) break
        if (excludes.includes(entry.name)) continue
        if (entry.name.startsWith('.')) continue

        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await walk(fullPath)
        } else {
          files.push(fullPath.replace(repoPath + '/', ''))
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  await walk(repoPath)
  return files
}

/**
 * Extract code patterns from a repository
 */
export async function extractPatterns(repoPath: string): Promise<CodePatterns> {
  const [components, cssClasses, colorTokens, layoutPatterns] = await Promise.all([
    findComponentPatterns(repoPath),
    extractCSSClasses(repoPath),
    findColorTokens(repoPath),
    findLayoutPatterns(repoPath)
  ])

  return {
    componentPatterns: components,
    cssClasses,
    colorTokens,
    layoutPatterns
  }
}

/**
 * Find component patterns in the repository
 */
async function findComponentPatterns(repoPath: string): Promise<ComponentPattern[]> {
  const patterns: ComponentPattern[] = []
  const componentDirs = ['components', 'src/components', 'app/components', 'lib/components']

  for (const dir of componentDirs) {
    const fullPath = path.join(repoPath, dir)
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Component folder (e.g., Button/)
          patterns.push({
            name: entry.name,
            path: path.join(dir, entry.name),
            type: 'component'
          })
        } else if (entry.isFile() && /\.(tsx?|jsx?|vue|svelte)$/.test(entry.name)) {
          // Component file
          const name = entry.name.replace(/\.(tsx?|jsx?|vue|svelte)$/, '')
          patterns.push({
            name,
            path: path.join(dir, entry.name),
            type: 'component'
          })
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return patterns.slice(0, 20) // Limit to 20 components
}

/**
 * Extract CSS classes commonly used in the codebase
 */
async function extractCSSClasses(repoPath: string): Promise<string[]> {
  const classCount = new Map<string, number>()
  const files = await getRepoFiles(repoPath, 100)
  const codeFiles = files.filter(f => /\.(tsx?|jsx?|vue|svelte|html)$/.test(f))

  // Regex patterns for extracting classes
  const classPatterns = [
    /className=["']([^"']+)["']/g,    // React className=""
    /className=\{`([^`]+)`\}/g,        // React className={`...`}
    /class=["']([^"']+)["']/g,         // HTML/Vue class=""
    /:class=["']\{([^}]+)\}["']/g,     // Vue :class="{...}"
  ]

  for (const file of codeFiles.slice(0, 30)) {
    try {
      const content = await fs.readFile(path.join(repoPath, file), 'utf-8')

      for (const pattern of classPatterns) {
        let match
        while ((match = pattern.exec(content)) !== null) {
          // Split class string into individual classes
          const classes = match[1].split(/\s+/).filter(c => c && !c.startsWith('$'))

          for (const cls of classes) {
            // Skip dynamic/interpolated classes
            if (cls.includes('{') || cls.includes('$')) continue
            classCount.set(cls, (classCount.get(cls) || 0) + 1)
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Sort by frequency and return top classes
  return Array.from(classCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([cls]) => cls)
}

/**
 * Find color tokens/variables in the codebase
 */
async function findColorTokens(repoPath: string): Promise<ColorToken[]> {
  const tokens: ColorToken[] = []

  // Check for Tailwind config colors
  const tailwindPaths = [
    'tailwind.config.js',
    'tailwind.config.ts',
    'tailwind.config.mjs'
  ]

  for (const configPath of tailwindPaths) {
    try {
      const content = await fs.readFile(path.join(repoPath, configPath), 'utf-8')

      // Look for common theme colors
      const colorMatches = content.match(/['"]?(primary|secondary|accent|background|foreground|muted|border|card)['"]?\s*:/gi)
      if (colorMatches) {
        for (const match of colorMatches) {
          const name = match.replace(/['":\s]/g, '').toLowerCase()
          tokens.push({
            name,
            value: '', // We don't need the actual value for prompts
            usage: categorizeColor(name)
          })
        }
      }
    } catch {
      // Config doesn't exist
    }
  }

  // Check CSS variables in globals.css or similar
  const cssFiles = ['globals.css', 'src/globals.css', 'app/globals.css', 'styles/globals.css']

  for (const cssFile of cssFiles) {
    try {
      const content = await fs.readFile(path.join(repoPath, cssFile), 'utf-8')

      // Extract CSS custom properties
      const varMatches = content.matchAll(/--([a-z-]+):\s*([^;]+);/gi)
      for (const match of varMatches) {
        const name = match[1]
        const value = match[2].trim()

        // Only include color-related variables
        if (isColorValue(value) || name.includes('color') || name.includes('bg') || name.includes('text')) {
          tokens.push({
            name: `--${name}`,
            value,
            usage: categorizeColor(name)
          })
        }
      }
    } catch {
      // File doesn't exist
    }
  }

  return tokens.slice(0, 30)
}

/**
 * Check if a value looks like a color
 */
function isColorValue(value: string): boolean {
  return /^#|^rgb|^hsl|^oklch|^color\(/.test(value.toLowerCase())
}

/**
 * Categorize a color token by its name
 */
function categorizeColor(name: string): ColorToken['usage'] {
  name = name.toLowerCase()
  if (name.includes('background') || name.includes('bg')) return 'background'
  if (name.includes('text') || name.includes('foreground')) return 'text'
  if (name.includes('border')) return 'border'
  if (name.includes('accent') || name.includes('primary') || name.includes('secondary')) return 'accent'
  return 'other'
}

/**
 * Find common layout patterns in the codebase
 */
async function findLayoutPatterns(repoPath: string): Promise<string[]> {
  const patterns: string[] = []

  // Check for common Tailwind layout patterns
  const files = await getRepoFiles(repoPath, 50)
  const codeFiles = files.filter(f => /\.(tsx?|jsx?|vue|svelte)$/.test(f))

  const layoutClasses = new Map<string, number>()
  const layoutPatterns = [
    'flex',
    'grid',
    'container',
    'flex-col',
    'flex-row',
    'items-center',
    'justify-center',
    'justify-between',
    'gap-',
    'space-x-',
    'space-y-',
    'max-w-',
    'mx-auto'
  ]

  for (const file of codeFiles.slice(0, 20)) {
    try {
      const content = await fs.readFile(path.join(repoPath, file), 'utf-8')

      for (const pattern of layoutPatterns) {
        if (content.includes(pattern)) {
          layoutClasses.set(pattern, (layoutClasses.get(pattern) || 0) + 1)
        }
      }
    } catch {
      // Ignore
    }
  }

  // Return the most common layout patterns
  return Array.from(layoutClasses.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([pattern]) => pattern)
}
