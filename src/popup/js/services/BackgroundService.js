angular.module('Shazam2Spotify').factory('BackgroundService', function() {
	return chrome.extension.getBackgroundPage().s2s;
});