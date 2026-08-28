const monthYear = document.getElementById('month-year');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('close-modal');
const bookingForm = document.getElementById('booking-form');
const selectedDateInput = document.getElementById('selected-date');
const timeSelect = document.getElementById('time');
const locationSelect = document.getElementById('location');

// Elementos do filtro e gaveta
const filtroSalaSelect = document.getElementById('filtro-sala');
const drawerDetalhes = document.getElementById('drawer-detalhes');
const drawerDataTitulo = document.getElementById('drawer-data-titulo');
const drawerListaAgendamentos = document.getElementById('drawer-lista-agendamentos');
const btnNovoAgendamentoDrawer = document.getElementById('btn-novo-agendamento-drawer');

const horariosFixos = [
  "07:10/08:00", "08:00/08:50", "09:00/10:10", "10:10/11:00", "11:00/11:50",
  "11:50/12:40", "13:10/14:00", "14:00/14:50", "14:50/15:40", "16:10/17:00"
];

let currentDate = new Date();
let bookings = {}; // Armazena os agendamentos vindos do backend
let diaSelecionadoDrawer = null;

// Gestos de Deslizar (Swipe)
let toqueInicialX = 0;
let toqueFinalX = 0;

// Função para carregar agendamentos do mês no backend
async function loadBookings(year, month) {
  bookings = {}; 
  const lastDate = new Date(year, month + 1, 0).getDate();
  const promises = [];

  for (let day = 1; day <= lastDate; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    promises.push(
      fetch(`/api/agendamentos?data=${dateStr}`)
        .then(res => res.json())
        .then(data => {
          if (data.length) bookings[dateStr] = data;
        })
        .catch(err => console.error("Erro ao carregar data:", dateStr, err))
    );
  }
  await Promise.all(promises);
}

// Renderiza o calendário em blocos de semanas
function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const weeksWrapper = document.getElementById('weeks-wrapper');
  
  if (!weeksWrapper) return;
  weeksWrapper.innerHTML = '';

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  monthYear.innerText = `${monthNames[month]} ${year}`;

  const primeiroDiaMes = new Date(year, month, 1);
  const ultimoDiaMes = new Date(year, month + 1, 0);
  
  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  // Monta os dias úteis do mês divididos por semanas (Segunda a Sexta)
  let semanas = [];
  let semanaAtual = [];

  for (let d = 1; d <= ultimoDiaMes.getDate(); d++) {
    const tempDate = new Date(year, month, d);
    const dayOfWeek = tempDate.getDay();

    // Ignora Sábado (6) e Domingo (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    semanaAtual.push(tempDate);

    // Se for Sexta (5) ou o último dia do mês, fecha a semana
    if (dayOfWeek === 5 || d === ultimoDiaMes.getDate()) {
      semanas.push(semanaAtual);
      semanaAtual = [];
    }
  }

  const salaFiltro = filtroSalaSelect ? filtroSalaSelect.value : 'todas';

  // Desenha cada bloco de semana
  semanas.forEach((semana, index) => {
    const semanaBloco = document.createElement('div');
    semanaBloco.className = 'semana-bloco recolhida';

    const inicioSemana = semana[0];
    const fimSemana = semana[semana.length - 1];
    
    // Verifica se a semana contém o dia de hoje
    const contemHoje = semana.some(d => {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === hojeStr;
    });

    // Se for a semana do dia de hoje (ou a primeira semana se hoje não estiver no mês), mantém aberta
    if (contemHoje || (index === 0 && !semanas.some(s => s.some(d => {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === hojeStr;
    })))) {
      semanaBloco.classList.remove('recolhida');
      semanaBloco.classList.add('ativa');
    }

    // Header da Semana
    const semanaHeader = document.createElement('div');
    semanaHeader.className = 'semana-header';
    semanaHeader.innerHTML = `
      <span>Semana ${index + 1} (${inicioSemana.getDate()}/${inicioSemana.getMonth()+1} - ${fimSemana.getDate()}/${fimSemana.getMonth()+1})</span>
      <span class="seta-toggle">▼</span>
    `;
    semanaHeader.addEventListener('click', () => {
      semanaBloco.classList.toggle('recolhida');
    });

    // Corpo com os Cards dos Dias
    const semanaCorpo = document.createElement('div');
    semanaCorpo.className = 'semana-corpo';

    const semanaDiasGrid = document.createElement('div');
    semanaDiasGrid.className = 'semana-dias-grid';

    semana.forEach(dataDia => {
      const dateStr = `${dataDia.getFullYear()}-${String(dataDia.getMonth() + 1).padStart(2, '0')}-${String(dataDia.getDate()).padStart(2, '0')}`;
      
      const diaCard = document.createElement('div');
      diaCard.className = 'dia-card';
      if (dateStr === hojeStr) diaCard.classList.add('hoje');

      const diaNum = document.createElement('span');
      diaNum.className = 'dia-num';
      diaNum.innerText = dataDia.getDate();
      diaCard.appendChild(diaNum);

      // Container de Pontinhos (Dots)
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'dots-container';

      const agendamentosDoDia = bookings[dateStr] || [];
      const agendamentosFiltrados = agendamentosDoDia.filter(b => salaFiltro === 'todas' || b.local === salaFiltro);

      // Exibe até 3 pontinhos para manter o visual limpo
      agendamentosFiltrados.slice(0, 3).forEach(b => {
        const dot = document.createElement('span');
        const classeSala = b.local ? b.local.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'Padrao';
        dot.className = `dot ${classeSala}`;
        dotsContainer.appendChild(dot);
      });

      diaCard.appendChild(dotsContainer);

      // Clique no dia -> Abre a Gaveta (Drawer)
      diaCard.addEventListener('click', () => {
        abrirDrawer(dateStr, dataDia);
      });

      semanaDiasGrid.appendChild(diaCard);
    });

    semanaCorpo.appendChild(semanaDiasGrid);
    semanaBloco.appendChild(semanaHeader);
    semanaBloco.appendChild(semanaCorpo);
    weeksWrapper.appendChild(semanaBloco);
  });
}

// Filtro no topo
function filtrarEAtualizarAgenda() {
  renderCalendar(currentDate);
}

// Abrir e Gerenciar a Gaveta (Drawer)
function abrirDrawer(dateStr, dataObj) {
  diaSelecionadoDrawer = dateStr;
  
  const diaFmt = String(dataObj.getDate()).padStart(2, '0');
  const mesFmt = String(dataObj.getMonth() + 1).padStart(2, '0');
  drawerDataTitulo.innerText = `Agendamentos - ${diaFmt}/${mesFmt}/${dataObj.getFullYear()}`;

  renderizarListaDrawer(dateStr);
  drawerDetalhes.classList.remove('hidden');
}

function renderizarListaDrawer(dateStr) {
  drawerListaAgendamentos.innerHTML = '';
  const salaFiltro = filtroSalaSelect ? filtroSalaSelect.value : 'todas';
  const agendamentos = (bookings[dateStr] || []).filter(b => salaFiltro === 'todas' || b.local === salaFiltro);

  if (agendamentos.length === 0) {
    drawerListaAgendamentos.innerHTML = `<div class="sem-agendamento-msg">Nenhum agendamento para este dia.</div>`;
    return;
  }

  agendamentos.forEach(b => {
    const item = document.createElement('div');
    const classeSala = b.local ? b.local.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'Padrao';
    item.className = `item-agendamento ${classeSala}`;

    const info = document.createElement('div');
    info.className = 'item-agendamento-info';
    info.innerHTML = `
      <h4>${b.horario} - ${b.local}</h4>
      <p>Reservado por: <strong>${b.nome}</strong></p>
    `;

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn-cancelar-item';
    btnCancel.textContent = 'Cancelar';
    btnCancel.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Deseja cancelar a reserva de ${b.nome}?`)) {
        fetch(`/api/agendamentos/${b.id}`, { method: 'DELETE' })
          .then(res => {
            if (!res.ok) throw new Error('Erro ao cancelar');
            loadAndRender();
            fecharDrawer();
          })
          .catch(err => {
            console.error('Erro ao cancelar agendamento:', err);
            alert('Erro ao cancelar agendamento: ' + err.message);
          });
      }
    });

    item.appendChild(info);
    item.appendChild(btnCancel);
    drawerListaAgendamentos.appendChild(item);
  });
}

function fecharDrawer() {
  drawerDetalhes.classList.add('hidden');
}

function fecharDrawerNoFundo(event) {
  if (event.target.id === 'drawer-detalhes') {
    fecharDrawer();
  }
}

// Ação do Botão "+ Agendar neste dia" da Gaveta
if (btnNovoAgendamentoDrawer) {
  btnNovoAgendamentoDrawer.addEventListener('click', () => {
    if (diaSelecionadoDrawer) {
      fecharDrawer();
      selectedDateInput.value = diaSelecionadoDrawer;
      updateHorariosDisponiveis(diaSelecionadoDrawer);
      modal.classList.remove('hidden');
    }
  });
}

// Atualização de Horários Disponíveis no Form
function updateHorariosDisponiveis(date) {
  const selectedLocation = locationSelect.value;
  if (!selectedLocation) {
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

// Envio do formulário de agendamento
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

  let onesignalId = null;
  if (window.OneSignal) {
    try {
      onesignalId = await OneSignal.User.PushSubscription.id;
    } catch (err) {
      console.log("Não foi possível obter ID do OneSignal:", err);
    }
  }

  try {
    const res = await fetch('/api/agendamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, data, horario, local, onesignalId }),
    });
    if (res.status === 409) {
      alert("Horário já reservado para esse local.");
      return;
    }
    if (!res.ok) throw new Error('Erro ao salvar agendamento');

    bookingForm.reset();
    modal.classList.add('hidden');
    await loadAndRender();
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
}

// Cores por local para utilitários externos
function getCorPorLocal(local) {
  switch (local) {
    case 'Informática': return '#2563eb';
    case 'Auditório': return '#9333ea';
    case 'Química': return '#16a34a';
    case 'Matemática': return '#ea580c';
    default: return '#6b7280';
  }
}

// Suporte e Guia do iOS
function verificarExibicaoBotaoIOS() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS && !isStandalone) {
    const btn = document.getElementById('btn-ajuda-ios');
    if (btn) btn.style.display = 'block';
  }
}

function abrirGuiaIOS() {
  const modalGuia = document.getElementById('modal-guia-ios');
  if (modalGuia) modalGuia.style.display = 'flex';
}

function fecharGuiaIOS() {
  const modalGuia = document.getElementById('modal-guia-ios');
  if (modalGuia) modalGuia.style.display = 'none';
}

function fecharGuiaIOSNoFundo(event) {
  if (event.target.id === 'modal-guia-ios') {
    fecharGuiaIOS();
  }
}

// Suporte aos gestos de deslizar (Swipe)
const calendarContainer = document.getElementById('calendar-container');
if (calendarContainer) {
  calendarContainer.addEventListener('touchstart', (e) => {
    toqueInicialX = e.changedTouches[0].screenX;
  }, { passive: true });

  calendarContainer.addEventListener('touchend', (e) => {
    toqueFinalX = e.changedTouches[0].screenX;
    tratarGestoSwipe();
  }, { passive: true });
}

function tratarGestoSwipe() {
  const limiteSensibilidade = 60;
  if (toqueInicialX - toqueFinalX > limiteSensibilidade) {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadAndRender();
  } else if (toqueFinalX - toqueInicialX > limiteSensibilidade) {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadAndRender();
  }
}

// Atualização automática a cada 5 minutos
setInterval(() => {
  loadAndRender();
}, 300000);

// Inicialização da Página
document.addEventListener('DOMContentLoaded', () => {
  verificarExibicaoBotaoIOS();
  loadAndRender();
});