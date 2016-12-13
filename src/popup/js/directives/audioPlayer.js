angular.module('Shazify').directive('audioPlayer', function(AudioService) {
    return {
    	restrict: 'E',
	  	scope: {
	      audioSrc: '='
	    },
	    templateUrl: 'partials/audio-player.html',
	    link: function(scope, element, attrs) {
	    	var svgProgress = element[0].getElementsByClassName('progress-circle')[0];

	    	scope.svgCircleLength = svgProgress.querySelectorAll('path')[0].getTotalLength();
	    	scope.strokeDashoffset = 0;

	    	scope.progress = 0;
	    	scope.playing = false;

	    	scope.togglePlay = function() {
	    		if(scope.playing) {
	    			scope.pause();
	    		} else {
	    			scope.play();
	    		}
	    	};

	    	scope.play = function() {
	    		AudioService.setOnProgress(scope.onProgress);
	    		AudioService.play(scope.audioSrc);
	    		scope.playing = true;
	    		AudioService.setOnEnd(scope.onEnd);
	    	};

	    	scope.onProgress = function(progress) {
    			scope.progress = progress;
    			scope.strokeDashoffset = scope.svgCircleLength * (1 - progress);
	    	};

	    	scope.onEnd = function(progress) {
	    		scope.playing = false;
	    	};

	    	scope.pause = function() {
	    		scope.playing = false;
	    		AudioService.pause(scope.audioSrc);
	    	};
	    }
  	};
});