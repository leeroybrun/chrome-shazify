angular.module('Shazam2Spotify').factory('LoginService', function(BackgroundService, $timeout) {
	var LoginService = {
		shazam: {
			status: false,
			
			openLogin: BackgroundService.Shazam.openLogin,

			loginStatus: function(callback) {
				callback = callback || function(){};

				BackgroundService.Shazam.loginStatus(function(status) {
					$timeout(function() {
						LoginService.shazam.status = status;
						callback(status);
					}, 0);
				});
			}
		},

		spotify: {
			status: false,

			openLogin: function() {
				BackgroundService.Spotify.openLogin(function(status) {
					$timeout(function() {
						LoginService.spotify.status = status;
					}, 0);
				});
			},

			disconnect: function() {
				BackgroundService.Spotify.disconnect(function() {
					$timeout(function() {
						LoginService.spotify.status = false;
					}, 0);
				});
			},

			loginStatus: function(callback) {
				callback = callback || function(){};
				
				BackgroundService.Spotify.loginStatus(function(status) {
					$timeout(function() {
						LoginService.spotify.status = status;
						callback(status);
					}, 0);
				});
			}
		}
	};

	LoginService.shazam.loginStatus();
	LoginService.spotify.loginStatus();
	
	return LoginService;
});