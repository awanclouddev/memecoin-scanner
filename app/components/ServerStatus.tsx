"use client"

import React, { useEffect, useState } from 'react'

export default function ServerStatus() {
  const [status, setStatus] = useState<{ hasData: boolean; hasBackup: boolean } | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch('/api/server-status', { cache: 'no-store' })
        const j = await res.json()
        if (!mounted) return
        setStatus({ hasData: j.hasData, hasBackup: j.hasBackup })
      } catch (e) {
        // ignore
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  if (!status) return null
  if (status.hasData) return null
  if (!status.hasData && status.hasBackup) {
    return (
      <div className="w-full bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-3 text-sm">
        Warning: canonical data is empty but backups exist. The app may be serving backup data — check admin backups or trigger a manual scrape.
      </div>
    )
  }
  if (!status.hasData && !status.hasBackup) {
    return (
      <div className="w-full bg-red-50 border-l-4 border-red-400 text-red-800 p-3 text-sm">
        Critical: no canonical data and no backups found. Scraper/daemon may be failing.
      </div>
    )
  }
  return null
}
