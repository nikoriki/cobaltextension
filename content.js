(function() {
  if (!window.location.hostname.includes('cobalt.tools')) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const url = params.get('u');
  const mode = params.get('m');

  let processed = false;

  if (url) {
    const checkInterval = setInterval(() => {
      const urlInput = document.querySelector('#link-area');
      const modeButtons = {
        auto: document.querySelector('#setting-button-save-downloadMode-auto'),
        audio: document.querySelector('#setting-button-save-downloadMode-audio'),
        video: document.querySelector('#setting-button-save-downloadMode-mute')
      };
      const pasteButton = document.querySelector('#button-paste');

      if (urlInput && pasteButton) {
        clearInterval(checkInterval);
        urlInput.value = url;

        if (mode && modeButtons[mode]) {
          modeButtons[mode].click();
        }

        pasteButton.click();
        setupDownloadObserver();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      if (!processed) {
        sendDownloadStatus(false);
      }
    }, 10000);
  }

  function setupDownloadObserver() {
    const downloadObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const downloadButton = document.querySelector('[id^="download-button"]');

          if (downloadButton && !processed) {
            processed = true;
            let title = getContentTitle();
            let thumbnail = getContentThumbnail();
            sendDownloadStatus(true, title, thumbnail);
          }

          const errorElement = document.querySelector('.error-text, .error-message');
          if (errorElement && !processed) {
            processed = true;
            sendDownloadStatus(false);
          }
        }
      });
    });

    downloadObserver.observe(document.body, { childList: true, subtree: true });
  }

  function getContentTitle() {
    const titleElements = [
      document.querySelector('.content-title'),
      document.querySelector('.video-title'),
      document.querySelector('.audio-title'),
      document.querySelector('h1'),
      document.querySelector('h2')
    ];

    for (const element of titleElements) {
      if (element && element.textContent) {
        return element.textContent.trim();
      }
    }

    return document.title.replace('cobalt', '').trim() || null;
  }

  function getContentThumbnail() {
    const imgElements = [
      document.querySelector('.content-thumbnail img'),
      document.querySelector('.thumbnail img'),
      document.querySelector('.video-thumbnail img'),
      document.querySelector('.preview-image')
    ];

    for (const element of imgElements) {
      if (element && element.src && !element.src.includes('data:image')) {
        return element.src;
      }
    }

    return null;
  }

  function sendDownloadStatus(success, title = null, thumbnail = null) {
    chrome.runtime.sendMessage({
      action: 'updateDownloadStatus',
      success: success,
      title: title,
      thumbnail: thumbnail
    }, (response) => {
      console.log('Download status sent:', response);
    });
  }
})();
