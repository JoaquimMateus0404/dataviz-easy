import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    console.warn("⚠️ Supabase não configurado. Algumas funcionalidades podem não funcionar.")
    // Retorna um objeto mock para evitar erros
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: null }, error: new Error("Supabase não configurado") }),
        signUp: () => Promise.resolve({ data: { user: null }, error: new Error("Supabase não configurado") }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: new Error("Supabase não configurado") }),
        update: () => ({ data: null, error: new Error("Supabase não configurado") }),
        delete: () => ({ data: null, error: new Error("Supabase não configurado") }),
      }),
    } as any
  }
  
  return createBrowserClient(url, key)
}
