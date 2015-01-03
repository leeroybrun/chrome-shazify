angular.module('Shazify').factory('BackgroundService', function() {
	return chrome.extension.getBackgroundPage().s2s;
});