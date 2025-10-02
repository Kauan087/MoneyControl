document.addEventListener("DOMContentLoaded", () => {
  const menuReinicio = document.getElementById("menureinicio");
  const configItem = document.querySelector(".config-item");
  const btnBack = menuReinicio.querySelector(".btn-back");
  const selectDia = document.getElementById("dia-reinicio");
  const diasGrid = document.querySelector(".dias-grid");
  const btnSalvar = menuReinicio.querySelector(".btn-salvar");

  // 1. Último botão inicia com 30
  const botoes = diasGrid.querySelectorAll(".dia");
  const ultimo = botoes[botoes.length - 1];
  ultimo.textContent = "30";

  // 2. Abrir card
  configItem.addEventListener("click", () => {
    menuReinicio.style.display = "flex";
  });

  // 3. Fechar card
  btnBack.addEventListener("click", (e) => {
    e.preventDefault();
    menuReinicio.style.display = "none";
  });

  // 4. Função para ativar apenas o botão clicado
  function ativarBotaoClicado(btn) {
    botoes.forEach(b => b.classList.remove("ativo"));
    btn.classList.add("ativo");
  }

  // 5. Clique nos botões de sugestão
  diasGrid.addEventListener("click", (e) => {
    if (e.target.classList.contains("dia")) {
      // ativa o botão clicado
      ativarBotaoClicado(e.target);

      // atualiza select mas sem disparar change
      selectDia.value = e.target.textContent;

      // reseta último botão para 30 se for diferente
      ultimo.textContent = "30";
    }
  });

  // 6. Seleção no dropdown
  selectDia.addEventListener("change", () => {
    const valor = selectDia.value;
    let encontrado = false;

    botoes.forEach(btn => {
      if (btn.textContent === valor) {
        ativarBotaoClicado(btn);
        encontrado = true;
      }
    });

    // Se não existe, substitui o último botão
    if (!encontrado) {
      ultimo.textContent = valor;
      ativarBotaoClicado(ultimo);
    }
  });

  // 7. Salvar
  btnSalvar.addEventListener("click", () => {
    alert("Salvo com sucesso!");
  });
});

function abrirMetas() {
  document.getElementById("menumetas").style.display = "flex";
}

function fecharMetas() {
  document.getElementById("menumetas").style.display = "none";
}

function salvarMeta() {
  const valor = document.getElementById("meta-valor").value;
  if (!valor || valor <= 0) {
    alert("Defina um valor válido para a meta.");
    return;
  }
  alert("Meta de gastos salva: R$ " + valor);
  fecharMetas();
}

// --- JAVASCRIPT PARA O CARD DE METAS (Colocar em js/configurações.js ou similar) ---

// Função para abrir o modal de metas (sugestão de link no HTML)
function abrirMetas() {
  document.getElementById("menumetas").style.display = "flex";
}

// Função para fechar o modal de metas
function fecharMetas() {
  document.getElementById("menumetas").style.display = "none";
}

document.addEventListener('DOMContentLoaded', () => {
  const rangeInput = document.getElementById('limit-range');
  const displayValue = document.getElementById('display-value');
  const manualInput = document.getElementById('manual-input');
  const noLimitCheckbox = document.getElementById('no-limit');
  
  if (!rangeInput || !displayValue || !manualInput) return;

  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();

  // Função para atualizar valor e barra
  function updateRangeDisplay(value) {
    displayValue.textContent = value;
    const percentage = (value / rangeInput.max) * 100;
    rangeInput.style.background = `linear-gradient(to right, ${primaryColor} ${percentage}%, #E0E0E0 ${percentage}%)`;
    manualInput.value = value;
  }

  // Slider
  rangeInput.addEventListener('input', () => {
    updateRangeDisplay(rangeInput.value);
  });

  // Input number
  manualInput.addEventListener('input', () => {
    let val = manualInput.value;
    if (val < 0) val = 0;
    if (val > 10000) val = 10000;
    rangeInput.value = val;
    updateRangeDisplay(val);
  });


  // Checkbox "Não definir limite"
  noLimitCheckbox.addEventListener('change', () => {
    const disabled = noLimitCheckbox.checked;
    rangeInput.disabled = disabled;
    manualInput.disabled = disabled;
    displayValue.textContent = disabled ? 'Sem limite' : rangeInput.value;
    rangeInput.style.opacity = disabled ? '0.5' : '1';
    manualInput.style.opacity = disabled ? '0.5' : '1';
  });

  // Inicializa
  updateRangeDisplay(rangeInput.value);
});

// Salvar meta
function salvarMeta() {
  const semLimite = document.getElementById('no-limit').checked;
  const limite = document.getElementById('display-value').textContent;

  if (semLimite) {
    alert('Meta de gastos removida!');
  } else {
    alert(`Meta de gastos salva: R$ ${limite}`);
  }
  fecharMetas();
}

// Funções de abrir/fechar modal
function abrirMetas() {
  document.getElementById("menumetas").style.display = "flex";
}

function fecharMetas() {
  document.getElementById("menumetas").style.display = "none";
}
