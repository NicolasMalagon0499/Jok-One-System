/**
 * Formatea una fecha 'YYYY-MM-DD' (o un ISO con hora) como texto largo en
 * español, ej: "Martes 9 de septiembre de 2026".
 *
 * Se arma el Date con año/mes/día locales (no con `new Date(str)`) para
 * evitar el corrimiento de un día que causa interpretar 'YYYY-MM-DD' como
 * medianoche UTC en un navegador con huso horario negativo (Bogotáـ-5).
 */
export function formatLongDateEs(dateStr: string): string {
  if (!dateStr) return '';
  const isoDate = dateStr.split('T')[0];
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  const formatted = date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
