// dark-mode.js
export function setupDarkMode() {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Verificar preferencias del sistema y localStorage
  const savedMode = localStorage.getItem('darkMode');
  
  if (savedMode === 'enabled' || (savedMode !== 'disabled' && prefersDarkScheme.matches)) {
    document.body.classList.add('dark-mode');
  }
  
  // Configurar el event listener
  darkModeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    
    if (isDark) {
      localStorage.setItem('darkMode', 'enabled');
    } else {
      localStorage.setItem('darkMode', 'disabled');
    }
  });
  
  // Escuchar cambios en las preferencias del sistema
  prefersDarkScheme.addEventListener('change', (e) => {
    if (localStorage.getItem('darkMode') === null) {
      if (e.matches) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }
  });
}