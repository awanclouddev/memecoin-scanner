"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

// utility used by both the table and the modal
function formatCompact(n?: number) {
  if (!n || n === 0) return '0'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return n.toLocaleString()
}

// format timestamp to UTC+7 with dd-MM-yyyy hh:mm:ss format
function formatTimestamp(timestamp?: string) {
  if (!timestamp) return '—'
  try {
    const date = new Date(timestamp)
    // Convert to UTC+7
    const utc7Date = new Date(date.getTime() + (7 * 60 * 60 * 1000))
    const day = String(utc7Date.getUTCDate()).padStart(2, '0')
    const month = String(utc7Date.getUTCMonth() + 1).padStart(2, '0')
    const year = utc7Date.getUTCFullYear()
    const hours = String(utc7Date.getUTCHours()).padStart(2, '0')
    const minutes = String(utc7Date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(utc7Date.getUTCSeconds()).padStart(2, '0')
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
  } catch {
    return '—'
  }
}
import { Coin } from '../../lib/types'

type SortKey = keyof Omit<Coin, 'dexscreenerUrl' | 'timestamp' | 'pairAddress'> | 'name' | 'symbol'

export default function CoinList() {
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [query, setQuery] = useState('')
  const [isFallback, setIsFallback] = useState(false)

  // selection hook
  const [selected, setSelected] = useState<Coin | null>(null)


  // sorting state
  const [sortBy, setSortBy] = useState<SortKey>('priceUsd')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    let mounted = true

    async function fetchCoins() {
      try {
        const res = await fetch('/api/coins', { cache: 'no-store' })
        const data = await res.json()
        if (!mounted) return
        setCoins(data.data || [])
        setIsFallback(Boolean(data._fallback === 'backup'))
        setError(null)
      } catch (e) {
        console.error('Fetch coins error', e)
        if (!mounted) return
        setError('Failed to load coins')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    fetchCoins()
    const id = setInterval(fetchCoins, 30000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  // fetch daemon metrics (optional)
  useEffect(() => {
    let mounted = true
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/daemon-metrics', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        setMetrics(data)
      } catch (e) {
        // ignore - metrics are optional
      }
    }
    fetchMetrics()
    const mid = setInterval(fetchMetrics, 30000)
    return () => { mounted = false; clearInterval(mid) }
  }, [])

  const sorted = useMemo(() => {
    const arr = [...coins]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a: any, b: any) => {
      const va = a[sortBy]
      const vb = b[sortBy]
      if (va == null && vb == null) return 0
      if (va == null) return -1 * dir
      if (vb == null) return 1 * dir
      if (typeof va === 'string') return va.localeCompare(vb) * dir
      return (va - vb) * dir
    })
    return arr
  }, [coins, sortBy, sortDir])

  // apply client-side filtering by name or symbol
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(c => (c.name || '').toLowerCase().includes(q) || (c.symbol || '').toLowerCase().includes(q))
  }, [sorted, query])


  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(k); setSortDir('desc') }
  }


  // New table header to match reference: Tracking ID, Product, Customer(symbol), Date, Amount, Payment Mode, Status, Action
  // Table header matching the scraped data fields
  const head = [
    { key: 'name', label: 'Name' },
    { key: 'pairAddress', label: 'Address' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'priceUsd', label: 'Price (USD)' },
    { key: 'liquidity', label: 'Liquidity' },
    { key: 'marketCap', label: 'Market Cap' },
    { key: 'volume24h', label: 'Volume 24h' },
    { key: 'priceChange24h', label: '24h %' }
  ] as { key: SortKey | string, label: string }[]

  // we'll render all filtered items (no pagination)
  const pageItems = filtered

  function fmtDate(ts?: string) {
    if (!ts) return '—'
    try { return new Date(ts).toLocaleDateString() } catch { return ts }
  }

  function shortAddr(a?: string) {
    if (!a) return '—'
    return a.slice(0, 6) + '…' + a.slice(-4)
  }

  function avatarColor(s?: string) {
    if (!s) return '#777'
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
    const hue = Math.abs(h) % 360
    return `hsl(${hue} 70% 60%)`
  }

  function deriveDex(url?: string) {
    if (!url) return 'DEX'
    try {
      const u = new URL(url)
      return u.hostname.replace('www.', '')
    } catch { return 'DEX' }
  }

  function statusFromChange(pct?: number) {
    if (pct == null) return { label: 'Unknown', style: 'bg-gray-100 text-gray-700' }
    if (pct >= 5) return { label: 'Delivered', style: 'bg-green-100 text-green-700' }
    if (pct >= 0) return { label: 'Process', style: 'bg-amber-100 text-amber-700' }
    return { label: 'Canceled', style: 'bg-red-100 text-red-700' }
  }

  // early returns (run after hooks and derived values are declared to avoid conditional Hooks)
  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!coins.length) return <div className="p-6">No coins found</div>

  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-black">Trending Memecoins</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            Last: <strong>{formatTimestamp(metrics?.lastScrape)}</strong>
            {metrics && metrics.lastCount != null ? <span className="ml-2 text-gray-500">({metrics.lastCount} rows)</span> : null}
          </div>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            onClick={async () => {
              setLoading(true)
              try {
                const res = await fetch('/api/coins', { cache: 'no-store' })
                const d = await res.json()
                setCoins(d.data || [])
                setIsFallback(Boolean(d._fallback === 'backup'))
              } catch (e) {
                setError('Failed to refresh')
              } finally {
                setLoading(false)
              }
            }}
          >Refresh</button>
        </div>
      </div>

      {/* search removed per request */}

      {isFallback ? (
        <div className="mb-3 p-3 rounded border-l-4 border-yellow-400 bg-yellow-50 text-yellow-800">
          Data is currently being served from the latest local backup. The live scraper may have returned no results — check the daemon metrics or trigger a manual scrape if you control the server.
        </div>
      ) : null}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
  <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              {head.map(h => (
                <th key={h.key} className="px-4 py-3 font-medium text-gray-700">{h.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageItems.map((c, idx) => (
              <tr key={c.pairAddress || c.symbol} className={`border-t hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium min-w-24">{c.name}</td>

                <td className="px-4 py-3 text-sm text-gray-700 min-w-40">
                  <a href="#" onClick={(e) => { e.preventDefault(); setSelected(c) }} className="text-indigo-600 hover:underline">{shortAddr(c.pairAddress)}</a>
                </td>

                <td className="px-4 py-3 text-sm text-gray-700">{c.symbol}</td>

                <td className="px-4 py-3 text-sm font-medium text-black">${Number(c.priceUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>

                <td className="px-4 py-3 text-sm text-gray-600">${formatCompact(Number(c.liquidity || 0))}</td>

                <td className="px-4 py-3 text-sm text-gray-600">${formatCompact(Number(c.marketCap || 0))}</td>

                <td className="px-4 py-3 text-sm text-gray-600">${formatCompact(Number(c.volume24h || 0))}</td>

                <td className={`px-4 py-3 text-sm ${Number(c.priceChange24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(c.priceChange24h || 0).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination removed per request - show all rows */}

      {/* Modal rendered via portal to ensure overlay */}
      {selected ? <Modal onClose={() => setSelected(null)} coin={selected} /> : null}
    </div>
  )
}

// Simple portal modal component
function Modal({ onClose, coin }: { onClose: () => void, coin: Coin }) {
  const [container] = useState<HTMLDivElement | null>(() => (typeof document !== 'undefined' ? document.createElement('div') : null))

  useEffect(() => {
    if (!container) return
    container.className = 'modal-portal'
    document.body.appendChild(container)
    return () => { document.body.removeChild(container) }
  }, [container])

  if (!container) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-2xl p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-black">{coin.name} — {coin.symbol}</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500">Pair</div>
            <div className="font-medium text-black">{coin.pairAddress}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Price (USD)</div>
            <div className="font-medium text-black">${Number(coin.priceUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">24h change</div>
            <div className={`${coin.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'} font-medium text-black`}>{Number(coin.priceChange24h || 0).toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Liquidity</div>
            <div className="font-medium text-black">${formatCompact(Number(coin.liquidity || 0))}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <a className="px-3 py-2 bg-blue-600 text-white rounded text-sm" href={coin.dexscreenerUrl} target="_blank" rel="noreferrer">Open on Dexscreener</a>
          <button className="px-3 py-2 bg-green-600 text-white rounded text-sm" onClick={() => { navigator.clipboard?.writeText(coin.dexscreenerUrl); alert('Link copied') }}>Copy URL</button>
        </div>
      </div>
    </div>, container)
}