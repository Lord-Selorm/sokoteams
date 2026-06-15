const Database = require('better-sqlite3');
const db = new Database('./server/teamflow.db');
const msgs = db.prepare("SELECT DISTINCT userAvatar FROM messages WHERE userAvatar != '' LIMIT 10").all();
console.log(JSON.stringify(msgs, null, 2));
db.close();
