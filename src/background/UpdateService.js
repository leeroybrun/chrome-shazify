(function(Logger){
	var UpdateService = {
		update: function(initVersionTxt, finalVersionTxt) {
			var rePoint = new RegExp('\\.', 'g');

			var initVersion = parseInt(initVersionTxt.replace(rePoint, ''));
			var finalVersion = parseInt(finalVersionTxt.replace(rePoint, ''));

			var startIndex = null;
			var endIndex = null;

			console.log(UpdateService._updates);

			for(var i = 0; i < UpdateService._updates.length && (startIndex === null || endIndex === null); i++) {
				console.log(i, UpdateService._updates[i].version, initVersion, finalVersion, startIndex, endIndex);

				if(startIndex === null && UpdateService._updates[i].version > initVersion) {
					startIndex = i;
				}

				console.log(i, UpdateService._updates[i].version, initVersion, finalVersion, startIndex, endIndex);

				if(startIndex !== null && UpdateService._updates[i].version <= finalVersion) {
					endIndex = i;
				}

				console.log(i, UpdateService._updates[i].version, initVersion, finalVersion, startIndex, endIndex);
			}

			if(startIndex !== null && endIndex !== null) {
				Logger.info('[Updater] '+ (endIndex-startIndex+1) +' update scripts to call to go from v'+ initVersionTxt +' to v'+ finalVersionTxt +'.');
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
			{'version': 10, 'update': function(callback) {

			}},
			{'version': 20, 'update': function(callback) {

			}},
			{'version': 30, 'update': function(callback) {

			}}
		]
	};

	window.s2s.UpdateService = UpdateService;
})(window.s2s.Logger);