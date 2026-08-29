import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import nomaMark from '../../assets/noma-mark.png'
import nomaWordmark from '../../assets/noma-wordmark.png'

const links = [
  { label: 'Product', href: '#noma' },
  { label: 'Flow', href: '#flow' },
  { label: 'Hardware', href: '#hardware' },
  { label: 'About', href: '#founder' },
]

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-base-800 bg-base-950/80 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
        <a href="#top" className="flex items-center gap-3">
          <img src={nomaMark} alt="" className="h-9 w-auto" />
          <img src={nomaWordmark} alt="Noma" className="h-5 w-auto" />
        </a>

        <ul className="hidden items-center gap-9 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm text-base-300 transition-colors hover:text-base-50"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#demo"
          className="hidden rounded-lg border border-base-500 px-5 py-2 text-sm font-medium text-base-100 transition-colors hover:border-accent hover:text-accent md:inline-flex"
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
          <span className={`h-px w-6 bg-base-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? 'translate-y-[3.5px] rotate-45' : ''}`} />
          <span className={`h-px w-6 bg-base-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden border-t border-base-800 bg-base-950 md:hidden"
          >
            <ul className="flex flex-col gap-1 px-6 py-4">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-2.5 text-base text-base-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="pt-2">
                <a
                  href="#demo"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex rounded-lg border border-base-500 px-5 py-2.5 text-sm font-medium text-base-100"
                >
                  Explore Noma
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
