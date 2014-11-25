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

	// Advanced settings
	$scope.advanced = {
		hidden: true,

		toggle: function() {
			$scope.advanced.hidden = !$scope.advanced.hidden;
		},

		clearExtData: function() {
			chrome.storage.local.clear();
			chrome.storage.sync.clear();
		},

		exportLogs: function() {
			// TODO: export the logs
		}
	};

	$scope.return = function() {
		$location.path('/');
	};
});