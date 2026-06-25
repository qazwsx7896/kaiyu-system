'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setLoading(false)

    if (res.ok) {
      const redirect = searchParams.get('redirect') || '/'
      router.push(redirect)
      router.refresh()
    } else {
      setError('密碼錯誤，請重新輸入')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f7f7f7',
      fontFamily: 'sans-serif',
      padding: 20,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff',
        borderRadius: 16,
        padding: 32,
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '0.5px solid #e0e0e0',
      }}>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6, color: '#1a1a1a', textAlign: 'center' }}>
          凱淯內勤生產系統
        </div>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' }}>
          請輸入公司通行密碼
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="請輸入密碼"
          autoFocus
          style={{
            width: '100%',
            fontSize: 18,
            padding: '14px 16px',
            borderRadius: 10,
            border: error ? '1.5px solid #E24B4A' : '1px solid #ccc',
            background: '#fff',
            color: '#1a1a1a',
            marginBottom: 12,
            textAlign: 'center',
            letterSpacing: 2,
          }}
        />

        {error && (
          <div style={{ color: '#A32D2D', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: '100%',
            fontSize: 16,
            fontWeight: 500,
            padding: '12px 0',
            borderRadius: 10,
            border: 'none',
            background: loading || !password ? '#ccc' : '#378ADD',
            color: '#fff',
            cursor: loading || !password ? 'default' : 'pointer',
          }}
        >
          {loading ? '驗證中...' : '進入系統'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
