'use client'

import dynamic from 'next/dynamic'

const CoinList = dynamic(() => import('./components/CoinList'), {
  ssr: false,
  loading: () => <p>Loading...</p>
})

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <CoinList />
    </main>
  )
}
