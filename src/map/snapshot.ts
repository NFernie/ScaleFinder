import { toPng } from 'html-to-image'

/**
 * Rasterise a DOM node (the framed map view) to a PNG and trigger a download.
 * The MapLibre canvas is created with `preserveDrawingBuffer` so its pixels are
 * still readable at capture time.
 */
export async function downloadFramePng(
  node: HTMLElement,
  fileName = 'scalefinder-snapshot.png',
): Promise<void> {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    filter: (el) => {
      // Exclude interactive map controls from the exported image.
      const cls = (el as HTMLElement).classList
      if (!cls) return true
      return !(
        cls.contains('maplibregl-ctrl-group') ||
        cls.contains('maplibregl-ctrl-zoom-in') ||
        cls.contains('maplibregl-ctrl-zoom-out')
      )
    },
  })
  const link = document.createElement('a')
  link.download = fileName
  link.href = dataUrl
  link.click()
}
