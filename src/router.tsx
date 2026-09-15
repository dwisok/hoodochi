import { useEffect, useState } from 'react'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'

// A very small client-side router: pathname in, pushState out.
// The host rewrites unknown paths to index.html (public/.htaccess).

export function usePath() {
  const [path, setPath] = useState(() => (typeof window === 'undefined' ? '/' : window.location.pathname))
  useEffect(() => {
    const on = () => setPath(window.location.pathname)
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  return path
}

export function navigate(to: string) {
  if (window.location.pathname === to) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}

/** Internal link: same-origin paths navigate without a reload, everything else is a plain anchor. */
export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || !href || !href.startsWith('/') || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || rest.target === '_blank') return
    e.preventDefault()
    navigate(href)
  }
  return <a href={href} onClick={handle} {...rest} />
}

/** /pet/12 → { name: 'pet', id: 12 } ; /pets ; /graveyard ; anything else → landing. */
export function route(path: string): { name: 'landing' } | { name: 'pets' } | { name: 'graveyard' } | { name: 'pet'; id: number } {
  const m = path.match(/^\/pet\/(\d+)\/?$/)
  if (m) return { name: 'pet', id: Number(m[1]) }
  if (/^\/pets\/?$/.test(path)) return { name: 'pets' }
  if (/^\/graveyard\/?$/.test(path)) return { name: 'graveyard' }
  return { name: 'landing' }
}
