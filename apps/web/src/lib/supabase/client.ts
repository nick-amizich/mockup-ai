import { createBrowserClient } from '@supabase/ssr'

// Note: For full type safety, run:
// npx supabase gen types typescript --project-id nclermoiesdkeefhjtaa > src/types/database.ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
