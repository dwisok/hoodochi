import { useEffect, useState } from 'react'
import { Hoodochi } from '../components/Hoodochi'
import { Link } from '../router'
import { readCollection, statusWord } from '../pets'
import type { PetState } from '../pets'
import { TOKENS } from '../sprites-v2'
import { onChain } from '../chain'

type Filter = 'all' | 'staked' | 'idle' | 'dead'

const FILTERS: { key: Filter; label: string; test: (p: PetState) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'staked', label: 'Staked', test: (p) => p.alive && p.staked },
  { key: 'idle', label: 'Idle', test: (p) => p.alive && !p.staked },
  { key: 'dead', label: 'Dead', test: (p) => !p.alive },
]

/** /pets — every minted Hoodochi, live. */
export function PetsPage() {
  const [data, setData] = useState<{ loading: boolean; total: number; pets: PetState[]; error: string | null }>({ loading: onChain, total: 0, pets: [], error: null })
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    document.title = 'Hoodochi — the collection'
    if (!onChain) return
    let live = true
    readCollection()
      .then((r) => live && setData({ loading: false, total: r.total, pets: r.pets, error: null }))
      .catch((e: Error) => live && setData((d) => ({ ...d, loading: false, error: e.message.split('\n')[0] })))
    return () => {
      live = false
    }
  }, [])

  const staked = data.pets.filter((p) => p.alive && p.staked).length
  const dead = data.pets.filter((p) => !p.alive).length
  const shown = data.pets.filter(FILTERS.find((f) => f.key === filter)!.test)

  return (
    <section className="page pets-page">
      <p className="eyebrow">The collection · live</p>
      <h1 className="section-title">
        <span className="hl hl-sky">{data.loading ? 'Reading the chain…' : `${data.total} of 1000 minted.`}</span>
      </h1>
      {!data.loading && data.total > 0 && (
        <p className="pets-sum">
          {staked} staked · {data.total - staked - dead} idle · {dead} dead
        </p>
      )}

      <div className="pets-filters">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={`chip ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {!onChain && <p className="pet-empty">The contracts are not configured on this build.</p>}
      {data.error && <p className="pet-empty">{data.error}</p>}
      {!data.loading && onChain && data.total === 0 && (
        <p className="pet-empty">
          Nobody yet. <a href="/#play">Mint the first one.</a>
        </p>
      )}
      {!data.loading && data.total > 0 && shown.length === 0 && <p className="pet-empty">None in this state.</p>}

      <ul className="pets-grid">
        {shown.map((p) => {
          const tok = TOKENS[p.id - 1]
          return (
            <li key={p.id} className={`pet-card ${p.alive ? (p.staked ? 'is-staked' : '') : 'is-dead'}`}>
              <Link href={`/pet/${p.id}`}>
                <Hoodochi px={3} body={tok.body} eyes={tok.eyes} antenna={tok.antenna} ticker={p.ticker} equip={p.equip} status={p.alive ? (p.ticker ? 'alive' : 'sleeping') : 'dead'} bg={tok.background} />
                <b>#{p.id}</b>
                <span>{statusWord(p)}</span>
                <small>
                  lvl {p.level} · {p.weeksPlayed} wk
                </small>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
