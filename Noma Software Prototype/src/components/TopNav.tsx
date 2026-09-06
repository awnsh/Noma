import wordmark from '../assets/noma-wordmark.png'
import type { View } from '../store/nomaStore'

const links: { id: View; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'compare', label: 'Compare' },
  { id: 'customize', label: 'Your Noma' },
  { id: 'why', label: 'Why Noma' },
  { id: 'feedback', label: 'Feedback' },
]

export function TopNav({ view, onNavigate, onHome }: { view: View; onNavigate: (v: View) => void; onHome: () => void }) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-base-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <button type="button" onClick={onHome} className="shrink-0">
          <img src={wordmark} alt="Noma" className="h-4 opacity-90 hover:opacity-100" />
        </button>
        <nav className="flex flex-wrap justify-end gap-1">
          {links.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onNavigate(link.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                view === link.id ? 'bg-accent/10 text-accent' : 'text-base-400 hover:text-base-100'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
