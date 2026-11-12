import SiteLink from './SiteLink'
import Logo from './Logo'

const links = [
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
]

export default function Footer() {
  return (
    <footer className="band-dark border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-4 text-ink">
          <Logo />
          <span className="text-sm text-faint">A keyboard that learns how you type.</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          {links.map((l) => (
            <SiteLink key={l.href} href={l.href} className="text-muted transition-colors hover:text-ink">
              {l.label}
            </SiteLink>
          ))}
          <span className="text-faint">&copy; {new Date().getFullYear()} Noma</span>
        </div>
      </div>
    </footer>
  )
}
