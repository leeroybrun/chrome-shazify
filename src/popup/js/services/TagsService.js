angular.module('Shazify').factory('TagsService', function($timeout, $interval, BackgroundService, LoginService) {
	// Tags list : http://stackoverflow.com/a/18569690/1160800

	var TagsService = {
		list: [],
		updateListInterval: null,
		updating: function() { return true; }, // true until first list fetch is complete
		
		getUpdateStatus: function(callback) {
			$timeout(function() {
				callback(BackgroundService.getUpdateStatus());
			}, 0);
		},

		updateTags: function(callback) {
			// We define an interval to update the list while tags' updating is in progress
			if(TagsService.updateListInterval === null) {
				TagsService.updateListInterval = $interval(function() {
					BackgroundService.Tags.getList(function(error, tagsList) {
						TagsService.list = tagsList;
					});

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
			BackgroundService.searchTag(trackName, artist, tag, function(err) {
				$timeout(function() {
					callback(err);
				}, 0);
			});
		}
	};

	BackgroundService.Tags.getList(function(error, tagsList) {
		TagsService.list = tagsList;

		TagsService.updating = function() { return BackgroundService.updating; };
	});
	
	return TagsService;
});