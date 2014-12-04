angular.module('Shazam2Spotify').factory('LoginService', function(BackgroundService, $timeout) {
	var LoginService = {
		checkLogin: function(callback) {
			LoginService.shazam.loginStatus(function(status) {
				if(status === false) {
					return callback(false);
				}

				LoginService.spotify.loginStatus(function(status) {
					if(status === false) {
						return callback(false);
					}

					callback(true);
				});
			});
		},
		
		shazam: {
			status: false,
			lastCheck: 0,
			
			openLogin: BackgroundService.Shazam.openLogin,

			loginStatus: function(callback) {
				callback = callback || function(){};

				// Do we have checked login status <= 5 min ago ?
				if((new Date()).getTime() <= (LoginService.shazam.lastCheck + 5 * 60 * 1000)) {
					return callback(LoginService.shazam.status);
				}

				BackgroundService.Shazam.loginStatus(function(status) {
					$timeout(function() {
						LoginService.shazam.lastCheck = (new Date()).getTime();
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