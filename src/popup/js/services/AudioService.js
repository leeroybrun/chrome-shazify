angular.module('Shazify').factory('AudioService', function($timeout) {
	var AudioService = {
		_audio: new Audio(),

		setSrc: function(src) {
			AudioService._audio.src = src;
		},

		play: function(src) {
			src = src || null;

			if(src) {
				AudioService.setSrc(src);
			}

			AudioService._audio.play();
		}
	};
	
	return AudioService;
});