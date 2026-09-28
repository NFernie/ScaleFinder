import { ToolId, ToolboxSession } from '../core/toolboxSession'

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'polygon', label: 'Polygon' },
  { id: 'ruler', label: 'Ruler' },
  { id: 'lasso', label: 'Lasso' },
  { id: 'circle', label: 'Circle' },
  { id: 'square', label: 'Square' },
]

interface Props {
  session: ToolboxSession
  onToggle: () => void
  onChoose: (tool: ToolId) => void
}

export default function Toolbox({ session, onToggle, onChoose }: Props) {
  const active = session.tool !== null
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        aria-expanded={session.menuOpen}
        aria-pressed={active}
        onClick={onToggle}
        className={`pressable pointer-events-auto min-h-11 rounded-lg border px-3 text-sm font-medium shadow-[0_2px_8px_rgb(0_0_0/0.35)] ${
          active ? 'border-accent bg-accent-strong text-teal-50' : 'border-white/15 bg-surface/95 text-white'
        }`}
      >
        Toolbox
      </button>
      {session.menuOpen && (
        <div className="toolbox-pop pointer-events-auto flex w-full flex-col gap-2 rounded-xl border border-white/15 bg-surface/95 p-2 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              aria-pressed={session.tool === tool.id}
              onClick={() => onChoose(tool.id)}
              className={`pressable min-h-11 rounded-lg border px-3 text-left text-sm ${
                session.tool === tool.id
                  ? 'border-accent bg-accent-strong text-teal-50'
                  : 'border-white/15 text-white hover:bg-white/5'
              }`}
            >
              {tool.label}
            </button>
          ))}
          {session.blockedMessage && (
            <p role="status" className="px-1 text-sm text-slate-300">
              {session.blockedMessage}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
