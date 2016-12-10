(function(ChromeHelper, Logger, StorageHelper){
	/*
		Shazam service

		Handle login to Shazam, getting auth token (with a content script) and calling API to fetch tags
		
	*/
	var Shazam = {
		// Storage for Shazam data (auth token, etc)
		data: new StorageHelper('Shazam', 'sync'), // New storage, synced with other Chrome installs

		receivePageLocalStorage: function (pageLocalStorage) {
			console.log('pageLocalStorage', pageLocalStorage);
		},

		getInid: function(tabId) {
			listenerAdded = (typeof listenerAdded !== 'undefined') ? listenerAdded : false;

			Logger.info('[Shazam] Injecting content script to get "inid" from Local Storage...');

			chrome.tabs.executeScript(tabId, { 
				file: 'contentscripts/shazamLocalStorage.js',
				runAt: 'document_end'
			});

			function receiveMessage(request, sender, sendResponse) {
	    		if(request.shazamLocalStorage && request.shazamLocalStorage.inid) {
	    			Shazam.setAndCheckInid(request.shazamLocalStorage.inid, function(isFine) {
	    				sendResponse({ isFine: isFine });

	    				if(!isFine) {
	    					Shazam.data.set({ 'inid': null });
							Logger.info('[Shazam] "inid" returned is not fine...');
						} else {
							Logger.info('[Shazam] "inid" returned is fine!');
							chrome.runtime.onMessage.removeListener(receiveMessage);
						}
					});
	    		}

	    		// Let us use "sendResponse" asynchronously
	    		return true;
    		}

			chrome.runtime.onMessage.addListener(receiveMessage);
		},

		setAndCheckInid: function(inid, callback) {
			callback = callback || function(){};

			Shazam.data.set({
				'inid': inid
			}, function() {
				return Shazam.loginStatus(callback);
			});
		},

		// Open the MyShazam login page
		openLogin: function() {
			Logger.info('[Shazam] Opening login page...');
			ChromeHelper.focusOrCreateTab('https://www.shazam.com/myshazam', function(tab) {
				// Will inject content script to Shazam page and wait for the inid to be available
				// When available, will set and check it
				Shazam.getInid(tab.id);
			});
		},

		// Check current login status on MyShazam
		loginStatus: function(callback) {
			Shazam.data.get('inid', function(items) {
				if(!items.inid) {
					Logger.info('[Shazam] login status : np inid stored.');
					return callback(false);
				}

				$.get('https://www.shazam.com/discovery/v4/fr/CH/web/-/tag/'+ items.inid +'?limit=20')
					.done(function() {
						Logger.info('[Shazam] login status : logged.');
						return callback(true);
					})
					.fail(function(jqXHR, textStatus) {
						if(jqXHR.status === 401) {
							Logger.info('[Shazam] login status : not logged (401).');
							Logger.error(textStatus);
							return callback(false);
						} else if(jqXHR.status === 456) {
							Logger.info('[Shazam] login status : error (456).');
							Logger.error(textStatus);
							return callback(false);
						}

						Logger.info('[Shazam] login status : error.');
						Logger.error(textStatus);
						return callback(false);
					});
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
})(window.s2s.ChromeHelper, window.s2s.Logger, window.s2s.StorageHelper);