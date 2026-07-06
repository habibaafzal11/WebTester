// content.js - WebTester Pro
(function() {
  chrome.runtime.onMessage.addListener(function(msg, sender, respond) {
    if (msg.type === 'GET_PAGE_INFO') {
      respond({
        url: window.location.href,
        title: document.title,
        elementCount: document.querySelectorAll('button,input,select,textarea,a[href]').length
      });
    }
  });
})();
