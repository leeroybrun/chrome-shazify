angular.module('Shazify').factory('TagsService', function($timeout, $interval, BackgroundService, LoginService) {
	// Tags list : http://stackoverflow.com/a/18569690/1160800

	var TagsService = {
		updateListInterval: null,
		updating: function() { return BackgroundService.updating; },

		getList: function(status, offset, limit, callback) {
			if(typeof status === 'function') {
				callback = status;
				status = null;
				offset = null;
				limit = null;
			}

			BackgroundService.Tags.getList({
				where: {
					status: status || [ 1, 2, 3, 4 ]
				},
				offset: offset || 0,
				limit: limit || 50
			}, callback);

			BackgroundService.Tags.count(function(error, count) {
				TagsService.count = count;
			});
		},
		
		getUpdateStatus: function(callback) {
			$timeout(function() {
				callback(BackgroundService.getUpdateStatus());
			}, 0);
		},

		updateTags: function(updateCallback, callback) {
			// We define an interval to update the list while tags' updating is in progress
			if(TagsService.updateListInterval === null) {
				TagsService.updateListInterval = $interval(function() {
					updateCallback();

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
	
	return TagsService;
});