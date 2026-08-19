require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function backup() {
  try {
    console.log("Conectando ao Neon...");

    const result = await pool.query(`
      SELECT *
      FROM agendamentos
      ORDER BY data, horario
    `);

    console.log(`Encontrados ${result.rows.length} agendamentos.`);

    fs.writeFileSync(
      "backup-agendamentos.json",
      JSON.stringify(result.rows, null, 2),
      "utf8"
    );

    console.log("✅ Backup criado: backup-agendamentos.json");
  } catch (err) {
    console.error("❌ Erro ao fazer backup:");
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

backup();