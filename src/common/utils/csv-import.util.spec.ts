import {
  isHeaderMissing,
  parseCsv,
  parseCsvWithHeaders,
} from './csv-import.util';

describe('csv-import.util', () => {
  it('parses CSV with quoted values', () => {
    const rows = parseCsv('name,description\nalpha,"value, with comma"');
    expect(rows).toEqual([
      ['name', 'description'],
      ['alpha', 'value, with comma'],
    ]);
  });

  it('maps rows by headers and tracks row number', () => {
    const parsed = parseCsvWithHeaders('name,slug\nCasual,casual');
    expect(parsed.headers).toEqual(['name', 'slug']);
    expect(parsed.rows).toEqual([
      {
        rowNumber: 2,
        values: {
          name: 'Casual',
          slug: 'casual',
        },
      },
    ]);
  });

  it('detects missing headers', () => {
    expect(isHeaderMissing(['name', 'slug'], ['name', 'slug', 'isActive'])).toEqual([
      'isActive',
    ]);
  });
});
