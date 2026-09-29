import { LassoDraft } from '../core/lasso'
import { LASSO_CONTRAST_TITLE, LASSO_RADIUS_TITLE } from './ToolboxTooltips'

interface Props {
  lasso: LassoDraft
  onSettings: (radiusPx: number, maxChannelDelta: number) => void
  onAdd: () => void
  onDelete: () => void
}

export default function LassoMenu({ lasso, onSettings, onAdd, onDelete }: Props) {
  const drawing = lasso.status === 'drawing'
  const hasRing = lasso.parts.some((part) => part.length >= 3)
  const blocked = lasso.message === 'This basemap does not allow colour sampling.'
  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-white/15 bg-surface/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
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
      {drawing && !lasso.message && (
        <p className="text-slate-300">Drag or click on the map. Double-click to close.</p>
      )}
      {lasso.message && <p role="status" className="text-slate-300">{lasso.message}</p>}
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
