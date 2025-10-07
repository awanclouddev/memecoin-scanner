"use client"

import React, { useEffect, useState } from 'react'

export default function BackupsPage() {
  const [backups, setBackups] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [inputSecret, setInputSecret] = useState('')

  function getSecret(): string {
    if (typeof window === 'undefined') return ''
    const dev = (window as any).__SCRAPE_SECRET
    if (dev) return dev
    return localStorage.getItem('memecoin.scrapeSecret') || ''
  }

  async function saveSecret(s: string) {
    if (typeof window === 'undefined') return
    localStorage.setItem('memecoin.scrapeSecret', s)
    setInputSecret(s)
  }

  async function load() {
    setLoading(true)
    setMessage(null)
    try {
      const secret = getSecret()
      const headers: Record<string,string> = {}
      if (secret) headers['Authorization'] = `Bearer ${secret}`
      const res = await fetch('/api/admin/backups', { headers })
      const j = await res.json()
      if (j && Array.isArray(j.backups)) setBackups(j.backups)
      else setMessage('Failed to load backups')
    } catch (e) {
      setMessage('Failed to load backups')
    } finally { setLoading(false) }
  }

  async function restore(fn: string) {
    setLoading(true)
    setMessage(null)
    try {
      const secret = getSecret()
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (secret) headers['Authorization'] = `Bearer ${secret}`
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename: fn })
      })
      const j = await res.json()
      if (j && j.status === 'ok') setMessage(`Restored ${fn}`)
      else setMessage(j.message || 'Restore failed')
      await load()
    } catch (e) {
      setMessage('Restore failed')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    // initialize inputSecret from localStorage or dev-global
    if (typeof window !== 'undefined') {
      setInputSecret(localStorage.getItem('memecoin.scrapeSecret') || (window as any).__SCRAPE_SECRET || '')
    }
    load()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Backup files</h2>

      <div className="mb-4">
        <label className="block text-sm mb-1">Admin secret (saved locally)</label>
        <div className="flex gap-2">
          <input value={inputSecret} onChange={e => setInputSecret(e.target.value)} className="px-3 py-2 border rounded w-full" />
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => saveSecret(inputSecret)}>Save</button>
          <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => { localStorage.removeItem('memecoin.scrapeSecret'); setInputSecret(''); }}>Clear</button>
        </div>
      </div>

      {message ? <div className="mb-3 text-sm text-gray-700">{message}</div> : null}
      {loading ? <div>Loading...</div> : null}
      <ul className="space-y-2">
        {backups.map(b => (
          <li key={b} className="flex items-center justify-between p-3 border rounded">
            <div className="text-sm">{b}</div>
            <div>
              <button className="px-3 py-1 text-sm bg-green-600 text-white rounded" onClick={() => restore(b)}>Restore</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
