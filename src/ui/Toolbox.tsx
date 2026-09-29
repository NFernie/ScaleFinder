import { ToolId, ToolboxSession } from '../core/toolboxSession'
import { ToolIcon } from './ToolIcon'
import { TOOL_TIPS } from './ToolboxTooltips'

const TOOLS: ToolId[] = ['polygon', 'ruler', 'lasso', 'circle', 'square']

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
        <div className="toolbox-pop pointer-events-auto rounded-xl border border-white/15 bg-surface/95 p-2 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
          <div className="grid grid-cols-3 gap-2">
            {TOOLS.map((tool) => {
              const tip = TOOL_TIPS[tool]
              const tipId = `toolbox-tip-${tool}`
              const selected = session.tool === tool
              return (
                <div key={tool} className="group relative">
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={tip.title}
                    title={tip.title}
                    aria-describedby={tipId}
                    onClick={() => onChoose(tool)}
                    className={`pressable flex min-h-11 min-w-11 items-center justify-center rounded-lg border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4] ${
                      selected
                        ? 'border-accent bg-accent-strong text-teal-50'
                        : 'border-white/15 text-white hover:bg-white/5'
                    }`}
                  >
                    <ToolIcon tool={tool} />
                  </button>
                  <div
                    id={tipId}
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded-lg border border-white/15 bg-surface/95 p-2 text-left text-xs text-slate-200 opacity-0 shadow-[0_2px_8px_rgb(0_0_0/0.35)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    <p className="font-medium text-white">{tip.title}</p>
                    <p className="mt-0.5 leading-snug text-slate-300">{tip.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
          {session.blockedMessage && (
            <p role="status" className="mt-2 px-1 text-sm text-slate-300">
              {session.blockedMessage}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
