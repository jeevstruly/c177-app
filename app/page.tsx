'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const supabase = createSupabaseBrowserClient()
  const [email, setEmail] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setEmail(null)
  }

  const handleSend = async () => {
    if (!input.trim()) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    })

    const data = await res.json()
    setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    setLoading(false)
  }

  if (!email) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>177/179 Columbia Heights</h1>
        <h2>Board Portal</h2>
        <button onClick={handleLogin}>Sign in with Google</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>177/179 Board Portal</h1>
        <div>
          <span style={{ marginRight: '1rem', fontSize: '0.9rem' }}>{email}</span>
          <button onClick={handleLogout}>Sign out</button>
        </div>
      </div>

      <div style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '1rem',
        height: '500px',
        overflowY: 'auto',
        marginBottom: '1rem',
        backgroundColor: '#f9f9f9'
      }}>
        {messages.length === 0 && (
          <p style={{ color: '#888' }}>Ask anything about the March 2026 financials.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: '1rem',
            textAlign: m.role === 'user' ? 'right' : 'left'
          }}>
            <span style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              backgroundColor: m.role === 'user' ? '#0070f3' : '#fff',
              color: m.role === 'user' ? '#fff' : '#000',
              border: m.role === 'assistant' ? '1px solid #ccc' : 'none',
              maxWidth: '70%',
              textAlign: 'left'
            }}>
              {m.content}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ color: '#888' }}>Thinking...</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about finances, delinquencies, expenses..."
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '1rem'
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: '0.5rem 1.5rem',
            borderRadius: '8px',
            backgroundColor: '#0070f3',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}