// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// === CONFIG FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyAFqvulIgDvpk7ukasWMeEpq_BFUCt94Lo",
  authDomain: "moneycontrol-e0c85.firebaseapp.com",
  projectId: "moneycontrol-e0c85",
  storageBucket: "moneycontrol-e0c85.firebasestorage.app",
  messagingSenderId: "1059412393084",
  appId: "1:1059412393084:web:1d0b058345372277709df9",
  measurementId: "G-HJKNFEJV9P"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Mantém usuário logado
setPersistence(auth, browserLocalPersistence);

// === DOM ===
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btn-login");
const btnRegistrar = document.getElementById("btn-registrar");
const feedback = document.getElementById("feedback");
const saldoAtualEl = document.getElementById("saldo-atual");
const gastosAtualEl = document.getElementById("gastos-atual");
const btnAddDespesa = document.getElementById("ad-dispesas");
const btnAddSaldo = document.getElementById("ad-saldo");
const inputValor = document.getElementById("valor");
const inputDescricao = document.getElementById("descricao");
const historicoEl = document.querySelector("#historico ul");
const userNameEl = document.querySelector(".user-name");
const userEmailEl = document.querySelector(".user-email");
const userAvatarEl = document.querySelector(".user-avatar");
let currentUser = null;

// === FUNÇÕES AUXILIARES ===
function formatBR(n) {
  return "R$ " + Number(n).toFixed(2).replace(".", ",");
}

// === FUNÇÕES FIRESTORE ===
async function carregarDados(uid) {
  const userRef = doc(db, "usuarios", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const dados = snap.data();

    saldoAtualEl.textContent = formatBR(dados.saldo);
    gastosAtualEl.textContent = formatBR(dados.gastos);

    historicoEl.innerHTML = "";

    dados.transacoes.forEach((t, index) => {
      const li = document.createElement("li");
      li.setAttribute('data-index', index);
      li.innerHTML = `
        <div>
          <h3 class="medio-text">${t.descricao}</h3>
          <p>${new Date(t.data).toLocaleDateString()}</p>
        </div>
        <span class="medio-text ${t.tipo === "despesa" ? "red" : "green"}">${formatBR(t.valor)}</span>
        <div class="delete-icon" style="display:none; cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </div>
      `;
      historicoEl.appendChild(li);

      if (index < dados.transacoes.length - 1) {
        const separator = document.createElement("div");
        separator.className = "linha";
        historicoEl.appendChild(separator);
      }
    });

    setupTransactionItems();
  } else {
    await setDoc(userRef, { saldo: 0, gastos: 0, transacoes: [], nome: "Usuário" });
    carregarDados(uid);
  }
}

// === FUNÇÕES DE PERFIL ===
async function carregarNomeUsuario(uid) {
  const userRef = doc(db, "usuarios", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const dados = snap.data();
    let nome = dados.nome || "Usuário";

    if (userNameEl) userNameEl.textContent = nome;
    if (userEmailEl && currentUser) userEmailEl.textContent = currentUser.email;

    if (userAvatarEl) {
      const iniciais = nome.split(' ').map(n => n.charAt(0)).join('').substring(0,2).toUpperCase();
      userAvatarEl.textContent = iniciais;
    }
  }
}

async function atualizarNomeUsuario(uid, novoNome) {
  const userRef = doc(db, "usuarios", uid);
  await updateDoc(userRef, { nome: novoNome });
  await carregarNomeUsuario(uid);
}

// === FUNÇÃO APAGAR TRANSAÇÃO ===
async function apagarTransacao(uid, transacaoIndex) {
  try {
    const userRef = doc(db, "usuarios", uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const dados = snap.data();
      const transacoes = [...dados.transacoes];

      if (transacaoIndex >= 0 && transacaoIndex < transacoes.length) {
        const transacaoRemovida = transacoes[transacaoIndex];

        let novoSaldo = dados.saldo;
        let novosGastos = dados.gastos;

        if (transacaoRemovida.tipo === "despesa") {
          novosGastos -= Number(transacaoRemovida.valor);
        } else if (transacaoRemovida.tipo === "entrada") {
          novoSaldo -= Number(transacaoRemovida.valor);
        }

        transacoes.splice(transacaoIndex, 1);

        await updateDoc(userRef, {
          transacoes: transacoes,
          saldo: novoSaldo,
          gastos: novosGastos
        });

        await carregarDados(uid);
        return true;
      } else {
        console.error("Índice de transação inválido");
        return false;
      }
    } else {
      console.error("Documento do usuário não encontrado");
      return false;
    }
  } catch (error) {
    console.error("Erro ao apagar transação:", error);
    return false;
  }
}

// === EVENTOS DE LOGIN / REGISTRO ===
if(btnRegistrar){
  btnRegistrar.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const senha = passwordInput.value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      currentUser = cred.user;
      await setDoc(doc(db, "usuarios", currentUser.uid), {
        saldo: 0,
        gastos: 0,
        transacoes: [],
        nome: currentUser.displayName || "Usuário"
      });
      feedback.textContent = "Conta criada com sucesso!";
      feedback.style.color = "green";
      window.location.href = "index.html";
    } catch(err){
      feedback.textContent = "Erro ao criar conta: " + err.message;
      feedback.style.color = "red";
      console.error(err);
    }
  });
}

if(btnLogin){
  btnLogin.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const senha = passwordInput.value;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      currentUser = cred.user;
      feedback.textContent = "Login realizado!";
      feedback.style.color = "green";
      window.location.href = "index.html";
    } catch(err){
      feedback.textContent = "Erro ao logar: " + err.message;
      feedback.style.color = "red";
      console.error(err);
    }
  });
}

// === ADICIONAR SALDO / DESPESA ===
if(btnAddDespesa){
  btnAddDespesa.addEventListener("click", async () => {
    if(!currentUser) return;
    const valor = parseFloat(inputValor.value);
    const descricao = inputDescricao.value;
    if(!valor || !descricao) return;
    const userRef = doc(db, "usuarios", currentUser.uid);
    const snap = await getDoc(userRef);
    const dados = snap.data();

    const novaTransacao = { descricao, valor, tipo: "despesa", data: Date.now() };
    await updateDoc(userRef, {
      saldo: dados.saldo - valor,
      gastos: dados.gastos + valor,
      transacoes: arrayUnion(novaTransacao)
    });
    carregarDados(currentUser.uid);
  });
}

if(btnAddSaldo){
  btnAddSaldo.addEventListener("click", async () => {
    if(!currentUser) return;
    const valor = parseFloat(inputValor.value);
    const descricao = inputDescricao.value || "Depósito";
    if(!valor) return;
    const userRef = doc(db, "usuarios", currentUser.uid);
    const snap = await getDoc(userRef);
    const dados = snap.data();

    const novaTransacao = { descricao, valor, tipo: "entrada", data: Date.now() };
    await updateDoc(userRef, {
      saldo: dados.saldo + valor,
      transacoes: arrayUnion(novaTransacao)
    });
    carregarDados(currentUser.uid);
  });
}

// === DETECTA USUÁRIO LOGADO ===
// Função que carrega tudo do Firestore e atualiza a interface
async function carregarInterfaceCompleta(user) {
  if (!user) return;

  currentUser = user;
  const userRef = doc(db, "usuarios", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // Se não existir, cria o usuário com defaults
    await setDoc(userRef, {
      saldo: 0,
      gastos: 0,
      transacoes: [],
      nome: "Usuário"
    });
    return carregarInterfaceCompleta(user); // Recarrega agora que existe
  }

  const dados = snap.data();

  // === Atualiza saldo e gastos ===
  if (saldoAtualEl) saldoAtualEl.textContent = formatBR(dados.saldo || 0);
  if (gastosAtualEl) gastosAtualEl.textContent = formatBR(dados.gastos || 0);

  // === Atualiza histórico ===
  if (historicoEl) {
    historicoEl.innerHTML = "";
    (dados.transacoes || []).forEach((t, index) => {
      const li = document.createElement("li");
      li.setAttribute('data-index', index);
      li.innerHTML = `
        <div>
          <h3 class="medio-text">${t.descricao}</h3>
          <p>${new Date(t.data).toLocaleDateString()}</p>
        </div>
        <span class="medio-text ${t.tipo === "despesa" ? "red" : "green"}">${formatBR(t.valor)}</span>
        <div class="delete-icon" style="display:none; cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </div>
      `;
      historicoEl.appendChild(li);

      if (index < (dados.transacoes || []).length - 1) {
        const separator = document.createElement("div");
        separator.className = "linha";
        historicoEl.appendChild(separator);
      }
    });
  }

  // === Atualiza perfil (nome, email, avatar) ===
  const nome = dados.nome || "Usuário";
  if (userNameEl) userNameEl.textContent = nome;
  if (userEmailEl) userEmailEl.textContent = user.email;
  if (userAvatarEl) {
    const iniciais = nome.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
    userAvatarEl.textContent = iniciais;
  }

  // Reconfigura o menu de contexto/deletar
  if (historicoEl) setupTransactionItems();
}

// === DETECTA USUÁRIO LOGADO ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await carregarInterfaceCompleta(user);
  } else {
    if (!window.location.href.includes('login.html') && !window.location.href.includes('registrar.html')) {
      window.location.href = 'login.html';
    }
  }
});

// === LOGOUT ===
window.sair = async () => {
  if(currentUser){
    await signOut(auth);
    currentUser = null;
    window.location.href = "login.html";
  }
};

// === RESET DE SENHA ===
const btnReset = document.getElementById("btn-reset");
const modal = document.getElementById("modal-reset");
const closeModal = document.getElementById("close-modal");
const modalMsg = document.getElementById("modal-msg");

if(btnReset){
  btnReset.addEventListener("click", async () => {
    const email = emailInput.value;
    if(!email){
      feedback.textContent = "Digite seu email para redefinir a senha";
      feedback.style.color = "red";
      return;
    }
    try{
      await sendPasswordResetEmail(auth, email);
      modalMsg.textContent = "Email de reset enviado! Verifique sua caixa de entrada (incluindo spam).";
      modal.style.display = "block";
    } catch(err){
      modalMsg.textContent = "Erro ao enviar email: " + err.message;
      modal.style.display = "block";
      console.error(err);
    }
  });
}

if(closeModal){
  closeModal.addEventListener("click", () => { modal.style.display = "none"; });
}
window.addEventListener("click", (e) => { if(e.target === modal){ modal.style.display = "none"; } });

// === TROCAR NOME ===
const formTrocarNome = document.getElementById('form-trocar-nome');
if (formTrocarNome) {
  formTrocarNome.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputNovoNome = document.getElementById('novo-nome');
    const novoNome = inputNovoNome.value.trim();
    if (!novoNome) return alert('Digite um nome válido');

    if (currentUser) {
      await atualizarNomeUsuario(currentUser.uid, novoNome);

      // Atualiza a interface imediatamente
      const userNameEl = document.querySelector(".user-name");
      const userAvatarEl = document.querySelector(".user-avatar");

      if (userNameEl) userNameEl.textContent = novoNome;
      if (userAvatarEl) {
        const iniciais = novoNome.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
        userAvatarEl.textContent = iniciais;
      }
    }

    document.getElementById('modal-trocar-nome').classList.remove('active');
    document.body.style.overflow = '';
  });
}


// === MENU SAIR ===
const menuSair = document.getElementById("menu-sair");
if(menuSair){
  menuSair.addEventListener("click", async (e)=>{
    e.preventDefault();
    if(currentUser){
      await signOut(auth);
      currentUser = null;
      window.location.href = "login.html";
    }
  });
}

// === FUNÇÕES MENU DE CONTEXTO / APAGAR TRANSAÇÕES ===
document.addEventListener('DOMContentLoaded', function() {
  let selectedTransactionIndex = -1;
  let contextMenu = null;

  function createContextMenu(x, y) {
    if (contextMenu) document.body.removeChild(contextMenu);

    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item delete';
    deleteItem.textContent = "Excluir transação";

    deleteItem.addEventListener('click', async () => {
      if (selectedTransactionIndex !== -1 && currentUser) {
        const sucesso = await apagarTransacao(currentUser.uid, selectedTransactionIndex);
        if (!sucesso) alert('Erro ao excluir transação.');
      }
      if (contextMenu) document.body.removeChild(contextMenu);
      contextMenu = null;
      clearSelection();
    });

    contextMenu.appendChild(deleteItem);
    document.body.appendChild(contextMenu);
    document.addEventListener('click', closeContextMenu);
  }

  function closeContextMenu(e) {
    if (contextMenu && !contextMenu.contains(e.target)) {
      document.body.removeChild(contextMenu);
      contextMenu = null;
      document.removeEventListener('click', closeContextMenu);
      if (!e.target.closest('#historico li')) clearSelection();
    }
  }

  function clearSelection() {
    const items = document.querySelectorAll('#historico li');
    items.forEach(item => {
      item.classList.remove('selected-for-delete');
      const valueSpan = item.querySelector('span');
      const deleteIcon = item.querySelector('.delete-icon');
      if (valueSpan && deleteIcon) {
        valueSpan.style.display = '';
        deleteIcon.style.display = 'none';
      }
    });
    selectedTransactionIndex = -1;
  }

  function setupTransactionItems() {
    const items = document.querySelectorAll('#historico li');

    items.forEach((item, index) => {
      const valueSpan = item.querySelector('span');
      const deleteIcon = item.querySelector('.delete-icon');

      if (valueSpan && deleteIcon) {
        deleteIcon.addEventListener('click', async () => {
          if (currentUser) await apagarTransacao(currentUser.uid, index);
          clearSelection();
        });
      }

      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        clearSelection();
        item.classList.add('selected-for-delete');
        selectedTransactionIndex = index;

        if (valueSpan && deleteIcon) {
          valueSpan.style.display = 'none';
          deleteIcon.style.display = 'flex';
        }

        createContextMenu(e.pageX, e.pageY);
      });
    });
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && (mutation.target.id === 'historico' || mutation.target.closest('#historico'))) {
        setupTransactionItems();
      }
    });
  });

  if (historicoEl) observer.observe(historicoEl, { childList: true, subtree: true });
});


// === FUNÇÃO ANIMAÇÃO DE SALDO ===
function animarSaldo(element, valorFinal) {
  let valorAtual = 0;
  const incremento = valorFinal / 50; // 50 passos pra animar
  const intervalo = setInterval(() => {
    valorAtual += incremento;
    if (valorAtual >= valorFinal) {
      valorAtual = valorFinal;
      clearInterval(intervalo);
    }
    element.textContent = "R$ " + valorAtual.toFixed(2).replace(".", ",");
  }, 15); // 15ms entre cada passo
}

// === FUNÇÃO CARREGAR DADOS DO FIRESTORE ===
async function carregarDados(uid) {
  const userRef = doc(db, "usuarios", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const dados = snap.data();

    // Animação do saldo e gastos
    animarSaldo(saldoAtualEl, dados.saldo);
    animarSaldo(gastosAtualEl, dados.gastos);

    historicoEl.innerHTML = "";

    dados.transacoes.forEach((t, index) => {
      const li = document.createElement("li");
      li.setAttribute('data-index', index);
      li.innerHTML = `
        <div>
          <h3 class="medio-text">${t.descricao}</h3>
          <p>${new Date(t.data).toLocaleDateString()}</p>
        </div>
        <span class="medio-text ${t.tipo === "despesa" ? "red" : "green"}">${formatBR(t.valor)}</span>
        <div class="delete-icon" style="display:none; cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </div>
      `;
      historicoEl.appendChild(li);

      if (index < dados.transacoes.length - 1) {
        const separator = document.createElement("div");
        separator.className = "linha";
        historicoEl.appendChild(separator);
      }
    });

    setupTransactionItems();
  } else {
    await setDoc(userRef, { saldo: 0, gastos: 0, transacoes: [], nome: "Usuário" });
    carregarDados(uid);
  }
}

// === DETECTA USUÁRIO LOGADO ===
onAuthStateChanged(auth, async (user) => {
  if(user){
    currentUser = user;
    await carregarDados(user.uid);
    await carregarNomeUsuario(user.uid);
  } else {
    if (!window.location.href.includes('login.html') && !window.location.href.includes('registrar.html')) {
      window.location.href = 'login.html';
    }
  }
});
