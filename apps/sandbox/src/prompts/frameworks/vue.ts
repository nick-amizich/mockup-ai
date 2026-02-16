/**
 * Vue-specific prompt guidance
 */

export function getVueGuidance(hasTypeScript: boolean): string {
  return `
# Vue Project Context
This is a Vue${hasTypeScript ? ' + TypeScript' : ''} project.

When making mockup changes:
- Preserve Vue directives (v-if, v-for, v-bind, etc.) in the HTML
- Use :class for dynamic class bindings, class for static
- Keep @event handlers intact (e.g., @click, @input)
- Preserve slot content areas
- Maintain Vue component naming conventions (PascalCase or kebab-case)`
}
