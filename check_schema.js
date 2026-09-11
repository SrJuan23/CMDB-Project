const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('backend/data/cmdb.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t=>t.name).join(', '));
console.log('\n--- Column count per table ---');
for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(`${t.name}: ${cols.length} cols (${cols.map(c=>c.name).join(', ')})`);
}
db.close();