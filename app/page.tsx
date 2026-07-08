'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

export default function Home() {
  const supabase = createSupabaseBrowserClient()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setEmail(null)
  }

  if (email) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>177/179 Columbia Heights</h1>
        <h2>Board Portal</h2>
        <p>Signed in as: {email}</p>
        <button onClick={handleLogout}>Sign out</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>177/179 Columbia Heights</h1>
      <h2>Board Portal</h2>
      <button onClick={handleLogin}>Sign in with Google</button>
    </div>
  )
}