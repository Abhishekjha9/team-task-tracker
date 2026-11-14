// information_schema lookups used to make migrations idempotent.
const one = async (conn, sql, params) => {
  const [[row]] = await conn.query(sql, params);
  return row.n > 0;
};

exports.tableExists = (conn, table) =>
  one(conn, 'SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [table]);

exports.columnExists = (conn, table, column) =>
  one(conn, 'SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [table, column]);

exports.indexExists = (conn, table, index) =>
  one(conn, 'SELECT COUNT(*) n FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', [table, index]);

exports.foreignKeyExists = (conn, table, fk) =>
  one(conn, "SELECT COUNT(*) n FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = ? AND constraint_name = ? AND constraint_type = 'FOREIGN KEY'", [table, fk]);
