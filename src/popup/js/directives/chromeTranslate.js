angular.module('Shazify').directive('chromeTranslate', function() {
    return {
        restrict: 'A',
        link: function($scope, elem) {
			elem.html(chrome.i18n.getMessage(elem.text()));
        }
    };
});