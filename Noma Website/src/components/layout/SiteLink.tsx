import { Link, useLocation } from 'react-router-dom'
import type { MouseEventHandler, ReactNode } from 'react'

interface SiteLinkProps {
  href: string
  className?: string
  onClick?: MouseEventHandler
  children: ReactNode
}

/**
 * The one link component `Navigation` and `Footer` use for every href,
 * since routing added three real pages (`/contact`, `/privacy`, `/terms`)
 * alongside the homepage's own in-page anchors (`#product` etc.) and this
 * codebase now has three different kinds of link to render correctly:
 *
 * - A bare `#hash`: on the homepage, stays a plain `<a href="#hash">` so
 *   Lenis's own `anchors` option (see `App.tsx`) keeps intercepting it
 *   exactly as it did before routing existed — that's tuned smooth-scroll
 *   behavior worth not disturbing. Anywhere else, becomes a router `Link`
 *   to `/#hash`: it routes home first, then `ScrollToHash` (`App.tsx`)
 *   finishes the scroll once the target section exists in the DOM.
 * - A real path (`/privacy`): a router `Link`, client-side navigation
 *   from anywhere.
 * - Anything else (`mailto:`, `#` placeholder, external URL): a plain
 *   `<a>`, unchanged.
 */
export default function SiteLink({ href, className, onClick, children }: SiteLinkProps) {
  const { pathname } = useLocation()

  if (href.startsWith('#')) {
    if (pathname === '/') {
      return (
        <a href={href} className={className} onClick={onClick}>
          {children}
        </a>
      )
    }
    return (
      <Link to={`/${href}`} className={className} onClick={onClick}>
        {children}
      </Link>
    )
  }

  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className} onClick={onClick}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  )
}
