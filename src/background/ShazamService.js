(function(ChromeHelper, Logger){
	var Shazam = {
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

		getTags: function(lastUpdate, callback) {
			Logger.info('[Shazam] Downloading tags history...');
			$.get('https://www.shazam.com/myshazam/download-history')
				.done(function(data) {
					if(data) {
						Logger.info('[Shazam] Parsing tags...');

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

		parseTags: function(lastUpdate, data, callback) {
			var tags = [];

			$(data).find('tr').each(function() {
				if($('td', this).length == 0) {
					return;
				}

				var date = new Date($('td.time', this).text());

				if(date > lastUpdate) {
					var tag = {
						name: $('td:nth-child(1) a', this).text().trim(),
						artist: $('td:nth-child(2)', this).text().trim(),
						date: date
					};

					tags.push(tag);
				}
			});

			callback(null, tags);
		}
		
	};

	window.s2s.Shazam = Shazam;
})(window.s2s.ChromeHelper, window.s2s.Logger);