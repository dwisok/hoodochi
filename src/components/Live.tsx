import { useEffect, useState } from 'react'
import { Hoodochi } from './Hoodochi'
import { Reveal } from './Reveal'
import { useTicker } from '../hooks'
import { loadSeries, hasKey } from '../market'
import type { Series } from '../market'
import { replay, wordFor } from '../week'
import type { Replay } from '../week'
import { TOKENS, SLOT_LABEL } from '../sprites-v2'
import { itemName } from '../items'
import type { Slot } from '../sprites-v2'

const CHIPS = ['NVDA', 'TSLA', 'GME', 'KO', 'AAPL', 'XOM', 'JPM', 'PFE', 'AMD', 'PLTR']
const WEEKS = 12
const TOKEN = 8

type Status = { kind: 'loading' } | { kind: 'error'; msg: string } | { kind: 'ok'; series: Series; run: Replay }

export function Live() {
  const [ticker, setTicker] = useState('NVDA')
  const [typed, setTyped] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [showNumber, setShowNumber] = useState(false)
  const tok = TOKENS[TOKEN - 1]

  useEffect(() => {
    let dead = false
    setStatus({ kind: 'loading' })
    loadSeries(ticker)
      .then((series) => {
        if (dead) return
        setStatus({ kind: 'ok', series, run: replay(series.bars, { weeks: WEEKS, seed: ticker.length }) })
      })
      .catch((e: Error) => {
        if (dead) return
        const msg =
          e.message === 'rate-limited'
            ? 'Too many collars at once. Give it a minute.'
            : e.message === 'unknown-ticker' || e.message === 'bad-ticker'
              ? `No stock called ${ticker}.`
              : 'The market feed is down. Try again.'
        setStatus({ kind: 'error', msg })
      })
    return () => {
      dead = true
    }
  }, [ticker])

  const run = status.kind === 'ok' ? status.run : null
  const last = run?.results[run.results.length - 1]
  const tick = useTicker(3, Boolean(run?.alive))
  const bob = run?.alive ? (tick % 2) * 3 : 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = typed.trim().toUpperCase()
    if (t) {
      setTicker(t)
      setTyped('')
    }
  }

  const mood = !run ? '' : !run.alive ? 'is-dead' : run.level >= 8 ? 'is-manic' : run.level >= 3 ? 'is-happy' : ''

  return (
    <section className="live" id="live">
      <div className="live-head">
        <Reveal>
          <p className="eyebrow">Live · real weekly closes {hasKey() ? '' : '· simulated, no api key'}</p>
          <h2 className="section-title">Put a collar on one.</h2>
        </Reveal>
        <Reveal delay={120}>
          <p>
            Pick a ticker. This is what #{TOKEN} would be wearing today if you had collared it with that stock {WEEKS} weeks
            ago and never switched. Every Friday judged by the stock's own standards.
          </p>
        </Reveal>
      </div>

      <div className="live-chips" role="tablist">
        {CHIPS.map((t) => (
          <button key={t} role="tab" aria-selected={t === ticker} className={`chip ${t === ticker ? 'on' : ''}`} onClick={() => setTicker(t)}>
            <span className="collar-dot" />
            {t}
          </button>
        ))}
        <form className="chip-form" onSubmit={submit}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase().slice(0, 5))}
            placeholder="OTHER"
            aria-label="Another ticker"
            spellCheck={false}
          />
          <button type="submit" aria-label="Collar it">
            ↵
          </button>
        </form>
      </div>

      <div className={`live-card ${mood}`}>
        <div className="live-stage live-stage-v2">
          <div className="live-pet" style={{ transform: `translateY(${-bob}px)` }}>
            {run ? (
              <div key={`${ticker}-${run.level}-${run.alive}`} className="pixel-in">
                <Hoodochi px={6} body={tok.body} eyes={tok.eyes} antenna={tok.antenna} ticker={ticker} equip={run.equip} status={run.alive ? 'alive' : 'dead'} />
              </div>
            ) : (
              <Hoodochi px={6} body={tok.body} eyes={tok.eyes} antenna={tok.antenna} ticker={status.kind === 'error' ? null : ticker} status={status.kind === 'error' ? 'sleeping' : 'alive'} />
            )}
          </div>
          {run && (
            <ol className="week-strip" aria-label="The last weeks">
              {run.results.map((r, i) => (
                <li
                  key={r.week.start}
                  className={r.outcome.kind === 'dead' ? 'dead' : r.outcome.kind === 'item' && r.slot ? `item t${r.outcome.tier}` : 'flat'}
                  style={{ animationDelay: `${i * 60}ms` }}
                  title={`${r.week.start}: ${wordFor(r)}`}
                >
                  {r.outcome.kind === 'dead' ? '✕' : r.outcome.kind === 'item' && r.slot ? r.outcome.tier : '·'}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="live-copy">
          {status.kind === 'loading' && (
            <>
              <h3 className="live-word">Clipping it on…</h3>
              <p className="live-line">Reading the tape.</p>
            </>
          )}
          {status.kind === 'error' && (
            <>
              <h3 className="live-word">No collar.</h3>
              <p className="live-line">{status.msg}</p>
            </>
          )}
          {status.kind === 'ok' && run && last && (
            <>
              <h3 key={ticker} className="live-word type-in">
                {run.alive ? (run.level === 0 ? 'Still naked.' : run.level >= 12 ? 'Loaded.' : run.level >= 6 ? 'Getting somewhere.' : 'Something to show.') : `Died in week ${run.weeksPlayed}.`}
              </h3>
              <p className="live-line">
                {run.alive
                  ? `${run.weeksPlayed} weeks on a ${ticker} collar. Last Friday: ${wordFor(last).toLowerCase()}`
                  : `${ticker} dumped, by ${ticker} standards. Everything it had earned went with it.`}
              </p>
              <ul className="live-facts">
                {(['tete', 'yeux', 'cou', 'poignet', 'main'] as Slot[]).map((s) => (
                  <li key={s} className={(run.equip[s] ?? 0) > 0 && run.alive ? 'on' : ''}>
                    <span>{SLOT_LABEL[s]}</span>
                    <b>{run.alive && (run.equip[s] ?? 0) > 0 ? itemName(s, run.equip[s]!) : '—'}</b>
                  </li>
                ))}
              </ul>
              <button
                className="live-number"
                onPointerDown={() => setShowNumber(true)}
                onPointerUp={() => setShowNumber(false)}
                onPointerLeave={() => setShowNumber(false)}
                onKeyDown={(e) => e.key === ' ' && setShowNumber(true)}
                onKeyUp={() => setShowNumber(false)}
              >
                {showNumber ? (
                  <span className="mono">
                    last week {fmtPct(last.week.ret)} · {last.z.toFixed(1)}σ · weekly σ {fmtPct(last.sigma)}
                  </span>
                ) : (
                  'Hold to see the number'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function fmtPct(x: number) {
  const s = (x * 100).toFixed(1)
  return (x >= 0 ? '+' : '') + s + '%'
}
