import { useState } from 'react'
import { MODULE_CATALOG } from '@shared/constants'

interface AddModuleMenuProps {
  onAdd: (moduleType: string) => void
}

export function AddModuleMenu({ onAdd }: AddModuleMenuProps) {
  const [selectedType, setSelectedType] = useState(MODULE_CATALOG[0].type)

  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-base-900/40 px-4 py-3">
      <select
        value={selectedType}
        onChange={(event) => setSelectedType(event.target.value)}
        className="rounded-md border border-white/10 bg-base-950 px-2 py-1 text-sm text-neutral-200"
      >
        {MODULE_CATALOG.map((entry) => (
          <option key={entry.type} value={entry.type}>
            {entry.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onAdd(selectedType)}
        className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-neutral-200 hover:border-accent-muted hover:text-neutral-50"
      >
        Add Module
      </button>
    </div>
  )
}
