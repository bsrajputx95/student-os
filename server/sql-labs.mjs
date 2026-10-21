import { DatabaseSync } from 'node:sqlite';
import { sqlSchema } from '../shared/assessments.js';
export const referenceSql = {
  'net-revenue': `WITH r AS (SELECT payment_id,SUM(amount_cents) amount FROM refunds GROUP BY payment_id) SELECT o.customer_id,SUM(p.amount_cents-COALESCE(r.amount,0)) net_cents FROM payments p JOIN orders o ON o.id=p.order_id LEFT JOIN r ON r.payment_id=p.id WHERE p.status='captured' GROUP BY o.customer_id ORDER BY o.customer_id`,
  'latest-payment': `WITH ranked AS (SELECT order_id,status,ROW_NUMBER() OVER(PARTITION BY order_id ORDER BY created_at DESC,id DESC) n FROM payments) SELECT order_id,status FROM ranked WHERE n=1 ORDER BY order_id`,
  'unpaid-orders': `SELECT o.id order_id FROM orders o WHERE NOT EXISTS(SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.status='captured') ORDER BY o.id`,
  'duplicate-events': `SELECT event_key,COUNT(*) deliveries FROM webhook_events GROUP BY event_key HAVING COUNT(*)>1 ORDER BY event_key`,
  'customer-average': `WITH totals AS (SELECT c.id customer_id,COALESCE(SUM(p.amount_cents),0) captured_cents FROM customers c LEFT JOIN orders o ON o.customer_id=c.id LEFT JOIN payments p ON p.order_id=o.id AND p.status='captured' GROUP BY c.id) SELECT customer_id,captured_cents FROM totals WHERE captured_cents>(SELECT AVG(captured_cents) FROM totals) ORDER BY customer_id`,
  'department-ranking': `WITH ranked AS (SELECT department,name,salary,DENSE_RANK() OVER(PARTITION BY department ORDER BY salary DESC) n FROM employees) SELECT department,name,salary FROM ranked WHERE n<=2 ORDER BY department,salary DESC,name`
};
export function validateSql(query) {
  if (typeof query !== 'string' || !query.trim() || query.length > 12000) throw new Error('Enter a SELECT query of up to 12,000 characters.');
  const cleaned = query.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/;\s*$/, '');
  if (!/^(SELECT|WITH)\b/i.test(cleaned) || cleaned.includes(';') || /\b(attach|detach|pragma|insert|update|delete|drop|create|alter|replace|vacuum|recursive|load_extension|readfile|writefile)\b/i.test(cleaned)) throw new Error('Use one read-only SELECT or non-recursive WITH query.');
  return cleaned;
}
export function evaluateSql(id, source) {
  const query = validateSql(source);
  if (!referenceSql[id]) throw new Error('SQL exercise not found.');
  const checks = [];
  let preview = [];
  for (let variant = 0; variant < 3; variant++) {
    const db = new DatabaseSync(':memory:');
    try {
      for (const [name, table] of Object.entries(sqlSchema)) {
        const cols = table.columns.map((c, i) => c + ' ' + (table.rows.some(r => typeof r[i] === 'string') ? 'TEXT' : 'INTEGER'));
        db.exec(`CREATE TABLE ${name}(${cols.join(',')})`);
        const insert = db.prepare(`INSERT INTO ${name} VALUES(${table.columns.map(() => '?').join(',')})`);
        for (const row of table.rows) insert.run(...row);
      }
      if (variant === 1) db.exec("INSERT INTO payments VALUES(6,4,'captured',700,'2026-10-04 09:00'); INSERT INTO payments VALUES(7,4,'failed',700,'2026-10-04 09:00'); INSERT INTO refunds VALUES(4,4,100); INSERT INTO webhook_events VALUES(7,'evt_b'); INSERT INTO employees VALUES(8,'Hina','Data',75)");
      if (variant === 2) db.exec("INSERT INTO customers VALUES(5,'Esha'); INSERT INTO orders VALUES(6,5,100); INSERT INTO payments VALUES(8,6,'captured',100,'2026-10-05 09:00'); INSERT INTO refunds VALUES(5,8,100); DELETE FROM webhook_events WHERE event_key='evt_c'; INSERT INTO employees VALUES(9,'Isha','Design',50)");
      const rows = db.prepare(query).all().map(r => ({
        ...r
      }));
      if (rows.length > 200) throw new Error('Return no more than 200 rows.');
      const expected = db.prepare(referenceSql[id]).all().map(r => ({
        ...r
      }));
      const stable = rows => JSON.stringify(rows.map(r => Object.fromEntries(Object.entries(r).sort(([a], [b]) => a.localeCompare(b)))));
      checks.push({
        name: variant === 0 ? 'Visible dataset' : variant === 1 ? 'Retries, ties & multiple refunds' : 'Zero-spend and boundary records',
        passed: stable(rows) === stable(expected)
      });
      if (!variant) preview = rows;
    } finally {
      db.close();
    }
  }
  return {
    checks,
    rows: preview,
    score: Math.round(checks.filter(c => c.passed).length / checks.length * 100),
    verification: 'Server SQL checks'
  };
}
