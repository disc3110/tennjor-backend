export type CsvValue = string | number | boolean | Date | null | undefined;

function normalizeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

export function escapeCsvValue(value: CsvValue): string {
  const normalized = normalizeCsvValue(value);

  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

export function csvRow(values: CsvValue[]): string {
  return values.map((value) => escapeCsvValue(value)).join(',');
}

export function buildCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [csvRow(headers), ...rows.map((row) => csvRow(row))];
  return lines.join('\n');
}
