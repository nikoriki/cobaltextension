function getMessage(messageName, substitutions = []) {
  return chrome.i18n.getMessage(messageName, substitutions);
}

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'download-with-cobalt',
    title: getMessage('contextMenuDownloadLink'),
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'download-auto',
    parentId: 'download-with-cobalt',
    title: getMessage('btnAuto'),
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'download-audio',
    parentId: 'download-with-cobalt',
    title: getMessage('btnAudio'),
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'download-video',
    parentId: 'download-with-cobalt',
    title: getMessage('btnVideo'),
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'download-page-with-cobalt',
    title: getMessage('contextMenuDownloadPage'),
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'download-page-auto',
    parentId: 'download-page-with-cobalt',
    title: getMessage('btnAuto'),
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'download-page-audio',
    parentId: 'download-page-with-cobalt',
    title: getMessage('btnAudio'),
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'download-page-video',
    parentId: 'download-page-with-cobalt',
    title: getMessage('btnVideo'),
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'view-download-history',
    title: getMessage('contextMenuViewHistory'),
    contexts: ['action']
  });

  initializeExtension();
});

function initializeExtension() {
  chrome.storage.local.remove(['pendingDownload', 'currentDownload']);
  console.log('Extension initialized successfully');
}

chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);

  try {
    switch (command) {
      case 'download-current-page-auto':
        downloadCurrentPage('auto');
        break;
      case 'download-current-page-audio':
        downloadCurrentPage('audio');
        break;
      case 'download-current-page-video':
        downloadCurrentPage('video');
        break;
      case 'open-popup':
        console.log('Open popup command received');
        break;
      default:
        console.log('Unknown command:', command);
    }
  } catch (error) {
    console.error('Error executing command:', command, error);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let url = '';
  let mode = 'auto';

  if (info.menuItemId === 'download-auto' || info.menuItemId === 'download-page-auto') {
    mode = 'auto';
  } else if (info.menuItemId === 'download-audio' || info.menuItemId === 'download-page-audio') {
    mode = 'audio';
  } else if (info.menuItemId === 'download-video' || info.menuItemId === 'download-page-video') {
    mode = 'video';
  } else if (info.menuItemId === 'view-download-history') {
    chrome.tabs.create({ url: 'history.html' });
    return;
  }

  if (info.menuItemId.includes('download-page')) {
    url = tab.url;
  } else {
    url = info.linkUrl;
  }

  if (url) {
    handleDownload(url, mode, tab.title || '');
  }
});

function downloadCurrentPage(mode) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      handleDownload(tabs[0].url, mode, tabs[0].title || '');
    } else {
      console.error('Could not get current page URL');
    }
  });
}

function handleDownload(url, mode, pageTitle) {
  sendToCobalt(url, mode, pageTitle);
}

function sendToCobalt(url, mode, pageTitle) {
  const downloadEntry = {
    id: generateUniqueId(),
    url: url,
    title: pageTitle,
    downloadMode: mode,
    timestamp: Date.now(),
    success: true,
    thumbnail: null
  };

  chrome.storage.local.set({ currentDownload: downloadEntry }, () => {
    console.log('Download started');

    const cobaltUrl = `https://cobalt.tools/?u=${encodeURIComponent(url)}&m=${mode}`;

    chrome.tabs.create({ url: cobaltUrl }, (tab) => {
      console.log('Download initiated, tab opened');
    });
  });
}

function addToDownloadHistory(downloadEntry) {
  chrome.storage.local.get({ downloadHistory: [] }, (data) => {
    const history = data.downloadHistory;

    history.unshift(downloadEntry);

    if (history.length > 100) {
      history.splice(100);
    }

    chrome.storage.local.set({ downloadHistory: history });
  });
}

chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateDownloadStatus') {
    chrome.storage.local.get(['currentDownload'], (data) => {
      if (data.currentDownload) {
        const updatedEntry = {
          ...data.currentDownload,
          success: message.success,
          title: message.title || data.currentDownload.title,
          thumbnail: message.thumbnail || data.currentDownload.thumbnail
        };

        chrome.storage.local.remove(['currentDownload']);

        addToDownloadHistory(updatedEntry);

        console.log(`Download ${updatedEntry.success ? 'completed' : 'failed'}`);

        sendResponse({ status: 'Download status updated' });
      }
    });

    return true;
  }

  if (message.action === 'startDownload') {
    handleDownload(message.url, message.mode, message.title || '');
    sendResponse({ status: 'Download started' });
    return true;
  }
});
