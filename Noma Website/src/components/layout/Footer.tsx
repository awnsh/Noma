import nomaMark from '../../assets/noma-mark.png'
import nomaWordmark from '../../assets/noma-wordmark.png'

const links = [
  { label: 'How It Works', href: '#how' },
  { label: 'Hardware', href: '#hardware' },
  { label: 'Modules', href: '#modules' },
  { label: 'About', href: '#founder' },
]

export default function Footer() {
  return (
    <footer className="overflow-hidden border-t border-base-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-12 sm:flex-row sm:justify-between sm:px-8">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-2.5">
            <img src={nomaMark} alt="" className="h-6 w-auto" />
            <img src={nomaWordmark} alt="Noma" className="h-3.5 w-auto" />
          </div>
          <span className="text-xs text-base-500">An adaptive computer interface. In development.</span>
        </div>

        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm text-base-400 transition-colors hover:text-base-100">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <p className="font-mono text-[11px] text-base-600">&copy; {new Date().getFullYear()} Noma</p>
      </div>

      {/* The oversized, faded closing wordmark — the "big startup footer"
          move (Linear/Stripe/Vercel etc.): huge, barely-there, emerging
          out of the footer above rather than starting on a hard edge, then
          cut clean by the container's own bottom edge. The wordmark's
          native aspect ratio is very wide/short (~7:1), so it has to be
          rendered noticeably wider than this wrapper to have any height
          left to crop at all — `clamp()` keeps that relationship at every
          viewport size instead of hand-tuning per breakpoint. */}
      <div aria-hidden="true" className="relative select-none overflow-hidden" style={{ height: 'clamp(65px, 10vw, 155px)' }}>
        <img
          src={nomaWordmark}
          alt=""
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: 'clamp(390px, 100vw, 1330px)',
            opacity: 0.05,
            maskImage: 'linear-gradient(to bottom, transparent, black 45%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 45%)'
          }}
        />
      </div>
    </footer>
  )
}
