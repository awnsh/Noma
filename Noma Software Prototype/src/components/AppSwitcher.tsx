import { appOrder, appProfiles, type AppId } from '../data/appProfiles'

/**
 * Styled like a row of open windows to jump between (brief section 3) —
 * not a settings-style profile list, and deliberately no card/border
 * wrapper of its own: it should read as a small strip of context, not
 * another dashboard panel sitting next to the keyboard.
 */
export function AppSwitcher({ activeId, onSelect }: { activeId: AppId; onSelect: (id: AppId) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {appOrder.map((id) => {
        const app = appProfiles[id]
        const isActive = id === activeId
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
              isActive ? 'bg-accent/10 text-accent' : 'text-base-500 hover:text-base-200'
            }`}
          >
            {app.color && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: app.color }} />}
            {app.shortName}
          </button>
        )
      })}
    </div>
  )
}
