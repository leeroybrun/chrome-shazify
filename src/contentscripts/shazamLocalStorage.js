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

function openModal(text) {
    var modalContainer = document.createElement('div');
    modalContainer.className = 'shazify-modal';

    var modalContent = document.createElement('div');
    modalContent.className = 'shazify-modal-content';
    modalContainer.appendChild(modalContent);

    var modalClose = document.createElement('span');
    modalClose.className = 'shazify-modal-close';
    modalClose.innerHTML = '&times;';

    var modalText = document.createElement('p');
    modalText.innerHTML = text;

    modalContent.appendChild(modalClose);
    modalContent.appendChild(modalText);

    var closeModal = function() {
        modalContainer.remove();
    };

    modalClose.onclick = closeModal;
    modalContainer.onclick = closeModal;
    
    document.body.appendChild(modalContainer);
}

var modalOpened = false;
function openModalOnlyOnce(text) {
    if(modalOpened) {
        return;
    }

    return openModal(text);
}

function getAndSendLocalStorage() {
    var pageVars = retrieveWindowVariables(['localStorage']);

    if(pageVars && pageVars.localStorage && pageVars.localStorage.inid) {
        console.log('inid found on local storage : '+ pageVars.localStorage.inid);
        console.log('Sending to Shazify...');

        // Send a message to Shazify background script with the page's localStorage
        chrome.runtime.sendMessage({ shazamLocalStorage: pageVars.localStorage }, function(response) {
          if(!response || ('isFine' in response && response.isFine === false)) {
            console.log('inid seems not fine... maybe an old one. Please login again on Shazam.');
            observeForLoginAndGetLocalStorage();
          } else {
            console.log('inid seems fine! Congrats! You are now logged in on Shazam.');

            openModalOnlyOnce('<b>Shazify:</b> Login is successful! Please open Shazify again.');
          }
        });

        return true;
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
    var config = { childList: true };
     
    // pass in the target node, as well as the observer options
    observer.observe(target, config);
}

if(!getAndSendLocalStorage()) {
    observeForLoginAndGetLocalStorage();
}