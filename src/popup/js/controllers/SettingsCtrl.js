angular.module('Shazify').controller('SettingsCtrl', function($scope, $location, ChromeHelper, BackgroundService, LoginService) {
	$scope.login = LoginService;

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