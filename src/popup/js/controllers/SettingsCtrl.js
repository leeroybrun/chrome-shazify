angular.module('Shazam2Spotify').controller('SettingsCtrl', function($scope, $location, ShazamService, SpotifyService) {
	$scope.shazam = {
		loginStatus: false,
		openLogin: ShazamService.openLogin
	};

	ShazamService.loginStatus(function(status) {
		$scope.shazam.loginStatus = status;
	});

	$scope.spotify = {
		loginStatus: false,
		openLogin: function() {
			SpotifyService.openLogin(function(status) {
				$scope.spotify.loginStatus = status;
				$scope.$apply();
			});
		},
		disconnect: function() {
			SpotifyService.disconnect(function() {
				$scope.spotify.loginStatus = false;
				$scope.$apply();
			});
		}
	};

	SpotifyService.loginStatus(function(status) {
		$scope.spotify.loginStatus = status;
	});

	$scope.return = function() {
		$location.path('/');
	};
});