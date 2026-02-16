/**
 * React-specific prompt guidance
 */

export function getReactGuidance(hasTypeScript: boolean, uiLibrary?: string): string {
  let guidance = `
# React Project Context
This is a React${hasTypeScript ? ' + TypeScript' : ''} project.`

  if (uiLibrary) {
    guidance += `
UI Library: ${uiLibrary}`
  }

  guidance += `

When making mockup changes:
- Use className (not class) attribute for CSS classes
- Preserve JSX-style attributes (onClick, onChange, etc.) even in the mockup
- Keep component structure intact - don't break React component boundaries
- If the page uses fragments (<>...</>), maintain that pattern
- Preserve data attributes (data-*) as they may be used for state/testing`

  return guidance
}
