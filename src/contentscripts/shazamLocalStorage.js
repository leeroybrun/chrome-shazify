function retrieveWindowVariables(variables) {
    var ret = {};

    var scriptContent = '';
    for (var i = 0; i < variables.length; i++) {
        var currVariable = variables[i];
        scriptContent += "if (typeof " + currVariable + " !== 'undefined') document.body.setAttribute('tmp_" + currVariable + "', JSON.stringify(" + currVariable + "));\n"
    }

    var script = document.createElement('script');
    script.id = 'tmpScript';
    script.appendChild(document.createTextNode(scriptContent));
    (document.body || document.head || document.documentElement).appendChild(script);

    for (var i = 0; i < variables.length; i++) {
        var currVariable = variables[i];
        ret[currVariable] = JSON.parse(document.body.getAttribute('tmp_' + currVariable));
        document.body.removeAttribute('tmp_' + currVariable);
    }

    document.getElementById('tmpScript').remove();

    return ret;
}

function getFirebaseUserFromPage(callback) {
  // https://stackoverflow.com/a/40048827/1160800
  /*
  if (user) {
    user.getIdToken().then(function(idToken) {
      console.log(idToken);
    });
  }
  */
  var scriptContent = "function shazifySendFirebaseUser(user) {\
    document.dispatchEvent(new CustomEvent('shazifyGetFirebaseUser', { detail: JSON.stringify({ user: user }) }));\
  }\
  firebase.auth().onAuthStateChanged(function(user) {\
    if (!user){\
      return shazifySendFirebaseUser(null);\
    }\
    user.getIdToken().then(function(idToken) {\
      return shazifySendFirebaseUser({ \
        uid: user.uid, \
        refreshToken: user.refreshToken, \
        idToken: idToken \
      });\
    });\
 });\n"

  document.addEventListener('shazifyGetFirebaseUser', function (e) {
    if (document.getElementById('tmpScriptGetFirebaseUser')) {
      document.getElementById('tmpScriptGetFirebaseUser').remove();
    }

    document.removeEventListener('shazifyGetFirebaseUser', arguments.callee);

    return callback(null, JSON.parse(e.detail).user);
  });

  var script = document.createElement('script');
  script.id = 'tmpScriptGetFirebaseUser';
  script.appendChild(document.createTextNode(scriptContent));
  (document.body || document.head || document.documentElement).appendChild(script);
}

var modalContainer = null;

function closeModal() {
    if (modalContainer) {
        modalContainer.remove();
        modalContainer = null;
    }
}

function openModal(text, success) {
    success = success || false;

    modalContainer = document.createElement('div');
    modalContainer.className = 'shazify-modal' + (success ? ' shazify-modal-success' : '');

    var modalContent = document.createElement('div');
    modalContent.className = 'shazify-modal-content';
    modalContainer.appendChild(modalContent);

    var modalClose = document.createElement('span');
    modalClose.className = 'shazify-modal-close';
    modalClose.innerHTML = '&times;';

    var modalText = document.createElement('p');
    modalText.innerHTML = text;

    if (!success) {
      var modalImg = document.createElement('img');
      modalImg.src = chrome.runtime.getURL('contentscripts/img/attention_icon.png');
      modalImg.className = 'shazify-modal-img';
      modalContent.appendChild(modalImg);
    }

    modalContent.appendChild(modalClose);
    modalContent.appendChild(modalText);

    modalClose.onclick = closeModal;
    /*modalContainer.onclick = closeModal;
    modalContent.onClick = function(e) {
        e.stopPropagation();
        return false;
    };*/
    
    document.body.appendChild(modalContainer);

    if (document.getElementById('shazify-modal-close-popup-link')) {
      document.getElementById('shazify-modal-close-popup-link').onclick = closeModal;
    }
}

function openModalOnlyOnce(text, success) {
    success = success || false;

    if(modalContainer) {
        closeModal();
    }

    return openModal(text, success);
}

function getAndSendLocalStorage() {
    // We could also get "shz.ux.auth.storage" to check which storage is used (icloud, firebase, etc)
    var pageVars = retrieveWindowVariables(['localStorage']);

    if(pageVars && pageVars.localStorage) {
        if(pageVars.localStorage.inid) {
            console.log('inid found on local storage : '+ pageVars.localStorage.inid);
            console.log('Sending to Shazify...');
    
            // Send a message to Shazify background script with the page's localStorage
            chrome.runtime.sendMessage({ shazamLocalStorageInid: pageVars.localStorage.inid }, function(response) {
              if(!response || ('isFine' in response && response.isFine === false)) {
                console.log('inid seems not fine... maybe an old one. Please login again on Shazam.');
                observeForLoginAndGetLocalStorage();
              } else {
                console.log('inid seems fine! Congrats! You are now logged in on Shazam.');
    
                openModalOnlyOnce('<p class="shazify-modal-title">Shazify:</p> '+ chrome.i18n.getMessage('shazamLoginSuccessOpenAgain'), true);
              }
            });
    
            return true;
        }

        if(pageVars.localStorage.icloud) {
            console.log('icloud found on local storage : '+ pageVars.localStorage.icloud);
            console.log('Sending to Shazify...');
    
            // Send a message to Shazify background script with the page's localStorage
            chrome.runtime.sendMessage({ shazamLocalStorageIcloud: pageVars.localStorage.icloud }, function(response) {
              if(!response || ('isFine' in response && response.isFine === false)) {
                console.log('iCloud token seems not fine... maybe an old one. Please login again on Shazam.');
                observeForLoginAndGetLocalStorage();
              } else {
                console.log('iCloud token seems fine! Congrats! You are now logged in on Shazam.');
    
                openModalOnlyOnce('<p class="shazify-modal-title">Shazify:</p> '+ chrome.i18n.getMessage('shazamLoginSuccessOpenAgain'), true);
              }
            });
    
            return true;
        }

        if(pageVars.localStorage.eat) {
            var eat = JSON.parse(pageVars.localStorage.eat);
            var idToken = eat.data || null;
            console.log('eat (Firebase ID token) found on local storage : '+ idToken +' ('+ pageVars.localStorage.eat +')');
            console.log('Checking for a refresh token...');

            getFirebaseUserFromPage(function(error, user) {
              if (error || !user) {
                console.log('Cannot get Firebase user.');
                observeForLoginAndGetLocalStorage();
                return false;
              }

              console.log('Firebase user', user);

              if(!user.refreshToken || !user.uid) {
                console.log('Cannot find a refresh token or uid from Firebase. Please try to login again.');
                observeForLoginAndGetLocalStorage();
                return false;
              }

              var firebaseRefreshToken = user.refreshToken || user.stsTokenManager.refreshToken;

              console.log('Sending to Shazify...');
      
              // Send a message to Shazify background script with the page's localStorage
              chrome.runtime.sendMessage({ shazamLocalStorageFirebase: { 
                idToken: user.idToken || idToken, 
                refreshToken: firebaseRefreshToken,
                userId: user.uid
              }}, function(response) {
                if(!response || ('isFine' in response && response.isFine === false)) {
                  console.log('Firebase token seems not fine... maybe an old one. Please login again on Shazam.');
                  observeForLoginAndGetLocalStorage();
                } else {
                  console.log('Firebase token seems fine! Congrats! You are now logged in on Shazam.');
      
                  openModalOnlyOnce('<p class="shazify-modal-title">Shazify:</p> '+ chrome.i18n.getMessage('shazamLoginSuccessOpenAgain'), true);
                }
              });
            });
    
            return true;
        }
    }

    return false;
}

var observerIsSet = false;

function observeForLoginAndGetLocalStorage() {
    if(observerIsSet) {
        return;
    }

    observerIsSet = true;

    console.log('Observing for changes on the Shazam webpage, waiting for login...');

    // Observe for changes on #/myshazam element, and when a change is detected, try to get localStorage again
    var target = document.getElementsByClassName('main');

    if(!target || target.length === 0) {
        console.log('DOM not ready yet, waiting 1s...');
        observerIsSet = false;

        setTimeout(function() {
            observeForLoginAndGetLocalStorage();
        }, 1000);

        return;
    }

    target = target[0];
 
    // create an observer instance
    var observer = new MutationObserver(function() {
      console.log('Change detected on the Shazam page, maybe a successful login... will check for inid in local storage.');
      if(getAndSendLocalStorage()) {
        observerIsSet = false;
        observer.disconnect();
      }
    });
     
    // configuration of the observer:
    var config = { attributes: true, childList: true, subtree: true };
     
    // pass in the target node, as well as the observer options
    observer.observe(target, config);
}

function ready(fn) {
    if (document.readyState != 'loading'){
      fn();
    } else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      document.attachEvent('onreadystatechange', function() {
        if (document.readyState != 'loading')
          fn();
      });
    }
  }

ready(function() {
    openModalOnlyOnce('<p class="shazify-modal-title">'+ chrome.i18n.getMessage('shazamLoginOnPageInstructionsTitle') +'</p> '+ chrome.i18n.getMessage('shazamLoginOnPageInstructions'));

    if(!getAndSendLocalStorage()) {
        observeForLoginAndGetLocalStorage();
    }
});