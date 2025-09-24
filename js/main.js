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
  sendPasswordResetEmail
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
  }, 15);
}

// === FIRESTORE ===
async function carregarDados(uid) {
  const userRef = doc(db, "usuarios", uid);
  const snap = await getDoc(userRef);
  
  if (!snap.exists()) {
    await setDoc(userRef, { saldo: 0, gastos: 0, transacoes: [], nome: "Usuário" });
    return carregarDados(uid);
  }

  const dados = snap.data();
  
  // Anima saldo e gastos
  if (saldoAtualEl) animarSaldo(saldoAtualEl, dados.saldo);
  if (gastosAtualEl) animarSaldo(gastosAtualEl, dados.gastos);

  // Histórico
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

  setupTransactionItems();
}

// === PERFIL ===
async function carregarNomeUsuario(uid) {
  const userRef = doc(db, "usuarios", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const dados = snap.data();
  const nome = dados.nome || "Usuário";

  if (userNameEl) userNameEl.textContent = nome;
  if (userEmailEl && currentUser) userEmailEl.textContent = currentUser.email;
  if (userAvatarEl) {
    const iniciais = nome.split(' ').map(n => n.charAt(0)).join('').substring(0,2).toUpperCase();
    userAvatarEl.textContent = iniciais;
  }
}

async function atualizarNomeUsuario(uid, novoNome) {
  const userRef = doc(db, "usuarios", uid);
  await updateDoc(userRef, { nome: novoNome });
  await carregarNomeUsuario(uid);
}

// === APAGAR TRANSAÇÃO ===
async function apagarTransacao(uid, transacaoIndex) {
  const userRef = doc(db, "usuarios", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return false;

  const dados = snap.data();
  const transacoes = [...(dados.transacoes || [])];
  if (transacaoIndex < 0 || transacaoIndex >= transacoes.length) return false;

  const t = transacoes[transacaoIndex];
  let novoSaldo = dados.saldo;
  let novosGastos = dados.gastos;

  if (t.tipo === "despesa") novosGastos -= Number(t.valor);
  else if (t.tipo === "entrada") novoSaldo -= Number(t.valor);

  transacoes.splice(transacaoIndex, 1);
  await updateDoc(userRef, { transacoes, saldo: novoSaldo, gastos: novosGastos });
  await carregarDados(uid);
  return true;
}

// === LOGIN / REGISTRO ===
if(btnRegistrar){
  btnRegistrar.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const senha = passwordInput.value.trim();

    if(!email || !senha){
      feedback.textContent = "Digite email e senha válidos!";
      feedback.style.color = "red";
      return;
    }

    try {
      // Cria usuário no Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      currentUser = cred.user;

      // Cria documento do usuário no Firestore
      await setDoc(doc(db, "usuarios", currentUser.uid), {
        saldo: 0,
        gastos: 0,
        transacoes: [],
        nome: "Usuário"
      });

      feedback.textContent = "Conta criada com sucesso! Redirecionando...";
      feedback.style.color = "green";

      // Redireciona pra tela home
      window.location.href = "index.html";

    } catch(err){
      console.error("Erro registro:", err);
      feedback.textContent = "Erro ao criar conta: " + err.message;
      feedback.style.color = "red";
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
    } catch(err){
      feedback.textContent = "Erro ao logar: " + err.message;
      feedback.style.color = "red";
    }
  });
}

// === RESET SENHA ===
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
    try {
      await sendPasswordResetEmail(auth, email);
      modalMsg.textContent = "Email de reset enviado! Verifique sua caixa de entrada.";
      modal.style.display = "block";
    } catch(err){
      modalMsg.textContent = "Erro ao enviar email: " + err.message;
      modal.style.display = "block";
    }
  });
}

if(closeModal){
  closeModal.addEventListener("click", () => { modal.style.display = "none"; });
}
window.addEventListener("click", (e) => { if(e.target === modal){ modal.style.display = "none"; } });

// === TROCAR NOME ===
const formTrocarNome = document.getElementById('form-trocar-nome');
if (formTrocarNome){
  formTrocarNome.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const inputNovoNome = document.getElementById('novo-nome');
    const novoNome = inputNovoNome.value.trim();
    if (!novoNome) return alert('Digite um nome válido');
    if (currentUser) await atualizarNomeUsuario(currentUser.uid, novoNome);
    document.getElementById('modal-trocar-nome').classList.remove('active');
    document.body.style.overflow = '';
  });
}

// === LOGOUT ===
const menuSair = document.getElementById("menu-sair");
if(menuSair){
  menuSair.addEventListener("click", async (e)=>{
    e.preventDefault(); // previne de seguir o href "#"
    try {
      if(currentUser){
        await signOut(auth);
        currentUser = null;
        window.location.href = "login.html"; // redireciona pro login
      }
    } catch(err){
      console.error("Erro ao sair:", err);
    }
  });
}


// === MENU DE CONTEXTO / DELETE TRANSAÇÃO ===
function setupTransactionItems(){
  const items = document.querySelectorAll('#historico li');
  items.forEach((item, index)=>{
    const valueSpan = item.querySelector('span');
    const deleteIcon = item.querySelector('.delete-icon');

    if (valueSpan && deleteIcon){
      deleteIcon.onclick = async () => { if(currentUser) await apagarTransacao(currentUser.uid, index); };
    }

    item.oncontextmenu = (e) => {
      e.preventDefault();
      items.forEach(i => {
        i.classList.remove('selected-for-delete');
        const v = i.querySelector('span');
        const d = i.querySelector('.delete-icon');
        if(v && d){ v.style.display=''; d.style.display='none'; }
      });
      item.classList.add('selected-for-delete');
      if(valueSpan && deleteIcon){
        valueSpan.style.display = 'none';
        deleteIcon.style.display = 'flex';
      }
    };
  });
}

// === DETECTA USUÁRIO LOGADO ===
onAuthStateChanged(auth, async (user)=>{
  if(user){
    currentUser = user;
    await carregarDados(user.uid);
    await carregarNomeUsuario(user.uid);

    // redireciona para home se estiver no login/registro
    if(window.location.href.includes('login.html') || window.location.href.includes('registrar.html')){
      window.location.href = "index.html";
    }

  } else {
    if (!window.location.href.includes('login.html') && !window.location.href.includes('registrar.html')){
      window.location.href = "login.html";
    }
  }
});

// === ADICIONAR SALDO / DESPESA ===
// Esses listeners só funcionam se currentUser existir
if(btnAddSaldo){
  btnAddSaldo.addEventListener("click", async ()=>{
    if(!currentUser) return;
    const valor = parseFloat(inputValor.value);
    const descricao = inputDescricao.value || "Depósito";
    if(!valor) return;
    const userRef = doc(db, "usuarios", currentUser.uid);
    const snap = await getDoc(userRef);
    const dados = snap.data();
    await updateDoc(userRef, {
      saldo: dados.saldo + valor,
      transacoes: arrayUnion({ descricao, valor, tipo:"entrada", data:Date.now() })
    });
    await carregarDados(currentUser.uid);
  });
}

if(btnAddDespesa){
  btnAddDespesa.addEventListener("click", async ()=>{
    if(!currentUser) return;
    const valor = parseFloat(inputValor.value);
    const descricao = inputDescricao.value;
    if(!valor || !descricao) return;
    const userRef = doc(db, "usuarios", currentUser.uid);
    const snap = await getDoc(userRef);
    const dados = snap.data();
    await updateDoc(userRef, {
      saldo: dados.saldo - valor,
      gastos: dados.gastos + valor,
      transacoes: arrayUnion({ descricao, valor, tipo:"despesa", data:Date.now() })
    });
    await carregarDados(currentUser.uid);
  });
}
