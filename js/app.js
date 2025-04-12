import { app, db } from './firebase/config.js';
import { submitPost, loadPosts, handleScroll } from './modules/posts.js';
import { setupCharCounter, showAlert, getElement } from './modules/utils.js';
import { setupDarkMode } from './modules/dark-mode.js';
import { submitComment } from './modules/comments.js';
import { initVotingSystem, restoreVoteStates } from './modules/votes.js';

window.addEventListener('DOMContentLoaded', async () => {
  try {
    initVotingSystem();
    setupDarkMode();
    setupCharCounter(
      getElement('#message'),
      getElement('#char-count'),
      1000
    );

    getElement('#submit-button').addEventListener('click', handleSubmit);
    window.addEventListener('scroll', handleScroll);
    setupSidebarToggles();
    setupSwipeGestures();

    await loadPosts(false, 'all');
    restoreVoteStates();

  } catch (err) {
    console.error("Error en inicialización:", err);
    showAlert(`Error al iniciar la aplicación: ${err.message}`, 'error');
  }
});

async function handleSubmit() {
  const submitBtn = getElement('#submit-button');
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publicando...';

    const messageInput = getElement('#message');
    const age = getElement('#age').value.trim();
    const gender = getElement('#gender').value;
    const tags = getElement('#tags').value
      .split(',')
      .map(t => t.trim())
      .filter(t => t);

    await submitPost(messageInput, age, gender, tags);
    showAlert('Publicación creada exitosamente!', 'success');
    messageInput.value = '';
    getElement('#tags').value = '';
  } catch (err) {
    console.error("Error al publicar:", err);
    showAlert(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publicar';
  }
}

function setupSidebarToggles() {
  const leftToggle = document.createElement('button');
  leftToggle.className = 'sidebar-toggle left-sidebar-toggle';
  leftToggle.innerHTML = '🔍';
  leftToggle.title = 'Mostrar filtros';
  document.body.appendChild(leftToggle);

  const rightToggle = document.createElement('button');
  rightToggle.className = 'sidebar-toggle right-sidebar-toggle';
  rightToggle.innerHTML = '⚙️';
  rightToggle.title = 'Mostrar opciones';
  document.body.appendChild(rightToggle);

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  leftToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelector('.left-sidebar').classList.toggle('active');
    overlay.classList.toggle('active');
  });

  rightToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelector('.right-sidebar').classList.toggle('active');
    overlay.classList.toggle('active');
  });

  overlay.addEventListener('click', () => {
    document.querySelector('.left-sidebar').classList.remove('active');
    document.querySelector('.right-sidebar').classList.remove('active');
    overlay.classList.remove('active');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar') && !e.target.closest('.sidebar-toggle')) {
      document.querySelector('.left-sidebar').classList.remove('active');
      document.querySelector('.right-sidebar').classList.remove('active');
      overlay.classList.remove('active');
    }
  });
}

window.submitComment = submitComment;
function setupSwipeGestures() {
  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
  });

  function handleSwipeGesture() {
    const deltaX = touchEndX - touchStartX;
    const threshold = 80; // px mínimo para considerar como swipe

    const leftSidebar = document.querySelector('.left-sidebar');
    const rightSidebar = document.querySelector('.right-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (deltaX > threshold) {
      // Deslizó hacia la derecha → abrir filtros
      leftSidebar.classList.add('active');
      overlay.classList.add('active');
    } else if (deltaX < -threshold) {
      // Deslizó hacia la izquierda → abrir opciones
      rightSidebar.classList.add('active');
      overlay.classList.add('active');
    }
  }
}