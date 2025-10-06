'use client'

import { useState, useEffect } from 'react';
import { Coin } from '../../lib/types';

export default function CoinList() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCoins() {
      try {
        const response = await fetch('/api/coins');
        const data = await response.json();
        setCoins(data.data || []);
        setError(null);
      } catch (err) {
        setError('Failed to load coins');
        console.error('Error fetching coins:', err);
      } finally {
        setLoading(false);
      }
    }

    const interval = setInterval(fetchCoins, 30000); // Refresh every 30s
    fetchCoins();
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!coins.length) return <div>No coins found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Trending Memecoins</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Symbol</th>
              <th className="px-4 py-2">Price (USD)</th>
              <th className="px-4 py-2">24h Change</th>
              <th className="px-4 py-2">Market Cap</th>
              <th className="px-4 py-2">Volume (24h)</th>
              <th className="px-4 py-2">Liquidity</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => (
              <tr key={coin.pairAddress || coin.name} className="border-t">
                <td className="px-4 py-2">
                  <a 
                    href={coin.dexscreenerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {coin.name}
                  </a>
                </td>
                <td className="px-4 py-2">{coin.symbol}</td>
                <td className="px-4 py-2">${coin.priceUsd.toFixed(8)}</td>
                <td className={`px-4 py-2 ${coin.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {coin.priceChange24h.toFixed(2)}%
                </td>
                <td className="px-4 py-2">${coin.marketCap.toLocaleString()}</td>
                <td className="px-4 py-2">${coin.volume24h.toLocaleString()}</td>
                <td className="px-4 py-2">${coin.liquidity.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}