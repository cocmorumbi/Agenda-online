const monthYear = document.getElementById('month-year');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

// Elementos do filtro e gaveta
const filtroSalaSelect = document.getElementById('filtro-sala');
const drawerDetalhes = document.getElementById('drawer-detalhes');
const drawerDataTitulo = document.getElementById('drawer-data-titulo');
const drawerListaAgendamentos = document.getElementById('drawer-lista-agendamentos');

// Elementos do formulário interno da gaveta
const drawerForm = document.getElementById('drawer-booking-form');
const drawerNameInput = document.getElementById('drawer-name');
const drawerLocationSelect = document.getElementById('drawer-location');
const drawerTimeSelect = document.getElementById('drawer-time');

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

  const ultimoDiaMes = new Date(year, month + 1, 0);
  
  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  // Monta os dias úteis do mês divididos por semanas (Segunda a Sexta)
  let semanas = [];
  let semanaAtual = [];

  for (let d = 1; d <= ultimoDiaMes.getDate(); d++) {
    const tempDate = new Date(year, month, d);
    const dayOfWeek = tempDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    semanaAtual.push(tempDate);

    if (dayOfWeek === 5 || d === ultimoDiaMes.getDate()) {
      semanas.push(semanaAtual);
      semanaAtual = [];
    }
  }

  const salaFiltro = filtroSalaSelect ? filtroSalaSelect.value : 'todas';

  semanas.forEach((semana, index) => {
    const semanaBloco = document.createElement('div');
    semanaBloco.className = 'semana-bloco recolhida';

    const inicioSemana = semana[0];
    const fimSemana = semana[semana.length - 1];
    
    const contemHoje = semana.some(d => {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === hojeStr;
    });

    if (contemHoje || (index === 0 && !semanas.some(s => s.some(d => {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === hojeStr;
    })))) {
      semanaBloco.classList.remove('recolhida');
      semanaBloco.classList.add('ativa');
    }

    const semanaHeader = document.createElement('div');
    semanaHeader.className = 'semana-header';
    semanaHeader.innerHTML = `
      <span>Semana ${index + 1} (${inicioSemana.getDate()}/${inicioSemana.getMonth()+1} - ${fimSemana.getDate()}/${fimSemana.getMonth()+1})</span>
      <span class="seta-toggle">▼</span>
    `;
    semanaHeader.addEventListener('click', () => {
      semanaBloco.classList.toggle('recolhida');
    });

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

      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'dots-container';

      const agendamentosDoDia = bookings[dateStr] || [];
      const agendamentosFiltrados = agendamentosDoDia.filter(b => salaFiltro === 'todas' || b.local === salaFiltro);

      agendamentosFiltrados.slice(0, 3).forEach(b => {
        const dot = document.createElement('span');
        const classeSala = b.local ? b.local.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'Padrao';
        dot.className = `dot ${classeSala}`;
        dotsContainer.appendChild(dot);
      });

      diaCard.appendChild(dotsContainer);

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

function filtrarEAtualizarAgenda() {
  renderCalendar(currentDate);
}

// Abrir e Gerenciar a Gaveta (Drawer)
function abrirDrawer(dateStr, dataObj) {
  diaSelecionadoDrawer = dateStr;
  
  const diaFmt = String(dataObj.getDate()).padStart(2, '0');
  const mesFmt = String(dataObj.getMonth() + 1).padStart(2, '0');
  drawerDataTitulo.innerText = `Agendamentos - ${diaFmt}/${mesFmt}/${dataObj.getFullYear()}`;

  // Reseta o formulário interno da gaveta
  if (drawerForm) drawerForm.reset();

  // PREENCHIMENTO AUTOMÁTICO BASEADO NO FILTRO DO TOPO
  const salaFiltroAtual = filtroSalaSelect ? filtroSalaSelect.value : 'todas';
  
  if (drawerLocationSelect) {
    if (salaFiltroAtual !== 'todas') {
      drawerLocationSelect.value = salaFiltroAtual; // Seleciona a sala do filtro
      updateHorariosDisponiveisDrawer();            // Já carrega os horários vagos dela
    } else {
      drawerLocationSelect.value = '';             // Deixa em branco para o usuário escolher
      if (drawerTimeSelect) {
        drawerTimeSelect.innerHTML = `<option value="">Selecione o local primeiro</option>`;
      }
    }
  }

  renderizarListaDrawer(dateStr);
  drawerDetalhes.classList.remove('hidden');
}

function renderizarListaDrawer(dateStr) {
  drawerListaAgendamentos.innerHTML = '';
  const salaFiltro = filtroSalaSelect ? filtroSalaSelect.value : 'todas';
  
  let agendamentos = (bookings[dateStr] || []).filter(b => salaFiltro === 'todas' || b.local === salaFiltro);

  // ORDENAÇÃO POR HORÁRIO
  agendamentos.sort((a, b) => {
    const horaA = a.horario ? a.horario.split('/')[0] : '';
    const horaB = b.horario ? b.horario.split('/')[0] : '';
    return horaA.localeCompare(horaB);
  });

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

// Atualização de Horários Disponíveis no Formulário da Gaveta
function updateHorariosDisponiveisDrawer() {
  if (!drawerLocationSelect || !drawerTimeSelect || !diaSelecionadoDrawer) return;

  const selectedLocation = drawerLocationSelect.value;
  if (!selectedLocation) {
    drawerTimeSelect.innerHTML = `<option value="">Selecione o local primeiro</option>`;
    return;
  }

  const ocupados = (bookings[diaSelecionadoDrawer] || [])
    .filter(b => b.local === selectedLocation)
    .map(b => b.horario);

  drawerTimeSelect.innerHTML = `<option value="">Selecione o horário</option>`;
  horariosFixos.forEach(horario => {
    const option = document.createElement('option');
    option.value = horario;
    option.innerText = horario;
    if (ocupados.includes(horario)) {
      option.disabled = true;
      option.innerText += " (indisponível)";
    }
    drawerTimeSelect.appendChild(option);
  });
}

if (drawerLocationSelect) {
  drawerLocationSelect.addEventListener('change', updateHorariosDisponiveisDrawer);
}

// Submissão do Formulário Direto na Gaveta
if (drawerForm) {
  drawerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = drawerNameInput.value.trim();
    const horario = drawerTimeSelect.value;
    const local = drawerLocationSelect.value;
    const data = diaSelecionadoDrawer;

    if (!nome || !horario || !local || !data) {
      alert("Preencha todos os campos para realizar o agendamento.");
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

      drawerForm.reset();
      await loadAndRender();
      renderizarListaDrawer(data); // Recarrega a lista do dia imediatamente
    } catch (err) {
      alert(err.message);
    }
  });
}

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

function getCorPorLocal(local) {
  switch (local) {
    case 'Informática': return '#00ff22';
    case 'Auditório': return '#ea3333';
    case 'Química': return '#0077ff';
    case 'Matemática': return '#e5ff00';
    default: return '#6b7280';
  }
}

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

setInterval(() => {
  loadAndRender();
}, 300000);

document.addEventListener('DOMContentLoaded', () => {
  verificarExibicaoBotaoIOS();
  loadAndRender();
});