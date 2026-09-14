import { useMemo } from 'react'
import { Hoodochi } from './Hoodochi'
import { Reveal } from './Reveal'
import { TOKENS, BODY_COLORS, EYE_LAYERS, TIP_LAYERS, BACKGROUND_COLORS, RARE_BACKGROUNDS } from '../sprites-v2'
import type { BodyName, EyesName, TipName } from '../sprites-v2'

const ULTRA = ['sunburst', 'synthwave', 'holo', 'vault']

function count<K extends string>(key: 'body' | 'eyes' | 'antenna' | 'background'): Record<K, number> {
  const out = {} as Record<K, number>
  for (const t of TOKENS) out[t[key] as K] = (out[t[key] as K] ?? 0) + 1
  return out
}

/** The four birth traits, drawn straight from the 1,000-token collection. */
export function Traits() {
  const bodies = useMemo(() => count<BodyName>('body'), [])
  const eyes = useMemo(() => count<EyesName>('eyes'), [])
  const tips = useMemo(() => count<TipName>('antenna'), [])
  const bgs = useMemo(() => count<string>('background'), [])
  const base = TOKENS[7] // one face for the whole section

  // the flat 'night' shadows the rare one in the generator, so it is listed once
  const bgNames = [...Object.keys(BACKGROUND_COLORS), ...Object.keys(RARE_BACKGROUNDS).filter((b) => !(b in BACKGROUND_COLORS))]

  return (
    <section className="traits" id="traits">
      <div className="traits-head">
        <Reveal>
          <p className="eyebrow">1,000 at the mint · four traits, rolled once</p>
          <h2 className="section-title">Born plain. Dressed by the market.</h2>
        </Reveal>
        <Reveal delay={120}>
          <p>
            At the mint every Hoodochi is naked: a body colour, a pair of eyes, a set of antennae, a background. Fixed for
            life. Everything else on it will have been earned, one Friday at a time.
          </p>
        </Reveal>
      </div>

      <TraitRow label="Body" note="gold and void are the rare ones">
        {(Object.keys(BODY_COLORS) as BodyName[]).map((b, i) => (
          <Reveal key={b} delay={i * 30}>
            <figure className={`trait ${bodies[b] < 30 ? 'rare' : ''}`}>
              <Hoodochi px={2} body={b} eyes={base.eyes} antenna={base.antenna} />
              <figcaption>
                {b} <small>×{bodies[b]}</small>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </TraitRow>

      <TraitRow label="Eyes" note="dizzy is the rarest">
        {(Object.keys(EYE_LAYERS) as EyesName[]).map((e, i) => (
          <Reveal key={e} delay={i * 30}>
            <figure className={`trait ${eyes[e] < 40 ? 'rare' : ''}`}>
              <Hoodochi px={2} body={base.body} eyes={e} antenna={base.antenna} />
              <figcaption>
                {e} <small>×{eyes[e]}</small>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </TraitRow>

      <TraitRow label="Antennae" note="">
        {(Object.keys(TIP_LAYERS) as TipName[]).map((t, i) => (
          <Reveal key={t} delay={i * 30}>
            <figure className={`trait ${tips[t] < 90 ? 'rare' : ''}`}>
              <Hoodochi px={2} body={base.body} eyes={base.eyes} antenna={t} />
              <figcaption>
                {t} <small>×{tips[t]}</small>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </TraitRow>

      <TraitRow label="Background" note="ten flat, six rare, four you'll almost never see">
        {bgNames.map((b, i) => (
          <Reveal key={b} delay={i * 30}>
            <figure className={`trait ${ULTRA.includes(b) ? 'ultra' : b in RARE_BACKGROUNDS ? 'rare' : ''}`}>
              <Hoodochi px={2} body={base.body} eyes={base.eyes} antenna={base.antenna} bg={b} />
              <figcaption>
                {b} <small>×{bgs[b] ?? 0}</small>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </TraitRow>
    </section>
  )
}

function TraitRow({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div className="trait-row">
      <div className="trait-label">
        <h3>{label}</h3>
        {note && <p>{note}</p>}
      </div>
      <div className="trait-strip">{children}</div>
    </div>
  )
}
