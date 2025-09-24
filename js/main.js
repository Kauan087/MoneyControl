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
  storageBucket: "moneycontrol-e0c85.app",
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

// === ANIMAÇÃO DE SALDO ===
function animarSaldo(element, valorFinal) {
  if(!element) return;
  let valorAtual = 0;
  const incremento = valorFinal / 50;
  const intervalo = setInterval(() => {
    valorAtual += incremento;
    if (valorAtual >= valorFinal) {
      valorAtual = valorFinal;
      clearInterval(intervalo);
    }
    element.textContent = formatBR(valorAtual);
  }, 15);
}

// === CARREGAR DADOS DO USUÁRIO ===
async function carregarDados(uid) {
  const userRef = doc(db, "usuarios", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, { saldo: 0, gastos: 0, transacoes: [], nome: "Usuário" });
    return carregarDados(uid);
  }

  const dados = snap.data();

  if (saldoAtualEl) animarSaldo(saldoAtualEl, dados.saldo);
  if (gastosAtualEl) animarSaldo(gastosAtualEl, dados.gastos);

  // Histórico
  if (historicoEl) {
    historicoEl.innerHTML = "";
    dados.transacoes.forEach((t, index) => {
      const li = document.createElement("li");
      li.setAttribute("data-index", index);
      li.innerHTML = `
        <div>
          <h3 class="medio-text">${t.descricao}</h3>
          <p>${new Date(t.data).toLocaleDateString()}</p>
        </div>
        <span class="medio-text ${t.tipo === "despesa" ? "red" : "green"}">${formatBR(t.valor)}</span>
      `;
      historicoEl.appendChild(li);
    });
  }
}

// === ATUALIZAR NOME ===
async function atualizarNomeUsuario(uid, novoNome) {
  const userRef = doc(db, "usuarios", uid);
  await updateDoc(userRef, { nome: novoNome });
  carregarDados(uid);
}

// === APAGAR TRANSAÇÃO ===
async function apagarTransacao(uid, index) {
  const userRef = doc(db, "usuarios", uid);
  const snap = await getDoc(userRef);
  if(!snap.exists()) return;

  const dados = snap.data();
  const transacoes = [...dados.transacoes];
  if(index < 0 || index >= transacoes.length) return;

  const t = transacoes[index];

  let novoSaldo = dados.saldo;
  let novosGastos = dados.gastos;

  if(t.tipo === "despesa") novosGastos -= t.valor;
  if(t.tipo === "entrada") novoSaldo -= t.valor;

  transacoes.splice(index, 1);

  await updateDoc(userRef, {
    saldo: novoSaldo,
    gastos: novosGastos,
    transacoes
  });

  carregarDados(uid);
}

// === REGISTRO ===
if(btnRegistrar){
  btnRegistrar.addEventListener("click", async (e)=>{
    e.preventDefault();
    const email = emailInput.value.trim();
    const senha = passwordInput.value.trim();

    if(!email || !senha){
      feedback.textContent = "Digite email e senha válidos!";
      feedback.style.color = "red";
      return;
    }

    try{
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      currentUser = cred.user;

      await setDoc(doc(db, "usuarios", currentUser.uid), {
        saldo: 0,
        gastos: 0,
        transacoes: [],
        nome: "Usuário"
      });

      feedback.textContent = "Conta criada com sucesso!";
      feedback.style.color = "green";

      // Redireciona pro index.html
      window.location.href = "index.html";

    } catch(err){
      feedback.textContent = "Erro ao criar conta: " + err.message;
      feedback.style.color = "red";
      console.error(err);
    }
  });
}

// === LOGIN ===
if(btnLogin){
  btnLogin.addEventListener("click", async (e)=>{
    e.preventDefault();
    const email = emailInput.value.trim();
    const senha = passwordInput.value.trim();

    if(!email || !senha){
      feedback.textContent = "Digite email e senha válidos!";
      feedback.style.color = "red";
      return;
    }

    try{
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

// === ADICIONAR SALDO ===
if(btnAddSaldo){
  btnAddSaldo.addEventListener("click", async ()=>{
    if(!currentUser) return;
    const valor = parseFloat(inputValor.value);
    const desc = inputDescricao.value || "Depósito";
    if(!valor) return;

    const userRef = doc(db, "usuarios", currentUser.uid);
    const snap = await getDoc(userRef);
    const dados = snap.data();

    const novaTransacao = { descricao: desc, valor, tipo: "entrada", data: Date.now() };
    await updateDoc(userRef, {
      saldo: dados.saldo + valor,
      transacoes: arrayUnion(novaTransacao)
    });

    carregarDados(currentUser.uid);
  });
}

// === ADICIONAR DESPESA ===
if(btnAddDespesa){
  btnAddDespesa.addEventListener("click", async ()=>{
    if(!currentUser) return;
    const valor = parseFloat(inputValor.value);
    const desc = inputDescricao.value;
    if(!valor || !desc) return;

    const userRef = doc(db, "usuarios", currentUser.uid);
    const snap = await getDoc(userRef);
    const dados = snap.data();

    const novaTransacao = { descricao: desc, valor, tipo: "despesa", data: Date.now() };
    await updateDoc(userRef, {
      saldo: dados.saldo - valor,
      gastos: dados.gastos + valor,
      transacoes: arrayUnion(novaTransacao)
    });

    carregarDados(currentUser.uid);
  });
}

// === LOGOUT ===
window.sair = async ()=>{
  if(currentUser){
    await signOut(auth);
    currentUser = null;
    window.location.href = "login.html";
  }
};

// === DETECTA USUÁRIO LOGADO ===
onAuthStateChanged(auth, (user)=>{
  if(user){
    currentUser = user;
    carregarDados(user.uid);
  } else {
    if(!window.location.href.includes("login.html")){
      window.location.href = "login.html";
    }
  }
});
