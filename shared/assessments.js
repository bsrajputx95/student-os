export const projectLabs = [{
  id: 'webhook-replay',
  title: 'The customer was charged twice',
  type: 'Project debugging',
  skill: 'Backend',
  difficulty: 'Intermediate',
  minutes: 45,
  focus: 'Payments · Idempotency',
  file: 'src/webhooks.js',
  fn: 'handleWebhook',
  incident: 'A payment provider retries a webhook after a timeout. The ledger credits the same payment twice, and pending events also change the balance.',
  objective: 'Return a new ledger with balanceCents and seen. Only a payment.succeeded event with a positive integer amountCents may credit the balance. Ignore an event already in seen. Do not mutate the supplied ledger. Only successfully processed IDs join seen.',
  acceptance: ['A successful payment credits integer cents once.', 'Replayed, pending, negative, and fractional amounts leave the ledger unchanged.', 'Input objects remain unchanged.'],
  hint: 'Validate the event before recording its ID. An idempotency check belongs before the balance change.',
  starter: 'export function handleWebhook(ledger, event) {\n  return { balanceCents: ledger.balanceCents + event.amountCents, seen: [...ledger.seen, event.id] };\n}\n',
  tests: [{
    name: 'Successful payment',
    args: [{
      balanceCents: 1000,
      seen: []
    }, {
      id: 'evt_1',
      type: 'payment.succeeded',
      amountCents: 250
    }],
    expected: {
      balanceCents: 1250,
      seen: ['evt_1']
    }
  }, {
    name: 'Provider retries the event',
    args: [{
      balanceCents: 1250,
      seen: ['evt_1']
    }, {
      id: 'evt_1',
      type: 'payment.succeeded',
      amountCents: 250
    }],
    expected: {
      balanceCents: 1250,
      seen: ['evt_1']
    }
  }, {
    name: 'Pending is not captured',
    args: [{
      balanceCents: 1000,
      seen: []
    }, {
      id: 'evt_2',
      type: 'payment.pending',
      amountCents: 250
    }],
    expected: {
      balanceCents: 1000,
      seen: []
    }
  }, {
    name: 'Invalid negative amount',
    args: [{
      balanceCents: 1000,
      seen: []
    }, {
      id: 'evt_3',
      type: 'payment.succeeded',
      amountCents: -50
    }],
    expected: {
      balanceCents: 1000,
      seen: []
    }
  }, {
    name: 'Reject fractional cents',
    args: [{
      balanceCents: 1000,
      seen: []
    }, {
      id: 'evt_4',
      type: 'payment.succeeded',
      amountCents: 1.5
    }],
    expected: {
      balanceCents: 1000,
      seen: []
    }
  }]
}, {
  id: 'refund-boundary',
  title: 'Refunds exceed the captured amount',
  type: 'Project debugging',
  skill: 'Backend',
  difficulty: 'Intermediate',
  minutes: 40,
  focus: 'Payments · Money precision',
  file: 'src/refunds.js',
  fn: 'refundPayment',
  incident: 'Partial refunds are processed in mixed units. Repeated requests can refund more money than was captured.',
  objective: 'refundPayment(payment, amountCents) returns {ok:true,totalRefundedCents} for valid refunds. All money uses integer cents. Return {ok:false,error} with NOT_CAPTURED for any status other than captured; INVALID_REFUND for non-positive or fractional amounts; EXCEEDS_CAPTURED if cumulative refunds exceed capturedCents. Check in that order. Do not mutate payment.',
  acceptance: ['Integer minor units throughout.', 'Existing refunds count toward the limit.', 'A refund equal to the remaining captured amount succeeds.'],
  hint: 'Compare refundedCents + amountCents against capturedCents. Never convert to floating point currency for this calculation.',
  starter: 'export function refundPayment(payment, amountCents) {\n  if (amountCents > payment.capturedCents) return {ok:false,error:"EXCEEDS_CAPTURED"};\n  return {ok:true,totalRefundedCents:payment.refundedCents / 100 + amountCents};\n}\n',
  tests: [{
    name: 'First refund',
    args: [{
      status: 'captured',
      capturedCents: 1000,
      refundedCents: 0
    }, 200],
    expected: {
      ok: true,
      totalRefundedCents: 200
    }
  }, {
    name: 'Cumulative limit',
    args: [{
      status: 'captured',
      capturedCents: 1000,
      refundedCents: 900
    }, 200],
    expected: {
      ok: false,
      error: 'EXCEEDS_CAPTURED'
    }
  }, {
    name: 'Exact remaining balance',
    args: [{
      status: 'captured',
      capturedCents: 1000,
      refundedCents: 900
    }, 100],
    expected: {
      ok: true,
      totalRefundedCents: 1000
    }
  }, {
    name: 'Not captured',
    args: [{
      status: 'pending',
      capturedCents: 1000,
      refundedCents: 0
    }, 100],
    expected: {
      ok: false,
      error: 'NOT_CAPTURED'
    }
  }, {
    name: 'Fractional minor units',
    args: [{
      status: 'captured',
      capturedCents: 1000,
      refundedCents: 0
    }, 1.5],
    expected: {
      ok: false,
      error: 'INVALID_REFUND'
    }
  }, {
    name: 'Zero refund',
    args: [{
      status: 'captured',
      capturedCents: 1000,
      refundedCents: 0
    }, 0],
    expected: {
      ok: false,
      error: 'INVALID_REFUND'
    }
  }]
}, {
  id: 'inventory-atomicity',
  title: 'The checkout oversells inventory',
  type: 'Project debugging',
  skill: 'Backend',
  difficulty: 'Advanced',
  minutes: 60,
  focus: 'Checkout · Atomic changes',
  file: 'src/inventory.js',
  fn: 'reserveStock',
  incident: 'A cart can contain the same SKU twice. Stock is decremented line by line, and failed checkouts leave partially modified inventory.',
  objective: 'reserveStock(stock, cart) returns {ok:true,stock:updatedStock} if every requested quantity can be reserved, or {ok:false,stock:originalStock} otherwise. Aggregate repeated SKUs. Quantities must be positive integers and every SKU must exist. Never mutate the input stock or cart.',
  acceptance: ['Duplicate cart lines are aggregated.', 'The whole reservation succeeds or nothing changes.', 'Unknown SKUs and invalid quantities fail.'],
  hint: 'Build a demand map, validate the complete demand, and only then create the updated inventory.',
  starter: 'export function reserveStock(stock, cart) {\n  for (const item of cart) {\n    if (stock[item.sku] < item.qty) return {ok:false,stock};\n    stock[item.sku] -= item.qty;\n  }\n  return {ok:true,stock};\n}\n',
  tests: [{
    name: 'Normal cart',
    args: [{
      a: 5,
      b: 3
    }, [{
      sku: 'a',
      qty: 2
    }]],
    expected: {
      ok: true,
      stock: {
        a: 3,
        b: 3
      }
    }
  }, {
    name: 'Repeated SKU exceeds stock',
    args: [{
      a: 3
    }, [{
      sku: 'a',
      qty: 2
    }, {
      sku: 'a',
      qty: 2
    }]],
    expected: {
      ok: false,
      stock: {
        a: 3
      }
    }
  }, {
    name: 'Rollback complete cart',
    args: [{
      a: 5,
      b: 1
    }, [{
      sku: 'a',
      qty: 2
    }, {
      sku: 'b',
      qty: 2
    }]],
    expected: {
      ok: false,
      stock: {
        a: 5,
        b: 1
      }
    }
  }, {
    name: 'Unknown product',
    args: [{
      a: 5
    }, [{
      sku: 'x',
      qty: 1
    }]],
    expected: {
      ok: false,
      stock: {
        a: 5
      }
    }
  }, {
    name: 'Negative quantity',
    args: [{
      a: 5
    }, [{
      sku: 'a',
      qty: -1
    }]],
    expected: {
      ok: false,
      stock: {
        a: 5
      }
    }
  }, {
    name: 'Empty cart',
    args: [{
      a: 5
    }, []],
    expected: {
      ok: true,
      stock: {
        a: 5
      }
    }
  }]
}, {
  id: 'retry-storm',
  title: 'A retry storm takes down checkout',
  type: 'Project debugging',
  skill: 'DevOps',
  difficulty: 'Intermediate',
  minutes: 35,
  focus: 'Reliability · Backoff',
  file: 'src/retry.js',
  fn: 'retryPlan',
  incident: 'The client retries every unsuccessful response immediately. A short provider outage becomes a flood of repeated requests.',
  objective: 'Return {retry,delayMs}. Retry only HTTP 429 and 500–599 while attempt is 0, 1, or 2. Use 1000 * 2^attempt milliseconds, except a positive Retry-After value on 429 takes precedence (seconds converted to milliseconds). For all other cases return {retry:false,delayMs:0}.',
  acceptance: ['Permanent client errors do not retry.', 'Attempts are bounded.', 'Rate limits respect Retry-After.'],
  hint: 'Classify transient responses first, then check the attempt budget, then calculate a delay.',
  starter: 'export function retryPlan(status, attempt, retryAfterSeconds) {\n  return {retry:status !== 200,delayMs:0};\n}\n',
  tests: [{
    name: 'Server error uses backoff',
    args: [503, 1, null],
    expected: {
      retry: true,
      delayMs: 2000
    }
  }, {
    name: 'Rate limit hint',
    args: [429, 0, 4],
    expected: {
      retry: true,
      delayMs: 4000
    }
  }, {
    name: 'Permanent bad request',
    args: [400, 0, null],
    expected: {
      retry: false,
      delayMs: 0
    }
  }, {
    name: 'Budget exhausted',
    args: [503, 3, null],
    expected: {
      retry: false,
      delayMs: 0
    }
  }, {
    name: 'Success',
    args: [201, 0, null],
    expected: {
      retry: false,
      delayMs: 0
    }
  }, {
    name: 'Missing retry hint',
    args: [429, 2, 0],
    expected: {
      retry: true,
      delayMs: 4000
    }
  }]
}, {
  id: 'tenant-isolation',
  title: 'An API leaks another tenant’s orders',
  type: 'Project debugging',
  skill: 'Backend',
  difficulty: 'Intermediate',
  minutes: 40,
  focus: 'API · Authorization & pagination',
  file: 'src/orders.js',
  fn: 'listOrders',
  incident: 'Pagination is applied before tenant filtering. Responses skip valid orders and sometimes include another tenant’s records.',
  objective: 'listOrders(orders, tenantId, cursor, limit) returns only that tenant’s orders whose numeric id is greater than cursor, sorted by id ascending, then limited. A limit below 1 returns an empty array. Do not mutate orders.',
  acceptance: ['Tenant isolation is enforced before slicing.', 'Cursor ordering is deterministic.', 'Input arrays are preserved.'],
  hint: 'Filter, copy/sort, then paginate. A page boundary must never bypass authorization.',
  starter: 'export function listOrders(orders, tenantId, cursor, limit) {\n  return orders.slice(0,limit).filter(order => order.id > cursor);\n}\n',
  tests: [{
    name: 'Isolate tenant before pagination',
    args: [[{
      id: 1,
      tenant: 'b'
    }, {
      id: 2,
      tenant: 'a'
    }, {
      id: 3,
      tenant: 'a'
    }], 'a', 0, 2],
    expected: [{
      id: 2,
      tenant: 'a'
    }, {
      id: 3,
      tenant: 'a'
    }]
  }, {
    name: 'Stable ordering',
    args: [[{
      id: 5,
      tenant: 'a'
    }, {
      id: 2,
      tenant: 'a'
    }, {
      id: 4,
      tenant: 'a'
    }], 'a', 2, 2],
    expected: [{
      id: 4,
      tenant: 'a'
    }, {
      id: 5,
      tenant: 'a'
    }]
  }, {
    name: 'No cross-tenant result',
    args: [[{
      id: 1,
      tenant: 'b'
    }], 'a', 0, 5],
    expected: []
  }, {
    name: 'Empty page',
    args: [[{
      id: 1,
      tenant: 'a'
    }], 'a', 5, 2],
    expected: []
  }, {
    name: 'Invalid page size',
    args: [[{
      id: 1,
      tenant: 'a'
    }], 'a', 0, 0],
    expected: []
  }]
}];
export const sqlLabs = [{
  id: 'net-revenue',
  title: 'Reconcile net payment revenue',
  type: 'SQL',
  skill: 'Databases',
  difficulty: 'Advanced',
  minutes: 30,
  focus: 'JOIN · Aggregation · Refunds',
  objective: 'For customers with captured payments, return customer_id and net_cents (captured amounts minus all refunds on those payments). Ignore failed payments. Order by customer_id ascending. Avoid multiplying payment values when a payment has several refunds.',
  hint: 'Aggregate refunds per payment before joining them to captured payments.'
}, {
  id: 'latest-payment',
  title: 'Find the latest payment status',
  type: 'SQL',
  skill: 'Databases',
  difficulty: 'Intermediate',
  minutes: 25,
  focus: 'Window functions · Tie breaking',
  objective: 'Return order_id and status for the latest payment of each order. Sort created_at descending, then id descending to break equal timestamps. Return rows ordered by order_id. Orders with no payment should not appear.',
  hint: 'ROW_NUMBER partitioned by order_id can choose one row per order.'
}, {
  id: 'unpaid-orders',
  title: 'Find orders without a captured payment',
  type: 'SQL',
  skill: 'Databases',
  difficulty: 'Foundation',
  minutes: 20,
  focus: 'NOT EXISTS · NULL handling',
  objective: 'Return order_id for every order without any captured payment, including orders with only failed payments and orders with no payment records. Order by order_id ascending.',
  hint: 'Test for the absence of a captured payment rather than the absence of every payment.'
}, {
  id: 'duplicate-events',
  title: 'Audit duplicate webhook deliveries',
  type: 'SQL',
  skill: 'Databases',
  difficulty: 'Foundation',
  minutes: 15,
  focus: 'GROUP BY · HAVING',
  objective: 'Return event_key and deliveries for webhook event keys received more than once. Count each stored delivery. Order by event_key ascending.',
  hint: 'Use GROUP BY and filter the group count with HAVING.'
}, {
  id: 'customer-average',
  title: 'Customers above the average captured spend',
  type: 'SQL',
  skill: 'Databases',
  difficulty: 'Advanced',
  minutes: 30,
  focus: 'CTE · Aggregate over aggregates',
  objective: 'Return customer_id and captured_cents for customers whose captured payment total is strictly greater than the average customer total. Include customers with zero captured spend in the average. Refunds are not part of this task. Order by customer_id.',
  hint: 'First build one row for every customer, including zero totals. Then calculate the average of those rows.'
}, {
  id: 'department-ranking',
  title: 'Top two salary bands in each department',
  type: 'SQL',
  skill: 'Databases',
  difficulty: 'Intermediate',
  minutes: 25,
  focus: 'DENSE_RANK · Ties',
  objective: 'Return department, name, and salary for employees in the two highest distinct salary bands in each department. Include all ties. Order by department ascending, salary descending, then name ascending.',
  hint: 'DENSE_RANK preserves distinct salary bands without skipping ranks after a tie.'
}];
export const assessmentLabs = [...projectLabs, ...sqlLabs];
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export const sqlSchema = {
  customers: {
    columns: ['id', 'name'],
    rows: [[1, 'Asha'], [2, 'Bilal'], [3, 'Chitra'], [4, 'Dev']]
  },
  orders: {
    columns: ['id', 'customer_id', 'total_cents'],
    rows: [[1, 1, 1000], [2, 1, 500], [3, 2, 2000], [4, 3, 700], [5, 3, 300]]
  },
  payments: {
    columns: ['id', 'order_id', 'status', 'amount_cents', 'created_at'],
    rows: [[1, 1, 'captured', 1000, '2026-10-01 09:00'], [2, 2, 'failed', 500, '2026-10-02 09:00'], [3, 2, 'captured', 500, '2026-10-02 10:00'], [4, 3, 'captured', 2000, '2026-10-03 09:00'], [5, 4, 'failed', 700, '2026-10-04 09:00']]
  },
  refunds: {
    columns: ['id', 'payment_id', 'amount_cents'],
    rows: [[1, 1, 100], [2, 1, 200], [3, 4, 500]]
  },
  webhook_events: {
    columns: ['id', 'event_key'],
    rows: [[1, 'evt_a'], [2, 'evt_a'], [3, 'evt_b'], [4, 'evt_c'], [5, 'evt_c'], [6, 'evt_c']]
  },
  employees: {
    columns: ['id', 'name', 'department', 'salary'],
    rows: [[1, 'Asha', 'Engineering', 90], [2, 'Bilal', 'Engineering', 90], [3, 'Chitra', 'Engineering', 80], [4, 'Dev', 'Engineering', 70], [5, 'Esha', 'Data', 75], [6, 'Farah', 'Data', 65], [7, 'Giri', 'Data', 65]]
  }
};
export function projectFiles(lab, code = lab.starter) {
  return {
    'package.json': JSON.stringify({
      name: 'studentos-' + lab.id,
      private: true,
      type: 'module',
      scripts: {
        test: 'node --test'
      }
    }, null, 2),
    [lab.file]: code,
    'fixtures/cases.json': JSON.stringify(lab.tests, null, 2),
    'test/assessment.test.js': `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {readFileSync} from 'node:fs';\nimport {${lab.fn}} from '../${lab.file}';\nconst cases=JSON.parse(readFileSync(new URL('../fixtures/cases.json',import.meta.url),'utf8'));\nfor(const item of cases)test(item.name,async()=>{const args=structuredClone(item.args),before=structuredClone(args);assert.deepEqual(await ${lab.fn}(...args),item.expected);assert.deepEqual(args,before,'Do not mutate inputs');});\n`,
    'README.md': `# ${lab.title}\n\nOriginal StudentOS practice project. No real payments or external services.\n\n## Incident\n${lab.incident}\n\n## Your task\n${lab.objective}\n\n${lab.acceptance.map(a => '- ' + a).join('\n')}\n\n## Run\nNode 22+; no dependency installation required.\n\n    npm test\n\nEdit ${lab.file}, rerun tests, and explain your fix and one regression risk. Starter tests intentionally fail. Tests are supplied for local practice, not a proctored hiring assessment.\n`
  };
}
