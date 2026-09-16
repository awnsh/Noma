import nomaMark from '../../assets/noma-mark.png'
import nomaWordmark from '../../assets/noma-wordmark.png'

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Holo', href: '#holo' },
      { label: 'Noma Device', href: '#device' },
      { label: 'How it works', href: '#watch' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Build in Public', href: '#about' },
      { label: 'Contact', href: 'mailto:hello@noma.build' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub', href: '#' },
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="overflow-hidden border-t border-base-800">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <img src={nomaMark} alt="" className="h-6 w-auto" />
            <img src={nomaWordmark} alt="Noma" className="h-3.5 w-auto" />
          </div>
          <p className="max-w-[26ch] text-sm text-base-500">A computer interface that learns how you work.</p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-base-500">{col.title}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-base-300 transition-colors hover:text-base-50">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-base-800 px-6 py-6 sm:px-8">
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
