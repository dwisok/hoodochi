import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { HeroScene } from './components/HeroScene'
import { Hoodochi } from './components/Hoodochi'
import { Parade } from './components/Parade'
import { OnChain } from './components/OnChain'
import { Device } from './components/Device'
import { ItemRail } from './components/ItemRail'
import { Reveal } from './components/Reveal'
import { TOKENS } from './sprites-v2'

const X_HANDLE = 'hoodochidotio'
const X_URL = `https://x.com/${X_HANDLE}`

const TICKERS = ['NVDA', 'TSLA', 'GME', 'KO', 'AAPL', 'XOM', 'JPM', 'PFE', 'AMD', 'MSFT', 'DIS', 'F']

/** Two bands of collars, running against each other. */
function Marquee() {
  const items = [...TICKERS, ...TICKERS]
  return (
    <div className="marquee-wrap" aria-hidden>
      <div className="marquee">
        <div className="marquee-track">
          {items.map((t, i) => (
            <span key={i} className={`marquee-item c${i % 5}`}>
              <span className="collar-dot" />
              {t} collar
            </span>
          ))}
        </div>
      </div>
      <div className="marquee marquee-alt">
        <div className="marquee-track reverse">
          {items.map((t, i) => (
            <span key={i} className="marquee-item ghost">
              earn {t} · up week, an item · dump, it dies
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Thin gold bar at the very top: how far down the page you are. */
function ScrollBar() {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return (
    <div className="scrollbar" aria-hidden>
      <i style={{ width: `${Math.round(p * 1000) / 10}%` }} />
    </div>
  )
}

/** Pixel checkerboard seam between two coloured sections. */
function Seam({ from, to }: { from: string; to: string }) {
  return <div className="seam" style={{ '--from': from, '--to': to } as CSSProperties} aria-hidden />
}

// Three rules, three little scenes: a collar, a payday, a death.
const RULE_TOKENS = [TOKENS[317], TOKENS[11], TOKENS[902]]

export default function App() {
  return (
    <>
      <ScrollBar />
      <header className="nav">
        <a href="#top" className="wordmark">
          <span className="wordmark-art">
            <Hoodochi px={1.2} body="snow" eyes="black" antenna="ball" title="" />
          </span>
          <span>HOODOCHI</span>
        </a>
        <a className="nav-x" href={X_URL} target="_blank" rel="noreferrer">
          @{X_HANDLE} ↗
        </a>
      </header>

      <main id="top">
        {/* ---------------- hero: the loop, as the background ---------------- */}
        <HeroScene xUrl={X_URL} handle={X_HANDLE} />

        <Marquee />

        {/* ---------------- rules + the Game Boy ---------------- */}
        <section className="rules rules-split">
          <div className="rules-copy">
            <Reveal>
              <p className="eyebrow">How it works</p>
              <h2 className="section-title">
                <span className="hl hl-peach">Three rules.</span>
              </h2>
            </Reveal>
            <ol className="rule-list rule-list-stack">
              <Reveal as="li" className="rule-card from-left c-sky" delay={0}>
                <div className="rule-art">
                  <Hoodochi px={2.4} body={RULE_TOKENS[0].body} eyes={RULE_TOKENS[0].eyes} antenna={RULE_TOKENS[0].antenna} ticker="NVDA" />
                  <span className="rule-tag">MON</span>
                </div>
                <div>
                  <span className="rule-num">01</span>
                  <h3>Monday, pick a stock.</h3>
                  <p>The collar shows the ticker. That's your only move of the week.</p>
                </div>
              </Reveal>
              <Reveal as="li" className="rule-card from-left c-sand" delay={120}>
                <div className="rule-art">
                  <Hoodochi px={2.4} body={RULE_TOKENS[1].body} eyes={RULE_TOKENS[1].eyes} antenna={RULE_TOKENS[1].antenna} ticker="NVDA" equip={{ tete: 1, poignet: 2, main: 1 }} />
                  <span className="rule-tag">FRI</span>
                  <span className="rule-pop">+ watch</span>
                </div>
                <div>
                  <span className="rule-num">02</span>
                  <h3>Friday, it gets paid.</h3>
                  <p>Up week: an item it keeps forever, plus a slice of the stock on its collar. Bigger week, better item.</p>
                </div>
              </Reveal>
              <Reveal as="li" className="rule-card from-left c-night" delay={240}>
                <div className="rule-art">
                  <Hoodochi px={2.4} body={RULE_TOKENS[2].body} eyes={RULE_TOKENS[2].eyes} antenna={RULE_TOKENS[2].antenna} ticker="GME" equip={{ tete: 3, yeux: 4, poignet: 3 }} status="dead" />
                  <span className="rule-tag">RIP</span>
                </div>
                <div>
                  <span className="rule-num">03</span>
                  <h3>Dump too hard, it dies.</h3>
                  <p>Everything it was wearing goes with it. No respawns.</p>
                </div>
              </Reveal>
            </ol>
          </div>
          <div className="rules-device drop-in">
            <div className="device-halo" aria-hidden />
            <Device />
          </div>
        </section>

        <Seam from="#f6efe4" to="#c8b4f0" />

        {/* ---------------- the twenty items, as a ride ---------------- */}
        <ItemRail />

        <Seam from="#c8b4f0" to="#96cdf5" />

        {/* ---------------- on-chain ---------------- */}
        <OnChain />

        {/* ---------------- parade, as the send-off ---------------- */}
        <section className="parade-section">
          <Reveal className="parade-head">
            <p className="eyebrow">1,000 at the mint</p>
            <h2 className="section-title">
              <span className="hl hl-sky">Every one of them starts naked.</span>
            </h2>
          </Reveal>
          <Parade />
        </section>
      </main>

      <footer className="foot">
        <span>Hoodochi — work in progress.</span>
        <span>Not investment advice. Not a financial product. Tickers are letters, not endorsements.</span>
      </footer>
    </>
  )
}
