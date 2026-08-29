import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import nomaMark from '../../assets/noma-mark.png'
import nomaWordmark from '../../assets/noma-wordmark.png'

const links = [
  { label: 'Product', href: '#noma' },
  { label: 'Flow', href: '#flow' },
  { label: 'Hardware', href: '#hardware' },
  { label: 'About', href: '#founder' },
]

// Shared by the pill and its mobile dropdown so the glass reads as one
// material rather than two different treatments stacked on top of each other.
const GLASS =
  'border border-white/15 bg-gradient-to-b from-white/[0.1] to-white/[0.03] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),inset_0_-1px_0_0_rgba(255,255,255,0.04),0_12px_36px_-8px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150'

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex flex-col items-center">
        <nav className={`flex items-center gap-8 rounded-full px-5 py-3 ${GLASS}`}>
          <a href="#top" className="flex items-center gap-3">
            <img src={nomaMark} alt="" className="h-8 w-auto" />
            <img src={nomaWordmark} alt="Noma" className="h-4 w-auto" />
          </a>

          <ul className="hidden items-center gap-7 md:flex">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm text-base-300 transition-colors hover:text-base-50">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#demo"
            className="hidden rounded-full border border-base-500/70 px-5 py-2 text-sm font-medium text-base-100 transition-colors hover:border-accent hover:text-accent md:inline-flex"
          >
            Explore Noma
          </a>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex flex-col gap-1.5 md:hidden"
          >
            <span
              className={`h-px w-6 bg-base-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? 'translate-y-[3.5px] rotate-45' : ''}`}
            />
            <span
              className={`h-px w-6 bg-base-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? '-translate-y-[3.5px] -rotate-45' : ''}`}
            />
          </button>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`mt-2 w-56 overflow-hidden rounded-3xl md:hidden ${GLASS}`}
            >
              <ul className="flex flex-col gap-1 px-5 py-4">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block py-2 text-base text-base-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li className="pt-2">
                  <a
                    href="#demo"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex rounded-full border border-base-500 px-5 py-2 text-sm font-medium text-base-100"
                  >
                    Explore Noma
                  </a>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
