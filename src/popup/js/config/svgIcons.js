angular.module('Shazam2Spotify')
	.run(function($http) {
		// Load SVG icons (dirty, should not use jQuery...)
		$http.get('img/icons.svg', {responseType: 'html'}).
			success(function(data) {
				angular.element('body').prepend(data);
			});
	});