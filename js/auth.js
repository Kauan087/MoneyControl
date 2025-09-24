import { auth } from "./auth.js";
import { 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Inputs
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnRegistrar = document.getElementById('btn-registrar');
const feedback = document.getElementById('feedback');

btnRegistrar.addEventListener('click', (e) => {
  e.preventDefault();

  const email = emailInput.value;
  const senha = passwordInput.value;

  if (!email || !senha) {
    feedback.textContent = "Preencha todos os campos.";
    feedback.style.color = "orange";
    return;
  }

  createUserWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      feedback.textContent = `Conta criada: ${userCredential.user.email}`;
      feedback.style.color = "green";
      // redireciona direto pro app
      window.location.href = "index.html";
    })
    .catch((error) => {
      feedback.textContent = `Erro: ${error.message}`;
      feedback.style.color = "red";
    });
});
