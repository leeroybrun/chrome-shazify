angular.module('Shazify')
	.config(function() {
		addEventListener('unload', function (event) {
		    chrome.extension.getBackgroundPage().s2s.Logger.info('[core] Popup closed.');
		}, true);
	});