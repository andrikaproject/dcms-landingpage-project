const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
console.log("🔗 Testing connection to:", connectionString);

const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000 // 5 seconds timeout
});

async function test() {
    try {
        const client = await pool.connect();
        console.log("✅ Successfully connected to PostgreSQL server!");

        const res = await client.query('SELECT current_database(), current_schema()');
        console.log("📊 Current DB info:", res.rows[0]);

        client.release();
    } catch (err) {
        console.error("❌ Connection failed:");
        console.error(err.message);
        if (err.detail) console.error("Detail:", err.detail);
        if (err.hint) console.error("Hint:", err.hint);
    } finally {
        await pool.end();
    }
}

test();
