import { useEffect, useState } from 'react'
import SiteLink from './SiteLink'
import Logo from './Logo'

const links = [
  { label: 'How it works', href: '#how' },
  { label: 'Build log', href: '#build' },
]

/**
 * Plain top bar: logo, two links, the waitlist button. Transparent at the
 * top of the page, gains a paper fill and a hairline once scrolled.
 */
export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`band-dark fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled ? 'border-line bg-paper' : 'border-transparent bg-paper'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-8">
        <SiteLink href="#top" className="text-ink">
          <Logo />
        </SiteLink>

        <div className="flex items-center gap-6 sm:gap-8">
          <ul className="hidden items-center gap-8 sm:flex">
            {links.map((link) => (
              <li key={link.href}>
                <SiteLink href={link.href} className="text-[15px] text-muted transition-colors hover:text-ink">
                  {link.label}
                </SiteLink>
              </li>
            ))}
          </ul>
          <SiteLink
            href="#waitlist"
            className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[14px] font-semibold text-paper transition-opacity hover:opacity-90"
          >
            Join waitlist
          </SiteLink>
        </div>
      </nav>
    </header>
  )
}
