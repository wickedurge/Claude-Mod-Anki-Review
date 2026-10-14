// Turns a card side's HTML into plain text the pane can print.

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

export function htmlToText(html: string): string {
  return (
    html
      // Media cannot be shown in a terminal, so each becomes a marker.
      .replace(/<img\b[^>]*>/gi, '[image]')
      .replace(/\[sound:[^\]]*\]/gi, '[sound]')
      // Tags that start a new line in Anki become a line break.
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(div|p|li|h[1-6])\b[^>]*>/gi, '\n')
      // Every other tag is dropped, closed or not.
      .replace(/<[^>]*>?/g, '')
      .replace(/&[#a-z0-9]+;/gi, entity => ENTITIES[entity.toLowerCase()] ?? entity)
      // Tidy spacing: no runs of spaces, no blank lines, no edges.
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(line => line !== '')
      .join('\n')
  )
}
