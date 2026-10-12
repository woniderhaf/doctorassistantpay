/**
 * Парсер чисел с запятой/пробелами — как ввод в iOS-формах («400,5», «1 234.56»).
 * Возвращает null при мусоре.
 */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/\s| /g, '').replace(',', '.');
  if (cleaned === '') return null;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return isFinite(value) ? value : null;
}
