angular.module('Shazam2Spotify').factory('TagsService', function($timeout, $interval, BackgroundService, LoginService) {
	// Tags list : http://stackoverflow.com/a/18569690/1160800

	var TagsService = {
		list: BackgroundService.Tags.list,
		updateListInterval: null,
		updating: function() { return BackgroundService.updating; },
		updateTags: function(callback) {
			// We define an interval to update the list while tags' updating is in progress
			if(TagsService.updateListInterval === null) {
				TagsService.updateListInterval = $interval(function() {
					// The intervall will automatically trigger a scope update, so we don't need to redefine the list
					//TagsService.list = BackgroundService.Tags.list;

					if(TagsService.updating() === false) {
						$interval.cancel(TagsService.updateListInterval);
						TagsService.updateListInterval = null;
					}
				}, 2000);
			}

			if(TagsService.updating()) {
				return;
			}

			LoginService.checkLogin(function(status) {
				if(status === false) {
					return callback(new Error('Login error'));
				}

				BackgroundService.updateTags(function(err) {
					if(err && err == 'already_in_progress') {
						err = null;
					}

					$timeout(function() {
						callback(err);
					}, 0);
				});
			});
		},
		
		searchTag: function(trackName, artist, tag, callback) {
			BackgroundService.searchTag(trackName, artist, tag, function(error) {
				$timeout(function() {
					callback(error);
				}, 0);
			});
		}
	};
	
	return TagsService;
});