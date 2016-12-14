(function(StorageHelper, Logger, ChromeHelper, Spotify, Shazam, Tags){
	var UpdateService = {
		update: function(initVersionTxt, finalVersionTxt) {
      // Block tags update while updating extention
      s2s.updatingApp = true;

      var initVersionParts = initVersionTxt.split('.');
      var finalVersionParts = finalVersionTxt.split('.');

      initVersionTxt = '';
      finalVersionTxt = '';
			
      // Split at each point and make sure each part has a length of 2
      initVersionParts.forEach(function(part) {
        if(part.length < 2) {
          part = '0'+ part;
        }

        initVersionTxt += part;
      });

      finalVersionParts.forEach(function(part) {
        if(part.length < 2) {
          part = '0'+ part;
        }

        finalVersionTxt += part;
      });

			var initVersion = parseInt(initVersionTxt);
			var finalVersion = parseInt(finalVersionTxt);

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

          s2s.updatingApp = false;
				});
			} else {
				Logger.info('[Updater] No update script defined to go from v'+ initVersionTxt +' to v'+ finalVersionTxt +'.');
        s2s.updatingApp = false;
			}
		},

		openUpdatePage: function(version) {
        	var supportedLocales = ['en', 'fr'];
        	var locale = chrome.i18n.getMessage('@@ui_locale');
        	locale = (supportedLocales.indexOf(locale) != -1) ? locale : supportedLocales[0];

        	chrome.tabs.create({'url': chrome.extension.getURL('static/update-'+ version +'-'+ locale +'.html'), 'selected': true});
		},

    /*
      Use full version number, example :
        v0.4.0  -> 00.04.00 -> 400
        v0.4.2  -> 00.04.02 -> 402
        v0.4.15 -> 00.04.15 -> 415
        v1.3.4  -> 01.03.04 -> 10304
    */
		_updates: [
			{'version': 20, 'perform': function(callback) {
		    Logger.info('[Update] Cleaning extension\'s background data.');

				var popups = chrome.extension.getViews({type: 'popup'});
        if(popups && popups.length) {
        	popups[0].window.close();
        }

        ChromeHelper.clearStorage();

        // Clear cached data from background script
        Tags.data.clearCache();
        Spotify.data.clearCache();

        // Reload tags, will reset list & lastUpdate
        Tags.load();

        UpdateService.openUpdatePage('0.2.0');

        callback();
			}},
			{'version': 23, 'perform': function(callback) {
		 		UpdateService.openUpdatePage('0.2.3');

        callback();
			}},
      // v0.04.00
			{'version': 400, 'perform': function(callback) {
				Logger.info('[Update] Moving tags from local storage to indexedDB...');

				var popups = chrome.extension.getViews({type: 'popup'});
        if(popups && popups.length) {
        	popups[0].window.close();
        }

        function onceDone(lastUpdate) {
          Tags.data.clearCache();
          chrome.storage.local.clear();  // Clear local storage, as Tags were stored only locally

          Tags.data.set({ 'lastUpdate': lastUpdate }, function() {
            Tags.load();

            UpdateService.openUpdatePage('0.4.0');

            return callback();
          });
        }

        function saveTag(tag, cb) {
          Logger.info('[Update] Saving tag '+ tag.shazamId +' to DB...');

          Tags.db.put(tag).then(function() {
            return cb();
          }).catch(function(reason) {
            return cb(reason);
          });
        }

        var oldTagsStorage = new StorageHelper('Tags', 'local');
        oldTagsStorage.get(['tagsList', 'lastUpdate'], function(items) {
          if(items.tagsList) {
            async.eachLimit(items.tagsList, 5, function(oldTag, cbe) {
              Logger.info('[Update] Moving tag '+ oldTag.shazamId +' to DB...');

              if(!oldTag.spotifyId) {
                return saveTag(oldTag, cbe);
              }

              Logger.info('[Update] Getting details from Spotify API for '+ oldTag.shazamId +'...');

              // We need to fetch data from Spotify to get new properties (preview_url, etc)
              Spotify.getTrack(oldTag.spotifyId, function(err, track) {
                if(err) {
                  Logger.error(err);
                  return saveTag(oldTag, cbe);
                }

                oldTag = Tags.setSpotifyInfosToTag(oldTag, track);

                return saveTag(oldTag, cbe);
              });
            }, function(err) {
              if(err) {
                Logger.error(err);
                Logger.error('[Update] Error moving tags from storage to indexedDB : '+ err +'.');
              }

              return onceDone(items.lastUpdate);
            });
          } else {
            return onceDone(items.lastUpdate);
          }
        });
			}}
		]
	};

	window.s2s.UpdateService = UpdateService;
})(window.s2s.StorageHelper, window.s2s.Logger, window.s2s.ChromeHelper, window.s2s.Spotify, window.s2s.Shazam, window.s2s.Tags);