/**
 * Vanilla CSS-specific prompt guidance
 */

export function getVanillaCSSGuidance(): string {
  return `
# Vanilla CSS Styling
This project uses plain CSS for styling.

When making mockup changes:
- Follow existing naming conventions in styles.css
- Keep specificity low - prefer single class selectors
- Add new styles at the end of styles.css
- Use CSS custom properties (--var-name) if they exist in the codebase
- Maintain the existing code organization (sections, comments, etc.)`
}
