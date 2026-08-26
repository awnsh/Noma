import type { Module } from '@shared/types'

interface ModuleChipProps {
  module: Module
  onRemove: (moduleId: string) => void
}

export function ModuleChip({ module, onRemove }: ModuleChipProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-base-900 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-neutral-100">{module.name}</div>
        <div className="text-[10px] uppercase tracking-widest text-neutral-600">
          {module.capabilities.join(' · ')}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(module.id)}
        aria-label={`Remove ${module.name}`}
        className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-xs text-neutral-500 hover:border-white/30 hover:text-neutral-300"
      >
        ×
      </button>
    </div>
  )
}
