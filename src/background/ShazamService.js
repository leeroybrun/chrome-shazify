(function(StorageHelper, ChromeHelper, Tags, Logger, Spotify){
	var Shazam = {
		newTags: [],

		data: new StorageHelper('Shazam'),

		openLogin: function() {
			Logger.info('[Shazam] Opening login page...');
			ChromeHelper.focusOrCreateTab('https://www.shazam.com/myshazam');
		},

		loginStatus: function(callback) {
			$.get('https://www.shazam.com/fragment/myshazam')
				.done(function() {
					Logger.info('[Shazam] login status : logged.');
					callback(true);
				})
				.fail(function(jqXHR, textStatus) {
					if(jqXHR.status === 401) {
						Logger.info('[Shazam] login status : not logged (401).');
						Logger.error(textStatus);
						callback(false);
					} else {
						Logger.info('[Shazam] login status : logged.');
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
					Tags.save(function() {
						callback(error);
					});
				} else {
					Shazam.data.set({'lastTagsUpdate': (new Date()).toString()}, function() {
						Tags.save(function() {
							callback();
						});
					});
				}
			}

			Shazam.data.get('lastTagsUpdate', function(items) {
				var lastTagsUpdate = new Date(items.lastTagsUpdate) || new Date(0);
				lastTagsUpdate = (!isNaN(lastTagsUpdate.valueOf())) ? lastTagsUpdate : new Date(0);

				Logger.info('[Shazam] Updating tags since '+ lastTagsUpdate +'.');

				$.get('https://www.shazam.com'+ path)
					.done(function(data) {
						if(data && typeof data === 'object' && data.feed.indexOf('ms-no-tags') == -1) {
							var lastTagDate = new Date(parseInt($('<div/>').append(data.feed).find('article').last().find('.tl-date').attr('data-time')));

							Logger.info('[Shazam] Parsing tags for '+ path +'.');

							Shazam.parseTags(lastTagsUpdate, data.feed, function() {
								if(data.previous && data.feed.indexOf('ms-no-tags') == -1 && lastTagDate > lastTagsUpdate) {
									Logger.info('[Shazam] Tags parsed. Waiting 2s before next page...');
									setTimeout(function() {
										Shazam.updateTags(data.previous, callback);
									}, 2000);
								} else {
									Logger.info('[Shazam] All tags fetched.');
									saveTags(false);
								}
							});
						} else {
							Logger.info('[Shazam] All tags fetched.');
							saveTags(false);
						}
					})
					.fail(function(jqXHR, textStatus) {
						Logger.info('[Shazam] Tags fetch error : '+textStatus+'.');
						if(jqXHR.status === 401) {
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

					tag.query = Spotify.genQuery(tag.name, tag.artist);

					Tags.add(tag);
				}
			});

			callback();
		}
	};

	window.s2s.Shazam = Shazam;
})(window.s2s.StorageHelper, window.s2s.ChromeHelper, window.s2s.Tags, window.s2s.Logger, window.s2s.Spotify);