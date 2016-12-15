angular.module('Shazify').controller('SettingsCtrl', function($scope, $location, $timeout, ChromeHelper, BackgroundService, LoginService, TagsService) {
	$scope.login = LoginService;

	$scope.updating = function() { return BackgroundService.updating; };
	$scope.updatingApp = function() { return BackgroundService.updatingApp; };

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if(message.action && message.action === 'forcePopupUpdate') {
    	// Force dirty-checking
      $timeout(function() {}, 0);
    }
  });

	$scope.recreatePlaylist = {
		hidden: true,
		toggle: function() {
			$scope.recreatePlaylist.hidden = !$scope.recreatePlaylist.hidden;
		},

		removeAll: true,
		send: function() {
			if(confirm(chrome.i18n.getMessage('recreatePlaylistAreYouSure'))) {
				BackgroundService.recreateTracksOnPlaylist($scope.recreatePlaylist.removeAll, function(err) {
	        if(err) {
	          console.error(err);
	        }

	        $timeout(function() {
	        	$scope.updating();
	        }, 0);
	      });
			}
		}
	};

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