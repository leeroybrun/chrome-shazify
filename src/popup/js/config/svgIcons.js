angular.module('Shazify')
	.run(function($http, $document) {
		// Load SVG icons (dirty, should not use jQuery...)
		$http.get('img/icons.svg').
			then(function(response) {
        //document.body.insertAdjacentHTML('afterbegin', data);
				$document.find('body').eq(0).prepend(response.data);
			}).catch(function(reason) {
        console.log('Cannot load SVG icons : '+ reason);
      });
	});