angular.module('Shazify')
	.run(function($http, $document) {
		// Load SVG icons (dirty, should not use jQuery...)
		$http.get('img/icons.svg', {responseType: 'html'}).
			success(function(data) {
				angular.element($document[0]).find('body').prepend(data);
			});
	});