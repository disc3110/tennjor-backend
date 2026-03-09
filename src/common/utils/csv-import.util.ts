export type CsvParsedRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export type CsvParseWithHeadersResult = {
  headers: string[];
  rows: CsvParsedRow[];
};

export function parseCsv(content: string): string[][] {
  const normalized = content.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

export function parseCsvWithHeaders(content: string): CsvParseWithHeadersResult {
  const matrix = parseCsv(content);

  if (matrix.length === 0) {
    return {
      headers: [],
      rows: [],
    };
  }

  const headers = matrix[0].map((header) => header.trim());
  const rows: CsvParsedRow[] = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];
    const values: Record<string, string> = {};

    headers.forEach((header, columnIndex) => {
      values[header] = (row[columnIndex] ?? '').trim();
    });

    rows.push({
      rowNumber: rowIndex + 1,
      values,
    });
  }

  return {
    headers,
    rows,
  };
}

export function isHeaderMissing(
  headers: string[],
  requiredHeaders: string[],
): string[] {
  const existing = new Set(headers);
  return requiredHeaders.filter((header) => !existing.has(header));
}
