import { Hoodochi } from './Hoodochi'
import type { Equip, Status } from './Hoodochi'
import { useScrollProgress, useTicker } from '../hooks'
import { TOKENS } from '../sprites-v2'

interface Stage {
  word: string
  line: string
  ticker: string | null
  equip: Equip
  status: Status
  bg: string // room temperature, never a chart colour
  fg: string
}

// One Hoodochi, one scroll: the whole loop, week by week.
const STAGES: Stage[] = [
  { word: 'Monday.', line: 'You pick a stock. The collar goes on. Nothing else to do until Friday.', ticker: 'NVDA', equip: {}, status: 'alive', bg: '#f6efe4', fg: '#1a1f3a' },
  { word: 'Friday. Up.', line: 'Good week for NVDA. It gets a cap, and keeps it.', ticker: 'NVDA', equip: { tete: 1 }, status: 'alive', bg: '#fff3c4', fg: '#1a1f3a' },
  { word: 'Exceptional.', line: 'A once-a-year kind of week. A crown.', ticker: 'NVDA', equip: { tete: 4 }, status: 'alive', bg: '#ffd9a8', fg: '#1a1f3a' },
  { word: 'Bad week. Nothing.', line: 'Down, not dead. It loses nothing.', ticker: 'NVDA', equip: { tete: 4 }, status: 'alive', bg: '#d9dcf0', fg: '#1a1f3a' },
  { word: 'No collar.', line: 'No stock this week. It sleeps. No risk, no loot.', ticker: null, equip: { tete: 4 }, status: 'sleeping', bg: '#1a1f3a', fg: '#f6efe4' },
  { word: 'Dead.', line: 'GME collar. GME dumped. Crown gone. No respawns.', ticker: 'GME', equip: { tete: 4 }, status: 'dead', bg: '#e7e0d4', fg: '#1a1f3a' },
]

const TOKEN = 217

export function WeekScroller() {
  const { ref, progress } = useScrollProgress<HTMLElement>()
  const idx = Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length))
  const st = STAGES[idx]
  const tok = TOKENS[TOKEN - 1]
  const tick = useTicker(st.status === 'sleeping' ? 1 : 3, st.status !== 'dead')
  const bob = st.status === 'dead' ? 0 : (tick % 2) * (st.status === 'sleeping' ? 1 : 3)

  return (
    <section ref={ref} className="moods" style={{ height: `${STAGES.length * 100}vh` }}>
      <div className="moods-sticky" style={{ background: st.bg, color: st.fg }}>
        <div className="moods-inner">
          <div className="moods-art" style={{ transform: `translateY(${-bob}px)` }}>
            <div key={idx} className="pixel-in">
              <Hoodochi px={7} body={tok.body} eyes={tok.eyes} antenna={tok.antenna} ticker={st.ticker} equip={st.equip} status={st.status} title={st.word} />
            </div>
            {st.status === 'sleeping' && <span className="moods-zzz">z z z</span>}
          </div>
          <div className="moods-copy">
            <p className="eyebrow" style={{ color: 'inherit', opacity: 0.6 }}>
              How a week goes
            </p>
            <h2 key={st.word} className="moods-word type-in">
              {st.word}
            </h2>
            <p key={st.line} className="moods-line fade-up">
              {st.line}
            </p>
            <div className="moods-dots" aria-hidden>
              {STAGES.map((_, i) => (
                <span key={i} className={i === idx ? 'on' : ''} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
