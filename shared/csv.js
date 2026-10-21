export function parseCsv(input) {
  if (typeof input !== 'string' || input.length > 1000000) throw new Error('Keep CSV input under 1 MB.');
  const rows = [];
  let row = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell) throw new Error('Quote a complete CSV field.');else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(s => s.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('A quoted CSV field was not closed.');
  row.push(cell);
  if (row.some(s => s.trim())) rows.push(row);
  if (rows.length < 2 || rows.length > 501) throw new Error('Include a header and 1–500 records.');
  const header = rows.shift().map(s => s.trim().toLowerCase().replace(/^\uFEFF/, ''));
  if (new Set(header).size !== header.length) throw new Error('CSV headers must be unique.');
  return rows.map((r, i) => {
    if (r.length !== header.length) throw new Error('CSV row ' + (i + 2) + ' has a different number of fields.');
    return Object.fromEntries(header.map((key, j) => [key, r[j].trim()]));
  });
}
