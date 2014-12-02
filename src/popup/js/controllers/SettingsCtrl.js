angular.module('Shazam2Spotify').controller('SettingsCtrl', function($scope, $location, ChromeHelper, BackgroundService) {
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
			BackgroundService.Logger.info('[core] Cleaning extension\'s popup data.');

			chrome.storage.local.clear();
			chrome.storage.sync.clear();
			
			chrome.extension.sendMessage({greeting: 'clearStorage'});
		},

		exportLogs: function() {
			var logsData = BackgroundService.Logger.exportLogs();
			ChromeHelper.exportData('logs.txt', logsData);
		}
	};

	$scope.return = function() {
		$location.path('/');
	};
});