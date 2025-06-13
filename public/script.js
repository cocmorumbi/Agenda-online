const daysContainer = document.getElementById('days');
const monthYear = document.getElementById('month-year');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('close-modal');
const bookingForm = document.getElementById('booking-form');
const selectedDateInput = document.getElementById('selected-date');
const timeSelect = document.getElementById('time');
const locationSelect = document.getElementById('location');

const horariosFixos = [
  "07:10/08:00", "08:00/08:50", "09:20/10:10", "10:10/11:00", "11:00/11:50",
  "11:50/12:40", "13:10/14:00", "14:00/14:50", "14:50/15:40",
  "16:10/17:00", "17:00/17:50"
];

let currentDate = new Date();
let bookings = {}; // armazenará agendamentos carregados do backend

// Função para carregar agendamentos de um mês (todo mês, para facilitar visualização)
async function loadBookings(year, month) {
  bookings = {}; // limpa

  // Para cada dia do mês, faz requisição para buscar agendamentos daquele dia
  const lastDate = new Date(year, month + 1, 0).getDate();

  // Buscar todos os dias paralelamente
  const promises = [];
  for (let day = 1; day <= lastDate; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    promises.push(fetch(`/api/agendamentos?data=${dateStr}`).then(res => res.json()).then(data => {
      if (data.length) bookings[dateStr] = data;
    }));
  }
  await Promise.all(promises);
}

function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  monthYear.innerText = `${monthNames[month]} ${year}`;
  daysContainer.innerHTML = '';

  // preenche os dias vazios até o primeiro dia da semana
  for (let i = 0; i < firstDay; i++) {
    daysContainer.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= lastDate; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCell = document.createElement('div');
    dayCell.innerText = day;

    if (bookings[dateStr]) {
      bookings[dateStr].forEach(b => {
        const label = document.createElement('div');
        label.style.fontSize = '10px';
        label.style.background = getCorPorLocal(b.local);
        label.style.marginTop = '5px';
        label.innerText = `${b.horario} - ${b.local} (${b.nome})`;

        // Botão cancelar
        const btnCancel = document.createElement('button');
        btnCancel.textContent = 'Cancelar';
        btnCancel.style.marginLeft = '5px';
        btnCancel.style.fontSize = '8px';
        btnCancel.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('Deseja cancelar este agendamento?')) {
            fetch(`/api/agendamentos/${b.id}`, { method: 'DELETE' })
              .then(res => {
                if (!res.ok) throw new Error('Erro ao cancelar');
                // Recarrega agendamentos e calendário
                loadAndRender();
              })
              .catch(err => {
                console.error('Erro ao cancelar agendamento:', err);
                alert('Erro ao cancelar agendamento: ' + err.message);
              });

          }
        });

        label.appendChild(btnCancel);
        dayCell.appendChild(label);
      });
    }

    dayCell.addEventListener('click', () => {
      selectedDateInput.value = dateStr;
      updateHorariosDisponiveis(dateStr);
      modal.classList.remove('hidden');
    });

    daysContainer.appendChild(dayCell);
  }
}

function updateHorariosDisponiveis(date) {
  const selectedLocation = locationSelect.value;
  if (!selectedLocation) {
    // limpa opções se local não selecionado
    timeSelect.innerHTML = `<option value="">Selecione o local primeiro</option>`;
    return;
  }

  const ocupados = (bookings[date] || [])
    .filter(b => b.local === selectedLocation)
    .map(b => b.horario);

  timeSelect.innerHTML = `<option value="">Selecione o horário</option>`;
  horariosFixos.forEach(horario => {
    const option = document.createElement('option');
    option.value = horario;
    option.innerText = horario;
    if (ocupados.includes(horario)) {
      option.disabled = true;
      option.innerText += " (indisponível)";
    }
    timeSelect.appendChild(option);
  });
}

locationSelect.addEventListener('change', () => {
  const date = selectedDateInput.value;
  if (date) updateHorariosDisponiveis(date);
});

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('name').value.trim();
  const horario = document.getElementById('time').value;
  const local = document.getElementById('location').value;
  const data = selectedDateInput.value;

  if (!nome || !horario || !local || !data) {
    alert("Preencha todos os campos.");
    return;
  }

  try {
    const res = await fetch('/api/agendamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, data, horario, local }),
    });
    if (res.status === 409) {
      alert("Horário já reservado para esse local.");
      return;
    }
    if (!res.ok) throw new Error('Erro ao salvar agendamento');

    bookingForm.reset();
    modal.classList.add('hidden');
    loadAndRender();
  } catch (err) {
    alert(err.message);
  }
});

closeModal.addEventListener('click', () => {
  modal.classList.add('hidden');
});

prevBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  loadAndRender();
});

nextBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  loadAndRender();
});

async function loadAndRender() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  await loadBookings(year, month);
  renderCalendar(currentDate);
  carregarUltimosAgendamentos();
}

function carregarUltimosAgendamentos() {
  fetch('/api/ultimos-agendamentos')
    .then(res => res.json())
    .then(dados => {
      const lista = document.getElementById('ultimos-agendamentos');
      if (!lista) return; // Garante que o elemento existe
      lista.innerHTML = '';
      const lista = document.getElementById('ultimos-agendamentos');
      if (!lista) return;
      lista.innerHTML = '';

      dados.forEach(item => {
        const linha = document.createElement('div');
        linha.className = 'agendamento-linha';

        const spanData = document.createElement('span');
        spanData.textContent = item.data;

        const spanHorario = document.createElement('span');
        spanHorario.textContent = item.horario;

        const spanNome = document.createElement('span');
        spanNome.textContent = item.nome;

        const spanLocal = document.createElement('span');
        spanLocal.textContent = item.local;
        spanLocal.style.color = getCorPorLocal(item.local);

        linha.appendChild(spanData);
        linha.appendChild(spanHorario);
        linha.appendChild(spanNome);
        linha.appendChild(spanLocal);

        lista.appendChild(linha);
      });


function getCorPorLocal(local) {
  switch (local) {
    case 'Informática': return '#4caf50';   // verde
    case 'Auditório': return '#f44336';     // vermelho
    case 'Química': return '#2196f3';       // azul
    default: return '#999';                 // cinza padrão
  }
}

// Inicializa calendário e dados
document.addEventListener('DOMContentLoaded', () => {
  carregarUltimosAgendamentos();
  loadAndRender();
});

