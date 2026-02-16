/**
 * Styled-components specific prompt guidance
 */

export function getStyledComponentsGuidance(): string {
  return `
# Styled Components Styling
This project uses styled-components for styling.

When making mockup changes:
- Existing class names may have generated prefixes (e.g., sc-bdVaJa)
- In the mockup, add new styles to styles.css
- Use descriptive class names that match the component purpose
- Keep the styling approach consistent with CSS-in-JS patterns
- Prefer adding new classes over modifying existing generated ones`
}
