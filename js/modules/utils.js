/**
 * Módulo de utilidades para la aplicación
 * @module Utils
 */

/**
 * Formatea la fecha como tiempo relativo (hasta 24 horas) o fecha absoluta
 * @param {Date|firebase.firestore.Timestamp} date - Fecha a formatear
 * @returns {string} Texto formateado ("Hace X horas" o "DD/MM/AAAA")
 */
export function formatSmartDate(date) {
  if (!(date instanceof Date)) {
    date = date?.toDate?.() || new Date();
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  // Menos de 24 horas (86400 segundos)
  if (diffInSeconds < 86400) {
    return formatRelativeTime(diffInSeconds);
  } else {
    return formatAbsoluteDate(date);
  }
}

/**
 * Formatea el tiempo en formato relativo (ej. "Hace 2 horas")
 * @param {number} diffInSeconds - Diferencia en segundos
 * @returns {string}
 */
function formatRelativeTime(diffInSeconds) {
  const intervals = {
    hora: 3600,
    minuto: 60,
    segundo: 1
  };

  for (const [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      return `Hace ${interval} ${unit}${interval !== 1 ? 's' : ''}`;
    }
  }
  
  return "Ahora mismo";
}

/**
 * Formatea la fecha en formato absoluto (ej. "25/06/2023")
 * @param {Date} date - Fecha a formatear
 * @returns {string}
 */
function formatAbsoluteDate(date) {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatea fecha completa con hora (para tooltips/detalles)
 * @param {Date} date - Fecha a formatear
 * @returns {string}
 */
export function formatFullDateTime(date) {
  if (!(date instanceof Date)) {
    date = date?.toDate?.() || new Date();
  }

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto seguro para HTML
 */
export function escapeHtml(text) {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Muestra un mensaje de alerta estilizado
 * @param {string} message - Mensaje a mostrar
 * @param {'success'|'error'|'info'} [type='info'] - Tipo de alerta
 * @param {number} [timeout=5000] - Tiempo en ms hasta ocultar (0 para permanente)
 */
export function showAlert(message, type = 'info', timeout = 5000) {
  // Eliminar alertas existentes primero
  const existingAlerts = document.querySelectorAll('.alert');
  existingAlerts.forEach(alert => alert.remove());

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = escapeHtml(message);
  
  Object.assign(alert.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '15px',
    borderRadius: '5px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    zIndex: 1000,
    backgroundColor: type === 'error' ? '#ffebee' : 
                    type === 'success' ? '#e8f5e9' : '#e3f2fd',
    color: type === 'error' ? '#c62828' : 
           type === 'success' ? '#2e7d32' : '#1565c0',
    borderLeft: `4px solid ${
      type === 'error' ? '#c62828' : 
      type === 'success' ? '#2e7d32' : '#1565c0'
    }`,
    maxWidth: '90%',
    wordBreak: 'break-word'
  });

  document.body.appendChild(alert);

  if (timeout > 0) {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 500);
    }, timeout);
  }
}

/**
 * Valida si un elemento existe en el DOM
 * @param {string} selector - Selector del elemento
 * @returns {HTMLElement|null} Elemento encontrado o null
 */
export function getElement(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    console.warn(`Elemento no encontrado: ${selector}`);
    return null;
  }
  return element;
}

/**
 * Actualiza el contador de caracteres para un textarea
 * @param {HTMLTextAreaElement} textarea - Elemento textarea
 * @param {HTMLElement} counterElement - Elemento del contador
 * @param {number} [maxLength=1000] - Longitud máxima
 */
export function setupCharCounter(textarea, counterElement, maxLength = 1000) {
  if (!textarea || !counterElement) return;

  const updateCounter = () => {
    const remaining = maxLength - textarea.value.length;
    counterElement.textContent = `${remaining} caracteres restantes`;
    counterElement.style.color = remaining < maxLength * 0.1 ? "#ea4335" : "#666";
    
    if (remaining < 0) {
      textarea.value = textarea.value.substring(0, maxLength);
    }
  };

  textarea.addEventListener('input', updateCounter);
  updateCounter();
}

/**
 * Función debounce para optimizar eventos frecuentes
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounceada
 */
export function debounce(func, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Alternar visibilidad de un elemento
 * @param {HTMLElement} element - Elemento a alternar
 * @param {boolean} [force] - Forzar estado (true/false)
 */
export function toggleElement(element, force) {
  if (!element) return;
  
  const newState = force !== undefined ? force : element.style.display === 'none';
  element.style.display = newState ? '' : 'none';
}

/**
 * Formatea fecha para comentarios (nueva función)
 * @param {Date} date - Fecha a formatear
 * @returns {string}
 */
export function formatDate(date) {
  if (!(date instanceof Date)) {
    date = date?.toDate?.() || new Date();
  }

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Verifica si el modo oscuro está activo
 * @returns {boolean}
 */
export function isDarkMode() {
  return document.body.classList.contains('dark-mode');
}
