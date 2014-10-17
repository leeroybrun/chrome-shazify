angular.module('Shazam2Spotify').factory('ShazamService', function(ChromeHelper, StorageHelper, TagsService, SpotifyService, $timeout, $http) {
	var Shazam = {
		newTags: [],

		data: new StorageHelper('Shazam'),

		openLogin: function() {
			ChromeHelper.focusOrCreateTab('https://www.shazam.com/myshazam');
		},

		loginStatus: function(callback) {
			$http.get('https://www.shazam.com/fragment/myshazam')
				.success(function() {
					callback(true);
				})
				.error(function(data, status) {
					if(status === 401) {
						callback(false);
					} else {
						callback(true);
					}
				});
		},

		updateTags: function(path, callback) {
			if(typeof callback === 'undefined' && typeof path === 'function') {
				callback = path;
				path = null;
			}

			callback = callback || function(){};
			path = path || '/fragment/myshazam';

			function saveTags(error) {
				if(error) {
					TagsService.save(function() {
						callback(error);
					});
				} else {
					Shazam.data.set({'lastTagsUpdate': (new Date()).toString()}, function() {
						TagsService.save(function() {
							callback();
						});
					});
				}
			}

			Shazam.data.get('lastTagsUpdate', function(items) {
				var lastTagsUpdate = new Date(items.lastTagsUpdate) || new Date(0);
				lastTagsUpdate = (!isNaN(lastTagsUpdate.valueOf())) ? lastTagsUpdate : new Date(0);

				$http.get('https://www.shazam.com'+ path)
					.success(function(data) {
						if(data && typeof data === 'object' && data.feed.indexOf('ms-no-tags') == -1) {
							var lastTagDate = new Date(parseInt($('<div/>').append(data.feed).find('article').last().find('.tl-date').attr('data-time')));

							Shazam.parseTags(lastTagsUpdate, data.feed, function() {
								if(data.previous && data.feed.indexOf('ms-no-tags') == -1 && lastTagDate > lastTagsUpdate) {
									$timeout(function() {
										Shazam.updateTags(data.previous, callback);
									}, 2000);
								} else {
									saveTags(false);
								}
							});
						} else {
							saveTags(false);
						}
					})
					.error(function(data, status) {
						if(status === 401) {
							saveTags(true);
						} else {
							saveTags(false);
						}
					});
			});
		},

		parseTags: function(lastTagsUpdate, data, callback) {
			$('<div/>').append(data).find('article').each(function() {
				var date = parseInt($('.tl-date', this).attr('data-time'));

				if(new Date(date) > lastTagsUpdate) {
					var tag = {
						id: $(this).attr('data-track-id'),
						name: $('[data-track-title]', this).text().trim(),
						artist: $('[data-track-artist]', this).text().trim().replace(/^by /, ''),
						date: date,
						image: $('img[itemprop="image"]', this).attr('src')
					};

					tag.query = SpotifyService.genQuery(tag.name, tag.artist);

					TagsService.add(tag);
				}
			});

			callback();
		}
	};

	return Shazam;
});