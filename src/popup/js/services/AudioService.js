angular.module('Shazify').factory('AudioService', function($timeout) {
	var AudioService = {
		_audio: new Audio(),

		setSrc: function(src) {
			AudioService._audio.src = src;
		},

		setOnProgress: function(onProgress) {
			AudioService.onProgress = onProgress;
		},

		callOnProgress: function(progress) {
			if(typeof AudioService.onProgress === 'function') {
				$timeout(function() {
					AudioService.onProgress(progress);
				}, 0);
			}
		},

		setOnEnd: function(onEnd) {
			AudioService.onEnd = onEnd;
		},

		callOnEnd: function() {
			if(typeof AudioService.onEnd === 'function') {
				var onEnd = AudioService.onEnd;
				$timeout(function() {
					onEnd();
				}, 0);
			}
		},

		onEnd: null,
		onProgress: null,
		progressTimer: null,

		_onEndedSet: false,

		play: function(src) {
			src = src || null;

			AudioService.callOnEnd();

			if(src) {
				AudioService.setSrc(src);
			}

			AudioService._audio.play();

			if(!AudioService._onEndedSet) {
				AudioService._audio.addEventListener('ended', function() {
					AudioService.callOnEnd();
					AudioService.clearOnProgress();
				});

				AudioService._onEndedSet = true;
			}

			AudioService.progressTimer = setInterval(function() {
				if(AudioService._audio.currentTime && AudioService._audio.duration) {
					AudioService.callOnProgress(AudioService._audio.currentTime / AudioService._audio.duration);
				}
			}, 500);
		},

		pause: function() {
			AudioService.callOnEnd();
			AudioService._audio.pause();
			AudioService.clearOnProgress();
		},

		clearOnProgress: function() {
			clearInterval(AudioService.progressTimer);
			AudioService.progressTimer = null;
		}
	};
	
	return AudioService;
});