angular.module('Shazify').factory('TagsService', function($timeout, $interval, BackgroundService, LoginService) {
	// Tags list : http://stackoverflow.com/a/18569690/1160800

	var TagsService = {
		updateListInterval: null,
		updating: function() { return BackgroundService.updating; },
		updatingApp: function() { return BackgroundService.updatingApp; },

		getList: function(status, offset, limit, callback) {
			if(TagsService.updatingApp()) {
				return callback(null, []);
			}

			if(typeof status === 'function') {
				callback = status;
				status = null;
				offset = null;
				limit = null;
			}

			status = (status === null || typeof status === 'undefined') ? [ 1, 2, 3, 4 ] : status;
			offset = (offset === null || typeof offset === 'undefined') ? 0 : offset;
			limit  = (limit === null || typeof limit === 'undefined') ? 10 : limit;

			BackgroundService.Tags.getList({
				where: {
					status: status
				},
				offset: offset,
				limit: limit
			}, function(error, result) {
				if(error) {
					return callback(error);
				}

				/*BackgroundService.Tags.count(function(error, count) {
					if(error) {
						return callback(error);
					}*/

					$timeout(function() {
						return callback(null, result);
					}, 0);
				//});
			});
		},
		
		getUpdateStatus: function(callback) {
			$timeout(function() {
				callback(BackgroundService.getUpdateStatus());
			}, 0);
		},

		updateTags: function(updateCallback, callback) {
			if(TagsService.updatingApp()) {
				return callback();
			}

			// We define an interval to update the list while tags' updating is in progress
			if(TagsService.updateListInterval === null) {
				TagsService.updateListInterval = $interval(function() {
					$timeout(function() {
						updateCallback();
					}, 0);

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
					if(err && (err == 'already_in_progress' || err == 'app_update_in_progress')) {
						err = null;
					}

					$timeout(function() {
						callback(err);
					}, 0);
				});
			});
		},
		
		searchTag: function(trackName, artist, tag, callback) {
			if(TagsService.updatingApp()) {
				return callback();
			}

			BackgroundService.searchTag(trackName, artist, tag, function(err) {
				$timeout(function() {
					callback(err);
				}, 0);
			});
		},
		
		selectSpotifyTrack: function(shazamId, newSpotifyId, callback) {
			if(TagsService.updatingApp()) {
				return callback();
			}

			BackgroundService.Tags.selectSpotifyTrack(shazamId, newSpotifyId, function(err) {
				$timeout(function() {
					callback(err);
				}, 0);
			});
		},
		
		setAsNotFound: function(shazamId, callback) {
			if(TagsService.updatingApp()) {
				return callback();
			}

			BackgroundService.Tags.setAsNotFound(shazamId, function(err) {
				$timeout(function() {
					callback(err);
				}, 0);
			});
		}
	};
	
	return TagsService;
});