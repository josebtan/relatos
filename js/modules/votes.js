import { 
  db,
  updateDoc,
  doc,
  increment
} from '../firebase/config.js';

// Variables de estado
let isUpdating = false;
const voteQueue = [];

/**
 * Maneja el voto (like/dislike) de una publicación
 * @param {string} type - Tipo de voto ('like' o 'dislike')
 * @param {string} postId - ID de la publicación
 */
export async function handleVote(type, postId) {
  if (isUpdating) {
    voteQueue.push({ type, postId });
    return;
  }

  isUpdating = true;
  
  try {
    const userVotes = getUserVotes();
    const previousVote = userVotes[postId];
    const updates = calculateVoteUpdates(type, postId, previousVote);

    await updateVoteInDatabase(postId, updates);
    updateLocalVotes(postId, type, previousVote);
    updateButtonStates(postId, type, previousVote);

  } catch (error) {
    console.error("Error al votar:", error);
    throw error;
  } finally {
    isUpdating = false;
    processVoteQueue();
  }
}

/**
 * Obtiene los votos del usuario desde localStorage
 * @returns {Object} - Objeto con los votos del usuario
 */
function getUserVotes() {
  const votes = localStorage.getItem("userVotes");
  return votes ? JSON.parse(votes) : {};
}

/**
 * Calcula las actualizaciones necesarias para el voto
 * @param {string} type - Tipo de voto
 * @param {string} postId - ID de la publicación
 * @param {string|null} previousVote - Voto previo del usuario
 * @returns {Object} - Objeto con las actualizaciones para Firestore
 */
function calculateVoteUpdates(type, postId, previousVote) {
  const updates = {};
  
  if (previousVote === type) {
    // Si ya había votado igual, quitamos el voto
    updates[`${type}s`] = increment(-1);
  } else {
    // Si había votado lo contrario, lo cambiamos
    if (previousVote) {
      updates[`${previousVote}s`] = increment(-1);
    }
    updates[`${type}s`] = increment(1);
  }
  
  return updates;
}

/**
 * Actualiza el voto en la base de datos
 * @param {string} postId - ID de la publicación
 * @param {Object} updates - Actualizaciones a aplicar
 */
async function updateVoteInDatabase(postId, updates) {
  const postRef = doc(db, "mensajes", postId);
  await updateDoc(postRef, updates);
}

/**
 * Actualiza los votos locales en localStorage
 * @param {string} postId - ID de la publicación
 * @param {string} type - Tipo de voto
 * @param {string|null} previousVote - Voto previo del usuario
 */
function updateLocalVotes(postId, type, previousVote) {
  const userVotes = getUserVotes();
  
  if (previousVote === type) {
    delete userVotes[postId]; // Eliminar voto si es el mismo
  } else {
    userVotes[postId] = type; // Actualizar voto
  }
  
  localStorage.setItem("userVotes", JSON.stringify(userVotes));
}

/**
 * Actualiza el estado visual de los botones de votación
 * @param {string} postId - ID de la publicación
 * @param {string} currentType - Tipo de voto actual
 * @param {string|null} previousVote - Voto previo del usuario
 */
export function updateButtonStates(postId, currentType, previousVote) {
  const likeBtn = document.getElementById(`like-${postId}`);
  const dislikeBtn = document.getElementById(`dislike-${postId}`);

  if (likeBtn && dislikeBtn) {
    // Resetear ambos botones primero
    likeBtn.classList.remove("active-like");
    dislikeBtn.classList.remove("active-dislike");

    // Aplicar estado activo solo al botón correspondiente
    if (currentType === 'like' && previousVote !== currentType) {
      likeBtn.classList.add("active-like");
    } else if (currentType === 'dislike' && previousVote !== currentType) {
      dislikeBtn.classList.add("active-dislike");
    }
  }
}

/**
 * Configura los event listeners para los botones de votación
 * @param {string} postId - ID de la publicación
 */
export function setupVotingButtons(postId) {
  const userVotes = getUserVotes();
  const currentVote = userVotes[postId];
  
  const likeButton = document.getElementById(`like-${postId}`);
  const dislikeButton = document.getElementById(`dislike-${postId}`);

  // Aplicar estado inicial
  updateButtonStates(postId, currentVote, null);

  // Configurar event listeners
  likeButton?.addEventListener("click", () => handleVote("like", postId));
  dislikeButton?.addEventListener("click", () => handleVote("dislike", postId));
}

/**
 * Procesa la cola de votos pendientes
 */
function processVoteQueue() {
  if (voteQueue.length > 0 && !isUpdating) {
    const nextVote = voteQueue.shift();
    handleVote(nextVote.type, nextVote.postId);
  }
}