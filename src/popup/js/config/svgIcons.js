angular.module('Shazam2Spotify')
	.config(function() {
		// Load SVG icons (dirty, should not use jQuery...)
		$.ajax({
			url: 'img/icons.svg',
			method: 'GET',
			dataType: 'html',
			success: function(data) {
				$("body").prepend(data);
			}
		});
	});