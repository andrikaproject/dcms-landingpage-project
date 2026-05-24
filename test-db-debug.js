import "dotenv/config";
import mysql from "mysql2/promise";

const connectionString = process.env.DATABASE_URL;
console.log("🔗 Testing connection to:", connectionString);

async function test() {
    let connection;

    try {
        connection = await mysql.createConnection({
            uri: connectionString,
            connectTimeout: 5000,
        });

        console.log("✅ Successfully connected to MySQL/MariaDB server!");

        const [rows] = await connection.query(
            "SELECT DATABASE() AS database_name, CURRENT_USER() AS current_user"
        );

        console.log("📊 Current DB info:", rows[0]);
    } catch (err) {
        console.error("❌ Connection failed:");
        console.error(err.message);
    } finally {
        await connection?.end();
    }
}

test();
