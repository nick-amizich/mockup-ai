// Types
export * from './types.js'

// Utility functions
export { formatDate, formatRelativeTime } from './utils.js'

// Constants
export const PLAN_LIMITS = {
  free: {
    sessions_per_month: 5,
    projects: 1
  },
  pro: {
    sessions_per_month: 100,
    projects: 10
  },
  team: {
    sessions_per_month: -1, // unlimited
    projects: -1 // unlimited
  }
} as const

export type PlanType = keyof typeof PLAN_LIMITS
