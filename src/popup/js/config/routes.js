angular.module('Shazify')
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
	}]);