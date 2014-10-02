chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('popup/popup.html', {
    'bounds': {
      'width': 330,
      'height': 500
    }
  });
});