import { buildCsv, csvRow, escapeCsvValue } from './csv.util';

describe('csv.util', () => {
  it('escapes commas, quotes and new lines', () => {
    expect(escapeCsvValue('name,with,comma')).toBe('"name,with,comma"');
    expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
  });

  it('builds CSV with headers and rows', () => {
    const csv = buildCsv(
      ['id', 'name', 'active'],
      [
        [1, 'Product A', true],
        [2, 'Product B', false],
      ],
    );

    expect(csv).toBe('id,name,active\n1,Product A,true\n2,Product B,false');
  });

  it('creates individual row text', () => {
    expect(csvRow(['section', 'metric', 10])).toBe('section,metric,10');
  });
});
