angular.module('Shazify').factory('SpotifyService', function($timeout, $interval, BackgroundService, LoginService) {
	var SpotifyService = {
		searchTracks: function(query, callback) {
			BackgroundService.Spotify.findTracks(query, function(err, tracks) {
				$timeout(function() {
					console.log(err, tracks);
					callback(err, tracks);
				}, 0);
			});
		},

		genQuery: function(trackName, artist, callback) {
			var query = BackgroundService.Spotify.genQuery(trackName, artist);

			$timeout(function() {
				callback(query);
			}, 0);
		}
	};
	
	return SpotifyService;
});