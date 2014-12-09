angular.module('Shazam2Spotify', ['ngRoute', 'ngAnimate', 'angulartics', 'angulartics.google.analytics'])
	.config(['$routeProvider', function($routeProvider) {
		$routeProvider
			.when('/', {
				templateUrl: 'partials/tags.html', 
				controller: 'TagsCtrl'
			})
			.when('/settings', {
				templateUrl: 'partials/settings.html',
				controller: 'SettingsCtrl'
			})
			.when('/intro', {
				templateUrl: 'partials/intro.html',
				controller: 'IntroCtrl'
			})
			.otherwise({redirectTo: '/'});

		// Load SVG icons (dirty, should not use jQuery...)
		$.ajax({
			url: 'img/icons.svg',
			method: 'GET',
			dataType: 'html',
			success: function(data) {
				$("body").prepend(data);
			}
		});
	}]);