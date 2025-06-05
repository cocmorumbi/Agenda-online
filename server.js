const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 3000;

// Configurações
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // pasta onde está o index.html, script.js etc.

// Conectar ao banco de dados SQLite
const db = new sqlite3.Database('./agenda.db', (err) => {
  if (err) return console.error('Erro ao abrir banco:', err.message);
  console.log('🗄️ Banco de dados conectado com sucesso.');
});

// Criar tabela se não existir
db.run(`
  CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    data TEXT NOT NULL,
    horario TEXT NOT NULL,
    local TEXT NOT NULL,
    UNIQUE(data, horario, local)
  )
`);

// Rota GET: buscar agendamentos por data
app.get('/api/agendamentos', (req, res) => {
  const data = req.query.data;
  if (!data) return res.status(400).json({ error: 'Data não fornecida' });

  db.all('SELECT * FROM agendamentos WHERE data = ?', [data], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Rota POST: criar novo agendamento
app.post('/api/agendamentos', (req, res) => {
  const { nome, data, horario, local } = req.body;
  if (!nome || !data || !horario || !local) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  db.run(
    'INSERT INTO agendamentos (nome, data, horario, local) VALUES (?, ?, ?, ?)',
    [nome, data, horario, local],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Horário já reservado para esse local' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Rota DELETE: cancelar agendamento por ID
app.delete('/api/agendamentos/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM agendamentos WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json({ message: 'Agendamento cancelado com sucesso' });
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});



