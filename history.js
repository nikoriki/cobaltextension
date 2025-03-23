function $(id) {
  return document.getElementById(id);
}

let historyData = [];
let filteredHistory = [];
let currentPage = 1;
const itemsPerPage = 10;

const historyList = $('history-list');
const pagination = $('pagination');
const searchInput = $('search-input');
const typeFilter = $('type-filter');
const statusFilter = $('status-filter');
const sortBy = $('sort-by');
const clearAllBtn = $('clear-all-btn');
const confirmModal = $('confirm-modal');
const confirmMessage = $('confirm-message');
const cancelBtn = $('cancel-btn');
const confirmBtn = $('confirm-btn');

function initHistoryPage() {
  loadHistoryData();
  setupEventListeners();
}

function loadHistoryData() {
  chrome.storage.local.get({ downloadHistory: [] }, function(data) {
    historyData = data.downloadHistory;
    applyFilters();
  });
}

function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const type = typeFilter.value;
  const status = statusFilter.value;
  const sort = sortBy.value;

  filteredHistory = historyData.filter(item => {
    const matchesSearch = !searchTerm ||
                         (item.title && item.title.toLowerCase().includes(searchTerm)) ||
                         (item.url && item.url.toLowerCase().includes(searchTerm));
    const matchesType = type === 'all' || item.downloadMode === type;
    const matchesStatus = status === 'all' ||
                         (status === 'success' && item.success) ||
                         (status === 'failure' && !item.success);

    return matchesSearch && matchesType && matchesStatus;
  });

  sortFilteredHistory(sort);
  currentPage = 1;
  renderHistoryList();
  renderPagination();
}

function sortFilteredHistory(sortOption) {
  switch(sortOption) {
    case 'date-desc':
      filteredHistory.sort((a, b) => b.timestamp - a.timestamp);
      break;
    case 'date-asc':
      filteredHistory.sort((a, b) => a.timestamp - b.timestamp);
      break;
    case 'title-asc':
      filteredHistory.sort((a, b) => {
        if (!a.title) return 1;
        if (!b.title) return -1;
        return a.title.localeCompare(b.title);
      });
      break;
    case 'title-desc':
      filteredHistory.sort((a, b) => {
        if (!a.title) return 1;
        if (!b.title) return -1;
        return b.title.localeCompare(a.title);
      });
      break;
  }
}

function renderHistoryList() {
  historyList.innerHTML = '';

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredHistory.length);
  const currentItems = filteredHistory.slice(startIndex, endIndex);

  if (currentItems.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <p>No download history found.</p>
        ${historyData.length > 0 ? '<p>Try adjusting your filters.</p>' : ''}
      </div>
    `;
    return;
  }

  currentItems.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.dataset.id = item.id;

    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

    let thumbnailHtml = '';
    if (item.thumbnail) {
      thumbnailHtml = `<img src="${item.thumbnail}" alt="${item.title || 'Download'}" />`;
    } else {
      thumbnailHtml = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM10.5 16.5L17 12L10.5 7.5V16.5Z" fill="#999"/>
      </svg>`;
    }

    historyItem.innerHTML = `
      <div class="thumbnail">
        ${thumbnailHtml}
      </div>
      <div class="content">
        <div class="title">${item.title || 'Untitled Download'}</div>
        <div class="info">
          <span>${formattedDate}</span>
          <span>Type: ${formatDownloadMode(item.downloadMode)}</span>
          <span class="status-badge ${item.success ? 'success' : 'failure'}">${item.success ? 'Success' : 'Failed'}</span>
        </div>
        <div class="url">${item.url || 'No URL available'}</div>
      </div>
      <div class="actions">
        <button class="download-again" data-url="${item.url}" data-mode="${item.downloadMode}">Download Again</button>
        <button class="remove-item" data-id="${item.id}">Remove</button>
      </div>
    `;

    historyList.appendChild(historyItem);
  });

  document.querySelectorAll('.download-again').forEach(button => {
    button.addEventListener('click', handleDownloadAgain);
  });

  document.querySelectorAll('.remove-item').forEach(button => {
    button.addEventListener('click', handleRemoveItem);
  });
}

function formatDownloadMode(mode) {
  switch(mode) {
    case 'auto': return 'Video + Audio';
    case 'audio': return 'Audio Only';
    case 'video': return 'Video Only';
    default: return mode;
  }
}

function renderPagination() {
  pagination.innerHTML = '';

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  if (totalPages <= 1) {
    return;
  }

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '←';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderHistoryList();
      renderPagination();
    }
  });
  pagination.appendChild(prevBtn);

  const maxButtons = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  const endPage = Math.min(totalPages, startPage + maxButtons - 1);

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    if (i === currentPage) {
      pageBtn.classList.add('current');
    }
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      renderHistoryList();
      renderPagination();
    });
    pagination.appendChild(pageBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '→';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderHistoryList();
      renderPagination();
    }
  });
  pagination.appendChild(nextBtn);
}

function handleDownloadAgain(e) {
  const url = e.target.dataset.url;
  const mode = e.target.dataset.mode;

  if (url) {
    chrome.storage.sync.get({ instance: 'cobalt.tools' }, function(options) {
      const cobaltUrl = `https://${options.instance}/?u=${encodeURIComponent(url)}&m=${mode}`;
      window.open(cobaltUrl, '_blank');
    });
  }
}

function handleRemoveItem(e) {
  const id = e.target.dataset.id;

  confirmMessage.textContent = 'Are you sure you want to remove this item from your history?';
  showModal('remove', id);
}

function removeHistoryItem(id) {
  const index = historyData.findIndex(item => item.id === id);

  if (index !== -1) {
    historyData.splice(index, 1);
    saveHistoryData();
    applyFilters();
  }
}

function clearAllHistory() {
  confirmMessage.textContent = 'Are you sure you want to clear your entire download history?';
  showModal('clear-all');
}

function showModal(action, id) {
  confirmBtn.dataset.action = action;
  if (id) confirmBtn.dataset.id = id;

  confirmModal.style.display = 'flex';
}

function handleConfirm() {
  const action = confirmBtn.dataset.action;

  if (action === 'remove') {
    const id = confirmBtn.dataset.id;
    removeHistoryItem(id);
  } else if (action === 'clear-all') {
    historyData = [];
    saveHistoryData();
    applyFilters();
  }

  confirmModal.style.display = 'none';
}

function saveHistoryData() {
  chrome.storage.local.set({ downloadHistory: historyData });
}

function setupEventListeners() {
  searchInput.addEventListener('input', debounce(applyFilters, 300));
  typeFilter.addEventListener('change', applyFilters);
  statusFilter.addEventListener('change', applyFilters);
  sortBy.addEventListener('change', applyFilters);

  clearAllBtn.addEventListener('click', clearAllHistory);

  cancelBtn.addEventListener('click', () => {
    confirmModal.style.display = 'none';
  });
  confirmBtn.addEventListener('click', handleConfirm);

  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
      confirmModal.style.display = 'none';
    }
  });
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

document.addEventListener('DOMContentLoaded', initHistoryPage);
