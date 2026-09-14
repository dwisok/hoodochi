import type { ReactNode } from 'react'
import { useReveal } from '../hooks'

interface Props {
  children: ReactNode
  className?: string
  delay?: number // ms
  as?: 'div' | 'li' | 'section' | 'p'
}

/** Pixel-stepped reveal on first scroll into view. */
export function Reveal({ children, className = '', delay = 0, as = 'div' }: Props) {
  const { ref, inView } = useReveal<HTMLDivElement>(0.15)
  const Tag = as as 'div'
  return (
    <Tag ref={ref} className={`reveal ${inView ? 'in' : ''} ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </Tag>
  )
}

/** Headline that types itself in, one character per step. */
export function TypeIn({ text, className = '', start = true, step = 45, offset = 0 }: { text: string; className?: string; start?: boolean; step?: number; offset?: number }) {
  // Characters animate one by one, but words never break in the middle.
  let n = 0
  return (
    <span className={`typein ${start ? 'go' : ''} ${className}`} aria-label={text}>
      {text.split(' ').map((word, w) => [
        w > 0 ? ' ' : null,
        <span key={w} className="typein-word" aria-hidden>
          {word.split('').map((ch, i) => (
            <span key={i} className="typein-ch" style={{ animationDelay: `${offset + n++ * step}ms` }}>
              {ch}
            </span>
          ))}
        </span>,
      ])}
    </span>
  )
}
