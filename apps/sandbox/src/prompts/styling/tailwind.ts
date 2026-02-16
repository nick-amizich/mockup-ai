/**
 * Tailwind CSS-specific prompt guidance
 */

export function getTailwindGuidance(detectedClasses?: string[], colorTokens?: string[]): string {
  let guidance = `
# Tailwind CSS Styling
This project uses Tailwind CSS for styling.

When making mockup changes:
- Use Tailwind utility classes instead of custom CSS when possible
- Common patterns: flex, items-center, justify-between, gap-*, p-*, m-*, text-*, bg-*
- Use responsive prefixes: sm:, md:, lg:, xl: for breakpoints
- Use state variants: hover:, focus:, active:, disabled:
- Prefer spacing scale: 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, etc.`

  if (colorTokens && colorTokens.length > 0) {
    guidance += `

# Theme Colors Detected
Use these colors instead of arbitrary values:
${colorTokens.slice(0, 15).map(c => `- ${c}`).join('\n')}`
  }

  if (detectedClasses && detectedClasses.length > 0) {
    guidance += `

# Common Classes in This Codebase
These Tailwind classes are frequently used:
${detectedClasses.slice(0, 20).map(c => `- ${c}`).join('\n')}

Prefer these established patterns over introducing new ones.`
  }

  guidance += `

# Tailwind Best Practices
- Don't add inline styles when Tailwind classes exist
- Use dark: prefix for dark mode styles
- Use text-primary, bg-background, border-border for theme colors
- Group related utilities: layout first, then spacing, then typography, then colors`

  return guidance
}
