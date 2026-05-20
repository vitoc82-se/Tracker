import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [logUrl, setLogUrl] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!logUrl.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const missing = results
    ? results.players.filter(p => !p.flask || !p.food || !p.rune || !p.potion)
    : [];

  return (
    <>
      <Head>
        <title>Use The Pots</title>
        <meta name="description" content="Check WoW consumable usage from Warcraft Logs" />
      </Head>
      <div className="container">
        <h1>Use The Pots</h1>
        <p className="subtitle">Check who forgot their consumables</p>

        <div className="input-row">
          <input
            type="text"
            placeholder="Paste Warcraft Logs URL (e.g. https://www.warcraftlogs.com/reports/AbCd1234)"
            value={logUrl}
            onChange={e => setLogUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyze()}
          />
          <button className="btn" onClick={analyze} disabled={loading}>
            {loading ? 'Analyzing...' : 'Check Consumables'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {results && (
          <>
            <div className="results-header">
              <h2>{results.title}</h2>
              <p>
                {results.killCount} kill{results.killCount !== 1 ? 's' : ''} found &middot;{' '}
                {results.players.length} players
              </p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Flask</th>
                  <th>Food</th>
                  <th>Rune</th>
                  <th>Potion</th>
                </tr>
              </thead>
              <tbody>
                {results.players.map(player => (
                  <tr key={player.name}>
                    <td className="player-name">{player.name}</td>
                    <td>{player.flask ? <span className="check">✓</span> : <span className="cross">✗</span>}</td>
                    <td>{player.food ? <span className="check">✓</span> : <span className="cross">✗</span>}</td>
                    <td>{player.rune ? <span className="check">✓</span> : <span className="cross">✗</span>}</td>
                    <td>{player.potion ? <span className="check">✓</span> : <span className="cross">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {missing.length > 0 && (
              <div className="summary">
                <h3>Missing consumables</h3>
                <ul>
                  {missing.map(p => {
                    const lacking = [];
                    if (!p.flask) lacking.push('flask');
                    if (!p.food) lacking.push('food');
                    if (!p.rune) lacking.push('rune');
                    if (!p.potion) lacking.push('potion');
                    return <li key={p.name}>{p.name}: {lacking.join(', ')}</li>;
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
