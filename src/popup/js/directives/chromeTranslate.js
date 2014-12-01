angular.module('Shazam2Spotify').directive('chromeTranslate', function() {
    return {
        restrict: 'A',
        link: function($scope, elem) {
			elem.html(chrome.i18n.getMessage(elem.text()));
        }
    };
});