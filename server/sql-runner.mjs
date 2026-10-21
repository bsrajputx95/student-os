import { evaluateSql } from './sql-labs.mjs';
process.on('message', ({
  id,
  query
}) => {
  try {
    process.send({
      type: 'studentos-sql-result',
      result: evaluateSql(id, query)
    });
  } catch (e) {
    process.send({
      type: 'studentos-sql-result',
      error: e.message
    });
  } finally {
    process.disconnect();
  }
});
