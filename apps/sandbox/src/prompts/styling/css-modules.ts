/**
 * CSS Modules-specific prompt guidance
 */

export function getCSSModulesGuidance(): string {
  return `
# CSS Modules Styling
This project uses CSS Modules for styling.

When making mockup changes:
- Existing class names may have hash suffixes (e.g., Button_primary__3fgh)
- In the mockup, add styles to styles.css using plain class names
- Use descriptive, scoped class names (e.g., .header-title, .nav-item)
- Follow BEM-like naming if the codebase uses it
- Keep selectors simple and avoid deep nesting`
}
