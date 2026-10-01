import type { LassoBehaviour, LassoDraft } from '../core/lasso'
import { LASSO_BEHAVIOUR_TIPS, LASSO_CONTRAST_TITLE, LASSO_RADIUS_TITLE, VERTEX_EDIT_HINT } from './ToolboxTooltips'

const BEHAVIOUR_LABEL: Record<LassoBehaviour, string> = {
  dynamic: 'Dynamic',
  static: 'Static',
  outline: 'Outline',
}

interface Props {
  lasso: LassoDraft
  behaviours: LassoBehaviour[]
  onSettings: (radiusPx: number, maxChannelDelta: number) => void
  onBehaviour: (behaviour: LassoBehaviour) => void
  onAdd: () => void
  onDelete: () => void
}

export default function LassoMenu({ lasso, behaviours, onSettings, onBehaviour, onAdd, onDelete }: Props) {
  const drawing = lasso.status === 'drawing'
  const sampling = lasso.behaviour !== 'outline'
  const locked = lasso.guide.length > 0 || lasso.status !== 'drawing'
  const hasRing = lasso.parts.some((part) => part.length >= 3)
  const showHint = lasso.status === 'closed' && hasRing
  const blocked = lasso.message === 'This basemap does not allow colour sampling.'
  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-white/15 bg-surface/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
      <div className="flex flex-wrap gap-2">
        {behaviours.map((behaviour) => {
          const label = BEHAVIOUR_LABEL[behaviour]
          const pressed = lasso.behaviour === behaviour
          return (
            <span key={behaviour} title={LASSO_BEHAVIOUR_TIPS[behaviour]} className="relative min-w-0 flex-1">
              <button
                type="button"
                aria-pressed={pressed}
                aria-describedby={`lasso-behaviour-${behaviour}`}
                disabled={locked}
                onClick={() => onBehaviour(behaviour)}
                className={
                  pressed
                    ? 'pressable min-h-11 w-full flex-1 rounded-lg border border-accent bg-accent-strong px-3 text-sm text-teal-50 disabled:opacity-40'
                    : 'pressable min-h-11 w-full flex-1 rounded-lg border border-white/15 px-3 text-sm text-white disabled:opacity-40'
                }
              >
                {label}
              </button>
              <span id={`lasso-behaviour-${behaviour}`} role="tooltip" className="sr-only">
                {LASSO_BEHAVIOUR_TIPS[behaviour]}
              </span>
            </span>
          )
        })}
      </div>
      {sampling && (
        <label title={LASSO_RADIUS_TITLE} className="flex items-center justify-between gap-3">
          Radius
          <input
            aria-label="Radius"
            type="number"
            min={8}
            max={128}
            inputMode="numeric"
            disabled={!drawing}
            value={lasso.radiusPx}
            onChange={(event) => onSettings(Number(event.target.value), lasso.maxChannelDelta)}
            className="min-h-11 w-24 rounded-lg border border-white/10 bg-black/30 px-3 text-base text-slate-100"
          />
        </label>
      )}
      {sampling && (
        <label title={LASSO_CONTRAST_TITLE} className="flex items-center justify-between gap-3">
          Contrast
          <input
            aria-label="Contrast"
            type="number"
            min={0}
            max={255}
            inputMode="numeric"
            disabled={!drawing}
            value={lasso.maxChannelDelta}
            onChange={(event) => onSettings(lasso.radiusPx, Number(event.target.value))}
            className="min-h-11 w-24 rounded-lg border border-white/10 bg-black/30 px-3 text-base text-slate-100"
          />
        </label>
      )}
      {drawing && !lasso.message && (
        <p className="text-slate-300">Drag or click on the map. Double-click to close.</p>
      )}
      {lasso.message && <p role="status" className="text-slate-300">{lasso.message}</p>}
      {showHint && (
        <p className="text-slate-300">{VERTEX_EDIT_HINT}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {hasRing && !blocked && (
          <button type="button" onClick={onAdd} className="pressable min-h-11 rounded-lg bg-accent px-3 text-sm font-semibold text-teal-950 hover:brightness-105">
            Add to list
          </button>
        )}
        <button type="button" aria-label="Delete measurement" onClick={onDelete} className="pressable min-h-11 rounded-lg border border-white/15 px-3 text-sm text-red-400 hover:bg-white/5">
          Delete
        </button>
      </div>
    </div>
  )
}
