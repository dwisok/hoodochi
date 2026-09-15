import { useEffect, useState } from 'react'
import { Hoodochi } from '../components/Hoodochi'
import { Link } from '../router'
import { readCollection } from '../pets'
import type { PetState } from '../pets'
import { TOKENS } from '../sprites-v2'
import { onChain } from '../chain'

/** /graveyard — the ones that died, the ticker that did it, how long they lasted. */
export function GraveyardPage() {
  const [data, setData] = useState<{ loading: boolean; dead: PetState[]; total: number; error: string | null }>({ loading: onChain, dead: [], total: 0, error: null })

  useEffect(() => {
    document.title = 'Hoodochi — graveyard'
    if (!onChain) return
    let live = true
    readCollection()
      .then((r) => live && setData({ loading: false, total: r.total, dead: r.pets.filter((p) => !p.alive), error: null }))
      .catch((e: Error) => live && setData((d) => ({ ...d, loading: false, error: e.message.split('\n')[0] })))
    return () => {
      live = false
    }
  }, [])

  return (
    <section className="page grave-page">
      <p className="eyebrow">The graveyard</p>
      <h1 className="section-title">
        <span className="hl hl-lavender">{data.loading ? 'Reading the chain…' : data.dead.length === 0 ? 'Nobody has died. Yet.' : `${data.dead.length} did not make it.`}</span>
      </h1>
      <p className="grave-lede">A dead Hoodochi stays on-chain: the ticker that killed it, the week it happened, and nothing else, because everything it wore burned with it.</p>

      {data.error && <p className="pet-empty">{data.error}</p>}
      {!data.loading && onChain && data.dead.length === 0 && (
        <p className="pet-empty">
          {data.total === 0 ? 'Nobody has been minted either.' : `${data.total} alive so far.`} <Link href="/pets">See them.</Link>
        </p>
      )}

      <ul className="grave-grid">
        {data.dead.map((p) => {
          const tok = TOKENS[p.id - 1]
          return (
            <li key={p.id} className="grave-card">
              <Link href={`/pet/${p.id}`}>
                <div className="grave-stone">
                  <span className="grave-stone-ticker">{p.deathTicker ?? '?'}</span>
                  <span className="grave-stone-week">
                    wk {p.weeksPlayed}
                  </span>
                </div>
                <Hoodochi px={3} body={tok.body} eyes={tok.eyes} antenna={tok.antenna} ticker={p.deathTicker} status="dead" bg="night" />
                <b>#{p.id}</b>
                <span>
                  Killed by {p.deathTicker ?? '?'} after {p.weeksPlayed} {p.weeksPlayed === 1 ? 'week' : 'weeks'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
