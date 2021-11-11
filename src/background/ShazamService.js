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

			chrome.tabs.insertCSS(tabId, { 
				file: 'contentscripts/shazam.css',
				runAt: 'document_start'
			});

			chrome.tabs.executeScript(tabId, { 
				file: 'contentscripts/shazamLocalStorage.js',
				runAt: 'document_end'
			});

			function receiveMessage(request, sender, sendResponse) {
				// inid is the old Shazam way to get tracks from their API
	    		if(request.shazamLocalStorageInid) {
					var inid = JSON.parse(request.shazamLocalStorageInid);
	    			Shazam.setAndCheckInid(inid.data, function(isFine) {
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

				// The new way is using iCloud (CloudKit)
	    		if(request.shazamLocalStorageIcloud) {
					var icloud = JSON.parse(request.shazamLocalStorageIcloud);
					if (icloud.data && icloud.data.token) {
						Shazam.setAndCheckIcloudToken(icloud.data.token, function(isFine) {
							sendResponse({ isFine: isFine });
	
							if(!isFine) {
								Shazam.data.set({ 'icloudToken': null });
								Logger.info('[Shazam] iCloud token returned is not fine...');
							} else {
								Logger.info('[Shazam] iCloud token returned is fine!');
								chrome.runtime.onMessage.removeListener(receiveMessage);
							}
						});
					} else {
						sendResponse({ isFine: false });
					}
	    		}

				// ... or Firebase
	    		if(request.shazamLocalStorageFirebase) {
					console.log('Tokens received for Firebase:', request.shazamLocalStorageFirebase);
					if (request.shazamLocalStorageFirebase.idToken || request.shazamLocalStorageFirebase.refreshToken) {
						Shazam.setAndCheckFirebaseTokens(request.shazamLocalStorageFirebase, function(isFine) {
							sendResponse({ isFine: isFine });
	
							if(!isFine) {
								Shazam.data.set({ 
									'firebaseRefreshToken': null,
									'firebaseIdToken': null,
									'firebaseUserId': null
								});
								Logger.info('[Shazam] Firebase token returned is not fine...');
							} else {
								Logger.info('[Shazam] Firebase token returned is fine!');
								chrome.runtime.onMessage.removeListener(receiveMessage);
							}
						});
					} else {
						sendResponse({ isFine: false });
					}
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

		setAndCheckIcloudToken: function(token, callback) {
			callback = callback || function(){};

			Shazam.data.set({
				'icloudToken': token
			}, function() {
				return Shazam.loginStatus(callback);
			});
		},

		setAndCheckFirebaseTokens: function(tokens, callback) {
			callback = callback || function(){};

			Shazam.data.set({
				'firebaseIdToken': tokens.idToken || null,
				'firebaseRefreshToken': tokens.refreshToken || null,
				'firebaseUserId': tokens.userId || null
			}, function() {
				return Shazam.loginStatus(callback);
			});
		},

		// Open the MyShazam login page
		openLogin: function() {
			Logger.info('[Shazam] Opening login page...');
			ChromeHelper.focusOrCreateTab('https://www.shazam.com/myshazam', function(tab, reloaded) {
				// Will inject content script to Shazam page and wait for the inid to be available
				// When available, will set and check it


				if (reloaded) {
					// If tab was reloaded, we wait before injecting
					setTimeout(function() {
						Shazam.getInid(tab.id);
					}, 2000);
				} else {
					Shazam.getInid(tab.id);
				}
			});
		},

		// Check current login status on MyShazam
		loginStatus: function(callback) {
			Shazam.data.get(['inid', 'icloudToken', 'firebaseRefreshToken', 'firebaseIdToken', 'firebaseUserId'], function(items) {
				if(!items.inid && !items.icloudToken && (!items.firebaseRefreshToken || !items.firebaseIdToken)) {
					Logger.info('[Shazam] login status : np inid, iCloud or Firebase token stored.');
					return callback(false);
				}

				if (items.inid) {
					return Shazam.checkLoginStatusFromInitd(items.inid, callback);
				}

				if (items.icloudToken) {
					return Shazam.checkLoginStatusFromIcloudToken(items.icloudToken, callback);
				}

				if (items.firebaseRefreshToken || items.firebaseIdToken) {
					return Shazam.checkLoginStatusFromFirebaseTokens({
						refreshToken: items.firebaseRefreshToken,
						idToken: items.firebaseIdToken,
						userId: items.firebaseUserId
					}, callback);
				}
			});
		},

		checkLoginStatusFromInitd: function(inid, callback) {
			Logger.info('[Shazam] Checking loging status from inid.');

			$.get('https://www.shazam.com/discovery/v4/fr/CH/web/-/tag/'+ inid +'?limit=20')
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
		},

		checkLoginStatusFromIcloudToken: function(icloudToken, callback) {
			Logger.info('[Shazam] Checking loging status from iCloud token.');

			$.ajax({
				url: 'https://api.shazify.ch/cloudkit/zones/list',
				method: 'POST',
				dataType: "json",
				data: {
					token: icloudToken
				}
			})
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
		},

		checkLoginStatusFromFirebaseTokens: function(tokens, callback) {
			Logger.info('[Shazam] Checking loging status from Firebase tokens.');

			$.ajax({
				url: 'https://securetoken.googleapis.com/v1/token?key=AIzaSyCyLYwyWBmSKLkMPPbBMkE7CPejfOKhsiU',
				method: 'POST',
				contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
				dataType: 'json',
				data: {
					grant_type: 'refresh_token',
					refresh_token: tokens.refreshToken
				}
			})
				.done(function(data) {
					Logger.info('[Shazam] login status : logged.');
					Logger.info('[Shazam] updating Firebase tokens in storage.');

					var dataToSave = {};

					if (data.refresh_token) {
						dataToSave.firebaseRefreshToken = data.refresh_token;
					}

					if (data.id_token) {
						dataToSave.firebaseIdToken = data.id_token;
					}

					if (data.user_id) {
						dataToSave.firebaseUserId = data.user_id;
					}

					Shazam.data.set(dataToSave, function() {
						return callback(true);
					});
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
		},

		// Download tags history, parse it and return a tags array
		getTags: function(lastUpdate, callback) {
			Logger.info('[Shazam] Getting list of tags...');
			Shazam.data.get(['inid', 'icloudToken', 'firebaseRefreshToken', 'firebaseIdToken', 'firebaseUserId'], function(items) {
				if(!items.inid && !items.icloudToken && !items.firebaseUserId && !items.firebaseIdToken) {
					Logger.error('[Shazam] cannot get tags, seems not to be logged in.');
					return callback(new Error('Cannot get tags, seems not to be logged in.'));
				}

				if (items.inid) {
					return Shazam.getTagsFromInid(items.inid, lastUpdate, callback);
				}

				if (items.icloudToken) {
					return Shazam.getTagsFromIcloud(items.icloudToken, lastUpdate, callback);
				}

				if (items.firebaseUserId && items.firebaseIdToken) {
					return Shazam.getTagsFromFirebase(items.firebaseUserId, items.firebaseIdToken, lastUpdate, callback);
				}
			});
		},

		getTagDetailsFromShazam: function(tagId, callback) {
			$.getJSON('https://www.shazam.com/discovery/v5/en-US/CH/web/-/track/'+ tagId +'?shazamapiversion=v3&video=v3')
				.done(function(data) {
					if(data && data.title && data.key) {
						var tag = {
							shazamId: data.key,
							name: data.title,
							artist: data.subtitle || null
						};

						var videoApiUrl = null;
						data.sections.forEach(function(section) {
							if (section.type == 'VIDEO' && section.youtubeurl) {
								videoApiUrl = section.youtubeurl;
							}
						});

						if (videoApiUrl) {
							return Shazam.getVideoUrlFromShazam(videoApiUrl, function(error, videoUrl) {
								if (!error && videoUrl) {
									tag.videoUrl = videoUrl;
								}
								
								return callback(null, tag);
							});
						} else {
							return callback(null, tag);
						}
					} else {
						Logger.error('[Shazam] Cannot get tag ID '+ tagId +' from Shazam.');
						Logger.error('[Shazam] Data returned : "'+ data +'"');

						return callback(new Error('Cannot get tag ID '+ tagId +' from Shazam.'));
					}
				})
				.fail(function(jqXHR, textStatus) {
					Logger.info('[Shazam] Tags fetch error : '+textStatus+'.');

					return callback(new Error('Tags fetch error : '+textStatus));
				});
		},

		getVideoUrlFromShazam: function(videoApiUrl, callback) {
			$.getJSON(videoApiUrl)
				.done(function(data) {
					if(data && data.actions) {
						var videoUrl = null;
						data.actions.forEach(function(action) {
							if (action.name == 'video:youtube' && action.uri) {
								videoUrl = action.uri;
							}
						});

						return callback(null, videoUrl);
					} else {
						Logger.error('[Shazam] Cannot get tag video from Shazam.');
						Logger.error('[Shazam] Data returned : "'+ data +'"');

						return callback(new Error('Cannot get tag video from Shazam.'));
					}
				})
				.fail(function(jqXHR, textStatus) {
					Logger.info('[Shazam] Tag video fetch error : '+textStatus+'.');

					return callback(new Error('Tag video fetch error : '+textStatus));
				});
		},

		getTagsFromInid: function(inid, lastUpdate, callback, token) {
			token = token || null;

			$.getJSON('https://www.shazam.com/discovery/v4/fr/CH/web/-/tag/'+ inid +'?limit=200'+ ((token) ? '&token='+ token : ''))
				.done(function(data) {
					if(data && data.tags) {
						Shazam.parseTagsFromShazam(lastUpdate, data, function(error, tags) {
							if(error) {
								Logger.error('[Shazam] error parsing tags: '+ error +'.');
								return callback(error);
							}

							if(!tags || !tags.length) {
								return callback(null, []);
							}

							var lastTagDate = tags[tags.length-1].date;

							// If Shazam API returned a token, it's that we still have tags we can fetch
							if(data.token && lastTagDate >= lastUpdate) {
								Logger.info('[Shazam] more tags to fetch, calling getTags again.');
								// Recursive call to get all tags since the last update
								Shazam.getTagsFromInid(inid, lastUpdate, function(error, newTags) {
									if(error) {
										Logger.error('[Shazam] error getting tags: '+ error +'.');
										return callback(error);
									}

									return callback(null, tags.concat(newTags));
								}, data.token);
							} else {
								return callback(null, tags);
							}
						});
					} else {
						Logger.error('[Shazam] Cannot get tags from Shazam.');
						Logger.error('[Shazam] Data returned : "'+ data +'"');

						return callback(new Error('Cannot get tags from Shazam.'));
					}
				})
				.fail(function(jqXHR, textStatus) {
					Logger.info('[Shazam] Tags fetch error : '+textStatus+'.');

					return callback(new Error('Tags fetch error : '+textStatus));
				});
		},

		getTagsFromIcloud: function(icloudToken, lastUpdate, callback, continuationMarker) {
			continuationMarker = continuationMarker || null;

			var data = {
				"resultsLimit": 250,
				"zoneID": {
					"zoneName": "shazam-library",
					"zoneType": "REGULAR_CUSTOM_ZONE"
				},
				"numbersAsStrings": true,
				"zoneWide": false,
				"query": { 
					"recordType": "Track",
					"filterBy":[],
					"sortBy": [{
						"ascending": false,
						"fieldName": "Date"
					}]
				}
			};

			if (continuationMarker) {
				data.continuationMarker = continuationMarker;
			}

			$.ajax({
				url: 'https://api.shazify.ch/cloudkit/records/query',
				method: 'POST',
				dataType: "json",
				data: {
					token: icloudToken,
					data: data
				}
			})
				.done(function(data) {
					if(data && data.records) {
						Logger.info('[Shazam] Parsing tags...');
						Logger.info('[Shazam] Start parsing of '+ data.records.length +' elements...');

						Shazam.parseTagsFromIcloud(lastUpdate, data.records, function(error, tags) {
							if(error) {
								Logger.error('[Shazam] error parsing tags: '+ error +'.');
								return callback(error);
							}

							if(!tags || !tags.length) {
								return callback(null, []);
							}

							var lastTagDate = tags[tags.length-1].date;

							// If Shazam API returned a continuationMarker, it's that we still have tags we can fetch
							if(data.continuationMarker && lastTagDate >= lastUpdate) {
								Logger.info('[Shazam] more tags to fetch, calling getTags again.');
								// Recursive call to get all tags since the last update
								Shazam.getTagsFromIcloud(icloudToken, lastUpdate, function(error, newTags) {
									if(error) {
										Logger.error('[Shazam] error getting tags: '+ error +'.');
										return callback(error);
									}

									return callback(null, tags.concat(newTags));
								}, data.continuationMarker);
							} else {
								return callback(null, tags);
							}
						});
					} else {
						Logger.error('[Shazam] Cannot get tags from Shazam (iCloud).');
						Logger.error('[Shazam] Data returned : "'+ data +'"');

						return callback(new Error('Cannot get tags from Shazam.'));
					}
				})
				.fail(function(jqXHR, textStatus) {
					Logger.info('[Shazam] Tags fetch error : '+textStatus+'.');

					return callback(new Error('Tags fetch error : '+textStatus));
				});
		},

		getTagsFromFirebase: function(userId, idToken, lastUpdate, callback, nextPageToken) {
			nextPageToken = nextPageToken || null;

			var data = {
				//pageSize: 2, // This is just to test pagination
				orderBy: 'tagTime desc'
			};

			if (nextPageToken) {
				data.pageToken = nextPageToken;
			}

			$.ajax({
				url: 'https://firestore.googleapis.com/v1/projects/api-project-1020531999467/databases/(default)/documents/users/'+ userId +'/tags',
				method: 'GET',
				dataType: 'json',
				data: data,
				headers: {
					'Authorization': 'Bearer '+ idToken
				}
			})
				.done(function(data) {
					if(data && data.documents) {
						Logger.info('[Shazam] Parsing tags...');
						Logger.info('[Shazam] Start parsing of '+ data.documents.length +' elements...');

						Shazam.parseTagsFromFirebase(lastUpdate, data.documents, function(error, tags) {
							if(error) {
								Logger.error('[Shazam] error parsing tags: '+ error +'.');
								return callback(error);
							}

							if(!tags || !tags.length) {
								return callback(null, []);
							}

							var lastTagDate = tags[tags.length-1].date;

							// If Firebase API returned a nextPageToken, it's that we still have tags we can fetch
							if(data.nextPageToken && lastTagDate >= lastUpdate) {
								Logger.info('[Shazam] more tags to fetch, calling getTags again.');
								// Recursive call to get all tags since the last update
								Shazam.getTagsFromFirebase(userId, idToken, lastUpdate, function(error, newTags) {
									if(error) {
										Logger.error('[Shazam] error getting tags: '+ error +'.');
										return callback(error);
									}

									return callback(null, tags.concat(newTags));
								}, data.nextPageToken);
							} else {
								return callback(null, tags);
							}
						});
					} else {
						Logger.error('[Shazam] Cannot get tags from Shazam (Firebase).');
						Logger.error('[Shazam] Data returned : "'+ data +'"');

						return callback(new Error('Cannot get tags from Shazam (Firebase).'));
					}
				})
				.fail(function(jqXHR, textStatus) {
					Logger.info('[Shazam] (Firebase) Tags fetch error : '+textStatus+'.');

					return callback(new Error('Tags fetch error (Firebase) : '+textStatus));
				});
		},

		// Parse tags from tags history
		parseTagsFromShazam: function(lastUpdate, data, callback) {
			Logger.info('[Shazam] Parsing tags...');

			var tags = [];
			var stopParsing = false;

			Logger.info('[Shazam] Start parsing of '+ data.tags.length +' elements...');

			var length = data.tags.length;
			for(var i = 0; i < length && stopParsing === false; i++) {
				var tagDate = new Date(data.tags[i].timestamp);
				var tagName = data.tags[i].track.heading.title;
				var tagArtist = data.tags[i].track.heading.subtitle;

				if(tagDate > lastUpdate) {
					if(tagName && tagArtist) {
						var tag = {
							shazamId: data.tags[i].tagid,
							name: tagName,
							artist: tagArtist,
							date: tagDate
						};

						tags.push(tag);
					}
				} else {
					// Tag's date is lower than last update date = the following tags were already fetched in previous updates
					Logger.info('[Shazam] Stop parsing, we reached the last tag not already fetched ('+ tagDate +'/'+ lastUpdate +').');
					stopParsing = true;
				}
			}

			return callback(null, tags);
		},

		// Parse tags from iCloud storage (recursive function)
		parseTagsFromIcloud: function(lastUpdate, records, callback, i, tags) {
			i = i || 0;
			tags = tags || [];

			if (i >= records.length) {
				return callback(null, tags);
			}

			if (!records[i].fields || !records[i].fields.Date || !records[i].fields.ShazamKey) {
				// Skip this tag
				return Shazam.parseTagsFromIcloud(lastUpdate, records, callback, i+1, tags);
			}

			var tagDate = new Date(records[i].fields.Date.value);
			var tagShazamId = records[i].fields.ShazamKey.value;

			if(tagDate > lastUpdate) {
				// If tag title and subtitle not in storage, get it from Shazam API
				if (!records[i].fields.Title || !records[i].fields.Subtitle) {
					return Shazam.getTagDetailsFromShazam(tagShazamId, function(error, tag) {
						if (error) {
							// Skip this tag
							return Shazam.parseTagsFromIcloud(lastUpdate, records, callback, i+1, tags);
						}

						tag.date = tagDate;
						tags.push(tag);

						console.log('Parsed from iCloud', tag);

						return Shazam.parseTagsFromIcloud(lastUpdate, records, callback, i+1, tags);
					});
				}

				var tag = {
					shazamId: tagShazamId,
					name: records[i].fields.Title.value,
					artist: records[i].fields.Subtitle.value,
					date: tagDate
				};
				tags.push(tag);

				console.log('Parsed from iCloud', tag);

				return Shazam.parseTagsFromIcloud(lastUpdate, records, callback, i+1, tags);
			} else {
				// Tag's date is lower than last update date = the following tags were already fetched in previous updates
				Logger.info('[Shazam] Stop parsing, we reached the last tag not already fetched ('+ tagDate +'/'+ lastUpdate +').');
				return callback(null, tags);
			}
		},

		// Parse tags from Firebase storage (recursive function)
		parseTagsFromFirebase: function(lastUpdate, documents, callback, i, tags) {
			i = i || 0;
			tags = tags || [];

			if (i >= documents.length) {
				return callback(null, tags);
			}

			if (!documents[i].fields || !documents[i].fields.tagTime || !documents[i].fields.tagTime.timestampValue || !documents[i].fields.trackKey || !documents[i].fields.trackKey.stringValue) {
				// Skip this tag
				return Shazam.parseTagsFromFirebase(lastUpdate, documents, callback, i+1, tags);
			}

			var tagDate = new Date(documents[i].fields.tagTime.timestampValue);
			var tagShazamId = documents[i].fields.trackKey.stringValue;

			if(tagDate > lastUpdate) {
				return Shazam.getTagDetailsFromShazam(tagShazamId, function(error, tag) {
					if (error) {
						// Skip this tag
						return Shazam.parseTagsFromFirebase(lastUpdate, documents, callback, i+1, tags);
					}

					tag.date = tagDate;
					tags.push(tag);

					console.log('Parsed from Firebase', tag);

					return Shazam.parseTagsFromFirebase(lastUpdate, documents, callback, i+1, tags);
				});
			} else {
				// Tag's date is lower than last update date = the following tags were already fetched in previous updates
				Logger.info('[Shazam] Stop parsing, we reached the last tag not already fetched ('+ tagDate +'/'+ lastUpdate +').');
				return callback(null, tags);
			}
		},
	};

	window.s2s.Shazam = Shazam;
})(window.s2s.ChromeHelper, window.s2s.Logger, window.s2s.StorageHelper);