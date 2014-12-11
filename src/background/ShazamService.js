(function(ChromeHelper, Logger){
	var Shazam = {
		// Open the MyShazam login page
		openLogin: function() {
			Logger.info('[Shazam] Opening login page...');
			ChromeHelper.focusOrCreateTab('https://www.shazam.com/myshazam');
		},

		// Check current login status on MyShazam
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

		// Download tags history, parse it and return a tags array
		getTags: function(lastUpdate, callback) {
			Logger.info('[Shazam] Downloading tags history...');
			$.get('https://www.shazam.com/myshazam/download-history')
				.done(function(data) {
					if(data) {
						Shazam.parseTags(lastUpdate, data, callback);
					} else {
						Logger.error('[Shazam] Cannot download Shazam history.');
						Logger.error('[Shazam] Data returned : "'+ data +'"');

						return callback(new Error('Cannot download Shazam history.'));
					}
				})
				.fail(function(jqXHR, textStatus) {
					Logger.info('[Shazam] Tags fetch error : '+textStatus+'.');

					return callback(new Error('Tags fetch error : '+textStatus));
				});
		},

		// Parse tags from tags history
		parseTags: function(lastUpdate, data, callback) {
			Logger.info('[Shazam] Parsing tags...');

			var tags = [];
			var stopParsing = false;
			var tagsEl = $(data).find('tr');

			Logger.info('[Shazam] Start parsing of '+ tagsEl.length +' elements...');

			for(var i = 0; i < tagsEl.length && stopParsing === false; i++) {
				if($('td', tagsEl[i]).length === 0) {
					continue;
				}

				var date = new Date($('td.time', tagsEl[i]).text());

				if(date > lastUpdate) {
					var idMatch = (new RegExp('t([0-9]+)', 'g')).exec($('td:nth-child(1) a', tagsEl[i]).attr('href'));
					if(!idMatch) {
						continue;
					}

					var tag = {
						shazamId: idMatch[1],
						name: $('td:nth-child(1) a', tagsEl[i]).text().trim(),
						artist: $('td:nth-child(2)', tagsEl[i]).text().trim(),
						date: date
					};

					tags.push(tag);
				} else {
					// Tag's date is lower than last update date = the following tags were already fetched in previous updates
					Logger.info('[Shazam] Stop parsing, we reached the last tag not already fetched.');
					stopParsing = true;
				}
			}

			callback(null, tags);
		}
		
	};

	window.s2s.Shazam = Shazam;
})(window.s2s.ChromeHelper, window.s2s.Logger);