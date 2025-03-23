function getMessage(messageName, substitutions = []) {
  return chrome.i18n.getMessage(messageName, substitutions);
}

function applyLocalization() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(element => {
    const messageName = element.getAttribute('data-i18n');
    if (messageName) {
      if (element.tagName === 'INPUT' && element.type === 'placeholder') {
        element.placeholder = getMessage(messageName);
      } else {
        element.textContent = getMessage(messageName);
      }
    }
  });

  const titleElements = document.querySelectorAll('[data-i18n-title]');
  titleElements.forEach(element => {
    const messageName = element.getAttribute('data-i18n-title');
    if (messageName) {
      element.title = getMessage(messageName);
    }
  });

  const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach(element => {
    const messageName = element.getAttribute('data-i18n-placeholder');
    if (messageName) {
      element.placeholder = getMessage(messageName);
    }
  });
}

async function getCurrentTheme() {
  const result = await chrome.storage.sync.get({
    theme: 'system',
  });

  if (result.theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return result.theme;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${theme}`);
}

async function initTheme() {
  const theme = await getCurrentTheme();
  applyTheme(theme);

  const result = await chrome.storage.sync.get({ theme: 'system' });
  if (result.theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
      const newTheme = await getCurrentTheme();
      applyTheme(newTheme);
    });
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function formatDownloadMode(mode) {
  switch(mode) {
    case 'auto': return getMessage('btnAuto');
    case 'audio': return getMessage('btnAudio');
    case 'video': return getMessage('btnVideo');
    default: return mode;
  }
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function debounce(func, delay) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

window.cobaltUtils = {
  getMessage,
  applyLocalization,
  getCurrentTheme,
  applyTheme,
  initTheme,
  formatDate,
  formatDownloadMode,
  isValidUrl,
  generateUniqueId,
  debounce
};
