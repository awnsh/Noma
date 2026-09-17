import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import nomaMark from '../../assets/noma-mark.png'
import nomaWordmark from '../../assets/noma-wordmark.png'

const links = [
  { label: 'Product', href: '#product' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Software', href: '#software' },
  { label: 'About', href: '#story' },
]

/**
 * 2026 ground-up redesign: a plain top bar, not the previous floating
 * glass pill. Real feedback on the old site was "too much AI SaaS" — a
 * rounded, blurred, glowing nav pill floating above the page is exactly
 * the kind of decoration that direction called out by name. This is a
 * full-width bar instead: a hairline bottom border, a flat near-black fill
 * with just enough blur to stay legible over whatever scrolls under it,
 * no rounding, no glow. Apple/Linear/Raycast all land here — the nav
 * should be the quietest element on the page, not a design statement.
 */
export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-base-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <img src={nomaMark} alt="" className="h-6 w-auto" />
          <img src={nomaWordmark} alt="Noma" className="h-3 w-auto" />
        </a>

        <ul className="hidden items-center gap-9 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-[13px] font-medium text-base-300 transition-colors hover:text-base-50">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#waitlist"
          className="hidden items-center gap-1.5 text-[13px] font-medium text-base-50 transition-colors hover:text-accent-bright lg:inline-flex"
        >
          Join Waitlist <span aria-hidden>&rarr;</span>
        </a>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex flex-col gap-1.5 lg:hidden"
        >
          <span className={`h-px w-5 bg-base-100 transition-transform duration-300 ${menuOpen ? 'translate-y-[3.5px] rotate-45' : ''}`} />
          <span className={`h-px w-5 bg-base-100 transition-transform duration-300 ${menuOpen ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-white/10 bg-base-950 lg:hidden"
          >
            <ul className="flex flex-col gap-1 px-6 py-4">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} onClick={() => setMenuOpen(false)} className="block py-2 text-base text-base-200">
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="pt-2">
                <a
                  href="#waitlist"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-1.5 text-base font-medium text-accent-bright"
                >
                  Join Waitlist <span aria-hidden>&rarr;</span>
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
