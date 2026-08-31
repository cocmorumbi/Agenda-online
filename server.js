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

async function agendarNotificacaoOneSignal(subscriptionId, nome, local, dataHoraDisparo) {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        include_subscription_ids: [subscriptionId], // Notifica especificamente este celular
        contents: { pt: `Olá ${nome}, sua reserva na sala de ${local} começa em 10 minutos!` },
        headings: { pt: 'Lembrete de Aula 📅' },
        send_after: dataHoraDisparo.toISOString() // Data formatada em ISO UTC para o agendamento
      })
    });

    const data = await response.json();
    console.log('Notificação agendada no OneSignal:', data);
  } catch (error) {
    console.error('Erro ao agendar notificação no OneSignal:', error);
  }
}

// Rota POST: criar novo agendamento
app.post('/api/agendamentos', async (req, res) => {
  const { nome, data, horario, local, onesignalId } = req.body;
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
    if (onesignalId) {
      const horaInicial = horario.split('/')[0];
      const dataHoraAula = new Date(`${data}T${horaInicial}:00`);
      const dataHoraNotificacao = new Date(dataHoraAula.getTime() - (10 * 60 * 1000));
      if (dataHoraNotificacao > new Date()) {
        agendarNotificacaoOneSignal(onesignalId, nome, local, dataHoraNotificacao);
      }
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

async function limparAgendamentosAntigos() {
    try {
        await pool.query(`
            DELETE FROM agendamentos
            WHERE data < CURRENT_DATE - INTERVAL '6 months'
        `);

        console.log('🧹 Agendamentos com mais de 6 meses removidos.');
    } catch (error) {
        console.error('❌ Erro ao limpar agendamentos antigos:', error.message);
    }
}

limparAgendamentosAntigos();

setInterval(limparAgendamentosAntigos, 24 * 60 * 60 * 1000);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

// Rota GET: próximas aulas
// Rota GET: próximos agendamentos
app.get('/api/proximas-aulas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM agendamentos
      WHERE 
        (data > CURRENT_DATE)
        OR (data = CURRENT_DATE AND substring(horario from '^[0-9]{2}:[0-9]{2}')::time >= CURRENT_TIME)
      ORDER BY data ASC, substring(horario from '^[0-9]{2}:[0-9]{2}')::time ASC
      LIMIT 5;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
