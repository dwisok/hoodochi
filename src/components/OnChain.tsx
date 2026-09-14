import { Reveal } from './Reveal'
import { CHAIN, deployed, short } from '../chain'

/** Contract addresses, once deployed. Renders nothing before that. */
export function OnChain() {
  if (deployed.length === 0) return null
  return (
    <section className="chain">
      <div className="chain-inner">
        <Reveal>
          <p className="eyebrow">On-chain · {CHAIN.name}</p>
          <h2 className="section-title">The contracts are live.</h2>
        </Reveal>
        <ul className="chain-list">
          {deployed.map((c, i) => (
            <Reveal as="li" key={c.name} delay={i * 100}>
              <div className="chain-row">
                <span className="chain-name">{c.name}</span>
                <a className="chain-addr" href={`${CHAIN.explorer}/address/${c.address}`} target="_blank" rel="noreferrer" title={c.address}>
                  {short(c.address)} ↗
                </a>
              </div>
              <p className="chain-what">{c.what}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal delay={300}>
          <p className="chain-note">Sources on Blockscout. Yield is a number in a ledger until the legal review is done — not a token, not a share, not a promise.</p>
        </Reveal>
      </div>
    </section>
  )
}
