document.addEventListener('DOMContentLoaded', function() {
  if (window.cobaltUtils) {
    cobaltUtils.applyLocalization();
  }

  const urlInput = document.getElementById('url-input');
  const btnAuto = document.getElementById('btn-auto');
  const btnAudio = document.getElementById('btn-audio');
  const btnVideo = document.getElementById('btn-video');
  const btnPaste = document.getElementById('btn-paste');
  const btnCurrent = document.getElementById('btn-current');
  const statusText = document.getElementById('status-text');
  const viewHistory = document.getElementById('view-history');
  const openAbout = document.getElementById('open-about');
  const logoImg = document.getElementById('logo-img');

  let downloadMode = 'auto';

  chrome.storage.local.get(['lastUrl'], function(result) {
    if (result.lastUrl) {
      urlInput.value = result.lastUrl;
    }
  });

  navigator.clipboard.readText().then(text => {
    if (text && isValidUrl(text) && !urlInput.value) {
      urlInput.value = text;
    }
  }).catch(err => {
    console.log('Could not read clipboard: ', err);
  });

  btnAuto.addEventListener('click', function() {
    setActiveButton(btnAuto);
    downloadMode = 'auto';
  });

  btnAudio.addEventListener('click', function() {
    setActiveButton(btnAudio);
    downloadMode = 'audio';
  });

  btnVideo.addEventListener('click', function() {
    setActiveButton(btnVideo);
    downloadMode = 'video';
  });

  btnPaste.addEventListener('click', function() {
    navigator.clipboard.readText().then(text => {
      if (isValidUrl(text)) {
        urlInput.value = text;
        download(text);
      } else {
        setStatus(getMessage('invalidUrl'), true);
      }
    }).catch(err => {
      setStatus(getMessage('clipboardError', [err.toString()]), true);
    });
  });

  btnCurrent.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0] && tabs[0].url) {
        const currentUrl = tabs[0].url;
        urlInput.value = currentUrl;
        download(currentUrl);
      } else {
        setStatus(getMessage('currentPageError'), true);
      }
    });
  });

  urlInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      const url = urlInput.value.trim();
      if (url && isValidUrl(url)) {
        download(url);
      } else {
        setStatus(getMessage('invalidUrl'), true);
      }
    }
  });

  viewHistory.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: 'history.html' });
    window.close();
  });

  openAbout.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: 'about.html' });
    window.close();
  });

  function getMessage(messageName, substitutions = []) {
    if (window.cobaltUtils) {
      return cobaltUtils.getMessage(messageName, substitutions);
    }
    return chrome.i18n.getMessage(messageName, substitutions);
  }

  function setActiveButton(activeBtn) {
    [btnAuto, btnAudio, btnVideo].forEach(btn => {
      btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
  }

  function isValidUrl(url) {
    if (window.cobaltUtils) {
      return cobaltUtils.isValidUrl(url);
    }

    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  }

  function setStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.style.color = isError ? '#ff6b6b' : '#a0a0a0';
  }

  function download(url) {
    chrome.storage.local.set({lastUrl: url});

    setStatus(getMessage('processing'));

    chrome.runtime.sendMessage({
      action: 'startDownload',
      url: url,
      mode: downloadMode,
      title: document.title
    }, function(response) {
      if (!response) {
        chrome.tabs.create({ url: `https://cobalt.tools/?u=${encodeURIComponent(url)}&m=${downloadMode}` });
      }

      window.close();
    });
  }
});
