/**
 * Svelte-specific prompt guidance
 */

export function getSvelteGuidance(hasTypeScript: boolean): string {
  return `
# Svelte Project Context
This is a Svelte${hasTypeScript ? ' + TypeScript' : ''} project.

When making mockup changes:
- Preserve Svelte syntax ({#if}, {#each}, {#await})
- Keep on:event handlers intact (e.g., on:click, on:input)
- Maintain bind: directives for two-way binding
- Preserve slot elements and their names
- Keep class: directives for conditional classes`
}
