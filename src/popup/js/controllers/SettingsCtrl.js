angular.module('Shazam2Spotify').controller('SettingsCtrl', function($scope, $location, BackgroundService) {
	$scope.shazam = {
		loginStatus: false,
		openLogin: BackgroundService.Shazam.openLogin
	};

	BackgroundService.Shazam.loginStatus(function(status) {
		$scope.shazam.loginStatus = status;
		$scope.$apply();
	});

	$scope.spotify = {
		loginStatus: false,
		openLogin: function() {
			BackgroundService.Spotify.openLogin(function(status) {
				$scope.spotify.loginStatus = status;
				$scope.$apply();
			});
		},
		disconnect: function() {
			BackgroundService.Spotify.disconnect(function() {
				$scope.spotify.loginStatus = false;
				$scope.$apply();
			});
		}
	};

	BackgroundService.Spotify.loginStatus(function(status) {
		$scope.spotify.loginStatus = status;
		$scope.$apply();
	});

	$scope.resetAll = function() {
		chrome.storage.local.clear();
		chrome.storage.sync.clear();
	};

	$scope.return = function() {
		$location.path('/');
	};
});