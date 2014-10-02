angular.module('Shazam2Spotify').factory('ShazamService', function(ChromeHelper, StorageHelper, TagsService, $timeout, $http) {
	var Shazam = {
		data: new StorageHelper('Shazam'),

		openLogin: function() {
			chrome.runtime.sendMessage({action: 'Shazam.openLogin'});
		},

		loginStatus: function(callback) {
			chrome.runtime.sendMessage({action: 'Shazam.loginStatus'}, function(data) {
				callback(data.status);
			});
		},

		updateTags: function(callback) {
			Shazam.data.get('lastTagsUpdate', function(items) {
				var lastTagsUpdate = new Date(items.lastTagsUpdate) || new Date(0);
					lastTagsUpdate = (!isNaN(lastTagsUpdate.valueOf())) ? lastTagsUpdate : new Date(0);

				chrome.runtime.sendMessage({action: 'Shazam.updateTags', lastTagsUpdate: lastTagsUpdate}, function(data) {
					if(data.error) {
						callback(data.error, data.tags);
					} else {
						data.tags.forEach(function(tag) {
							TagsService.add(tag);
						});

						Shazam.data.set({'lastTagsUpdate': data.lastTagsUpdate.toString()}, function() {
							TagsService.save(function() {
								callback(error);
							});
						});
					}
				});
			});
		}
	};

	Shazam.data.get('tags', function(items) {
		Shazam.tags = items.tags;
	});

	return Shazam;
});