import nomaLogo from '../../assets/noma-logo.png'

const links = [
  { label: 'Product', href: '#noma' },
  { label: 'Flow', href: '#flow' },
  { label: 'Hardware', href: '#hardware' },
  { label: 'About', href: '#founder' },
]

export default function Footer() {
  return (
    <footer className="border-t border-base-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-12 sm:flex-row sm:justify-between sm:px-8">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-2">
            <img src={nomaLogo} alt="" className="h-4 w-4" />
            <span className="font-display text-base font-semibold tracking-tight text-base-100">NOMA</span>
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
    </footer>
  )
}
