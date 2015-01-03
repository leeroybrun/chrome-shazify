(function(Logger, ChromeHelper, Spotify, Shazam, Tags){
	var UpdateService = {
		update: function(initVersionTxt, finalVersionTxt) {
			var rePoint = new RegExp('\\.', 'g');

			// TODO: handle versions 0.2.10 -> 210 -> bigger than 0.3.1 -> 31 !
			var initVersion = parseInt(initVersionTxt.replace(rePoint, ''));
			var finalVersion = parseInt(finalVersionTxt.replace(rePoint, ''));

			var startIndex = null;
			var endIndex = null;

			var updatesToApply = [];

			// If initVersion is the same or bigger than final, nothing to do...
			var shouldStop = initVersion >= finalVersion;

			for(var i = 0; i < UpdateService._updates.length && shouldStop === false; i++) {
				if(startIndex === null && UpdateService._updates[i].version > initVersion) {
					startIndex = i;
				}

				if(startIndex !== null && UpdateService._updates[i].version <= finalVersion) {
					endIndex = i;

					updatesToApply.push(UpdateService._updates[i]);
				}

				shouldStop = (startIndex !== null && endIndex !== null && UpdateService._updates[i].version >= finalVersion);
			}

			if(startIndex !== null && endIndex !== null) {
				Logger.info('[Updater] '+ (endIndex-startIndex+1) +' update scripts ('+startIndex+'->'+endIndex+') to call to go from v'+ initVersionTxt +' to v'+ finalVersionTxt +'.');

				async.eachSeries(updatesToApply, function(update, cbe) {
					Logger.info('[Updater] Calling update script for v'+update.version);
					update.perform(function(err) {
						if(err) { Logger.error(err); }

						cbe();
					});
				}, function() {
					Logger.info('[Updater] All update scripts applied !');
				});
			} else {
				Logger.info('[Updater] No update script defined to go from v'+ initVersionTxt +' to v'+ finalVersionTxt +'.');
			}
		},

		openUpdatePage: function(version) {
        	var supportedLocales = ['en', 'fr'];
        	var locale = chrome.i18n.getMessage('@@ui_locale');
        	locale = (supportedLocales.indexOf(locale) != -1) ? locale : supportedLocales[0];

        	chrome.tabs.create({'url': chrome.extension.getURL('static/update-'+ version +'-'+ locale +'.html'), 'selected': true});
		},

		_updates: [
			{'version': 20, 'perform': function(callback) {
		        s2s.Logger.info('[Update] Cleaning extension\'s background data.');

				var popups = chrome.extension.getViews({type: 'popup'});
		        if(popups && popups.length) {
		        	popups[0].window.close();
		        }

		        ChromeHelper.clearStorage();

		        // Clear cached data from background script
		        Tags.data.clearCache();
		        Spotify.data.clearCache();

		        // Reload tags, will reset list & lastUpdate
		        s2s.Tags.load();

		        UpdateService.openUpdatePage('0.2.0');

		        callback();
			}},
			{'version': 23, 'perform': function(callback) {
		 		UpdateService.openUpdatePage('0.2.3');

		        callback();
			}}
		]
	};

	window.s2s.UpdateService = UpdateService;
})(window.s2s.Logger, window.s2s.ChromeHelper, window.s2s.Spotify, window.s2s.Shazam, window.s2s.Tags);