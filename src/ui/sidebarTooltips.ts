export type TipControl =
  | 'section'
  | 'switch'
  | 'rename'
  | 'colour'
  | 'export'
  | 'delete'
  | 'rotation'
  | 'extent'
  | 'outline'
  | 'exportSelected'
  | 'reCentre'
  | 'centreOnFixed'
  | 'fixedPick'

export function tipFor(control: TipControl, name: string, verb?: string): { title: string; body: string } {
  switch (control) {
    case 'section':
      return { title: 'Polygons', body: 'Show or hide the list of outlines.' }
    case 'switch':
      return { title: 'Show on map', body: 'Turn this Polygon on or off. Switching off keeps the row.' }
    case 'rename':
      return { title: `Rename ${name}`, body: 'Rename this Polygon.' }
    case 'colour':
      return { title: `Colour for ${name}`, body: 'Colour of this outline on the map.' }
    case 'export':
      return { title: `Export ${name}`, body: 'Download this Polygon as UTM easting and northing where it sits.' }
    case 'delete':
      return { title: `Delete ${name}`, body: 'Remove this Polygon from the session. A lasso pair removes both rows.' }
    case 'rotation':
      return { title: `Rotation for ${name}`, body: 'Compass bearing of the locked edge. Type a new bearing to turn the outline.' }
    case 'extent':
      return { title: verb ?? 'Show extent', body: 'Planform area, longest span, and equivalent square side.' }
    case 'outline':
      return { title: verb ?? 'Show outline', body: 'Small drawing of each imported part. Open parts stay open.' }
    case 'exportSelected':
      return { title: 'Export selected', body: 'Download switched-on Polygons in the same UTM zone as one file.' }
    case 'reCentre':
      return { title: 'Re-centre', body: 'Move the other switched-on Polygons onto the uppermost centre. Fixed outlines stay put.' }
    case 'centreOnFixed':
      return {
        title: 'Centre on fixed',
        body: 'Move switched-on Polygons back to a fixed outline’s imported centre, and centre the map there.',
      }
    case 'fixedPick':
      return { title: name, body: 'Use this fixed outline as the centre.' }
  }
}

export const SIDEBAR_TIPS = {
  section: tipFor('section', ''),
  switch: tipFor('switch', ''),
  exportSelected: tipFor('exportSelected', ''),
  reCentre: tipFor('reCentre', ''),
  centreOnFixed: tipFor('centreOnFixed', ''),
} as const
