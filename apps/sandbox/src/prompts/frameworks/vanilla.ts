/**
 * Vanilla HTML/JS-specific prompt guidance
 */

export function getVanillaGuidance(): string {
  return `
# Vanilla HTML/JS Project Context
This appears to be a vanilla HTML/CSS/JS project (no framework detected).

When making mockup changes:
- Use standard HTML attributes (class, id, onclick, etc.)
- Keep inline event handlers if present
- Preserve any data-* attributes for JS functionality
- Maintain existing HTML structure and semantics`
}
