const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // PostgreSQL
const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configurar pool de conexão com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // necessário no Render
  }
});

// Criar tabela se não existir
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        data DATE NOT NULL,
        horario TEXT NOT NULL,
        local TEXT NOT NULL,
        UNIQUE(data, horario, local)
      )
    `);
    console.log('🗄️ Tabela "agendamentos" pronta no banco PostgreSQL.');
  } catch (err) {
    console.error('Erro criando tabela:', err);
  }
})();

// Rota GET: buscar agendamentos por data
app.get('/api/agendamentos', async (req, res) => {
  const data = req.query.data;
  if (!data) return res.status(400).json({ error: 'Data não fornecida' });

  try {
    const result = await pool.query('SELECT * FROM agendamentos WHERE data = $1', [data]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota POST: criar novo agendamento
app.post('/api/agendamentos', async (req, res) => {
  const { nome, data, horario, local } = req.body;
  if (!nome || !data || !horario || !local) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  try {
    await pool.query(
      'INSERT INTO agendamentos (nome, data, horario, local) VALUES ($1, $2, $3, $4)',
      [nome, data, horario, local]
    );
    res.status(201).json({ message: 'Agendamento criado com sucesso!' });
  } catch (err) {
    if (err.code === '23505') { // código de violação de UNIQUE constraint no Postgres
      return res.status(409).json({ error: 'Horário já reservado para esse local' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Rota DELETE: cancelar agendamento por ID
app.delete('/api/agendamentos/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('DELETE FROM agendamentos WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    res.json({ message: 'Agendamento cancelado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
