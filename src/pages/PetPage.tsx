import { useEffect, useState } from 'react'
import { Hoodochi } from '../components/Hoodochi'
import { Link } from '../router'
import { readOne, statusWord, fmtUnits, SLOT_KEYS } from '../pets'
import type { PetState } from '../pets'
import { TOKENS, SLOT_LABEL } from '../sprites-v2'
import { itemName } from '../items'
import { CHAIN, ADDRESSES, onChain, short } from '../chain'

const SITE = 'https://www.hoodochi.io'

/** /pet/:id — one Hoodochi, live from the chain: what it wears, what it's staked on, whether it lives. */
export function PetPage({ id }: { id: number }) {
  const tok = TOKENS[id - 1]
  const [state, setState] = useState<{ loading: boolean; total: number; pet: PetState | null; error: string | null }>({ loading: onChain, total: 0, pet: null, error: null })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.title = `Hoodochi #${id}`
    if (!onChain) return
    let live = true
    setState((s) => ({ ...s, loading: true, error: null }))
    readOne(id)
      .then((r) => live && setState({ loading: false, total: r.total, pet: r.pet, error: null }))
      .catch((e: Error) => live && setState((s) => ({ ...s, loading: false, error: e.message.split('\n')[0] })))
    return () => {
      live = false
    }
  }, [id])

  if (!tok) {
    return (
      <section className="page">
        <h1 className="section-title">There is no #{id}.</h1>
        <p>The collection stops at #1000.</p>
        <Link className="btn" href="/pets">
          See the collection
        </Link>
      </section>
    )
  }

  const pet = state.pet
  const worn = SLOT_KEYS.filter((s) => (pet?.equip[s] ?? 0) > 0)
  const explorerToken = `${CHAIN.explorer}/token/${ADDRESSES.hoodochi}/instance/${id}`
  const share = `https://x.com/intent/post?text=${encodeURIComponent(`Hoodochi #${id}${pet ? ` — ${statusWord(pet).toLowerCase()}` : ''} ${SITE}/pet/${id}`)}`
  const copy = () => {
    navigator.clipboard?.writeText(ADDRESSES.hoodochi).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <section className={`page pet-page ${pet && !pet.alive ? 'is-dead' : ''}`}>
      <p className="crumbs">
        <Link href="/pets">← all Hoodochi</Link>
      </p>
      <div className="pet-hero">
        <div className="pet-art">
          <Hoodochi px={7} body={tok.body} eyes={tok.eyes} antenna={tok.antenna} ticker={pet?.ticker ?? null} equip={pet?.equip ?? {}} status={pet ? (pet.alive ? (pet.staked ? 'alive' : pet.ticker ? 'alive' : 'sleeping') : 'dead') : 'sleeping'} bg={tok.background} />
        </div>
        <div className="pet-info">
          <p className="eyebrow">Hoodochi #{id} · born {tok.body} / {tok.eyes} eyes / {tok.antenna} antennae</p>
          <h1 className="section-title">
            {!onChain ? 'Not on-chain yet.' : state.loading ? 'Reading the chain…' : state.error ? 'Could not reach the chain.' : pet ? statusWord(pet) + '.' : `#${id} is not minted yet.`}
          </h1>

          {pet && (
            <>
              <ul className="pet-facts">
                <li>
                  <b>{pet.weeksPlayed}</b> {pet.weeksPlayed === 1 ? 'week' : 'weeks'} settled
                </li>
                <li>
                  <b>{worn.length}/5</b> items worn
                </li>
                <li>
                  <b>{pet.level}</b> level
                </li>
                <li>
                  <b>{fmtUnits(pet.pending)}</b> {pet.ticker ?? pet.deathTicker ?? ''} yield pending
                </li>
                {pet.owner && (
                  <li>
                    owner{' '}
                    <a href={`${CHAIN.explorer}/address/${pet.owner}`} target="_blank" rel="noreferrer">
                      {short(pet.owner)} ↗
                    </a>
                  </li>
                )}
              </ul>

              <h3 className="pet-sub">Wearing</h3>
              {worn.length === 0 ? (
                <p className="pet-empty">{pet.alive ? 'Nothing yet. Every up week adds one item.' : 'Nothing. It all burned with it.'}</p>
              ) : (
                <ul className="pet-worn">
                  {worn.map((s) => (
                    <li key={s} className={`t${pet.equip[s]}`}>
                      <span className="tier-num">{pet.equip[s]}</span>
                      {itemName(s, pet.equip[s]!)} <small>· {SLOT_LABEL[s]}</small>
                    </li>
                  ))}
                </ul>
              )}
              {!pet.alive && pet.deathTicker && <p className="pet-rip">Killed by a {pet.deathTicker} week after {pet.weeksPlayed} {pet.weeksPlayed === 1 ? 'week' : 'weeks'}. No respawns.</p>}
            </>
          )}

          {onChain && !state.loading && !pet && !state.error && (
            <p className="pet-empty">
              Minted so far: {state.total} of 1000.{' '}
              <a href="/#play">Mint one in the Game Boy.</a>
            </p>
          )}
          {state.error && <p className="pet-empty">{state.error}</p>}

          <div className="pet-links">
            {onChain && (
              <a className="btn" href={explorerToken} target="_blank" rel="noreferrer">
                On Blockscout ↗
              </a>
            )}
            <a className="btn btn-gold" href={share} target="_blank" rel="noreferrer">
              Share on X
            </a>
          </div>

          {onChain && (
            <details className="pet-wallet">
              <summary>Show it in your wallet</summary>
              <p>MetaMask does not detect NFTs on Robinhood Chain by itself. In the NFTs tab, choose “Import NFT” and paste:</p>
              <dl>
                <dt>Contract</dt>
                <dd>
                  <code>{ADDRESSES.hoodochi}</code>{' '}
                  <button type="button" className="chip" onClick={copy}>
                    {copied ? 'copied' : 'copy'}
                  </button>
                </dd>
                <dt>Token ID</dt>
                <dd>
                  <code>{id}</code>
                </dd>
              </dl>
              <p>The wallet shows the birth picture. What it wears right now is on this page.</p>
            </details>
          )}
        </div>
      </div>
    </section>
  )
}
