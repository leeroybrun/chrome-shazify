angular.module('Shazam2Spotify').factory('TagsService', function($timeout, BackgroundService, LoginService) {
	// Tags list : http://stackoverflow.com/a/18569690/1160800

	var TagsService = {
		list: function() { return BackgroundService.Tags.list; },
		updating: function() { return BackgroundService.updating; },
		updateTags: function(callback) {
			if(TagsService.updating()) {
				/*$timeout(function() {
					TagsService.updateTags(callback);
				}, 2000);*/

				return;
			}

			LoginService.checkLogin(function(status) {
				if(status === false) {
					return callback(new Error('Login error'));
				}

				BackgroundService.updateTags(function(err) {
					if(err && err == 'update_already_in_progress') {
						err = null;
					}

					$timeout(function() {
						callback(err);
					}, 0);
				});
			});
		}
	};
	
	return TagsService;
});