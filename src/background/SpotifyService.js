(function(Helper, StorageHelper, Logger){
	var Spotify = {
		api: {
			clientId: 'b0b7b50eac4642f482825c535bae2708',
			clientSecret: 'b3bc17ef4d964fccb63b1f37af9101f8'
		},

		// From a track name and artist, generate a query for Spotify search
		genQuery: function(track, artist) {
			var reSpaces = new RegExp(' ', 'g');
			var rePlus = /[\+]{2,}/g;

			return 'track:'+ track.replace(reSpaces, '+').replace(rePlus, '+') +' artist:'+ Helper.replaceAll(artist, 'Feat. ', '').replace(reSpaces, '+').replace(rePlus, '+');
		},

		// Get current user and playlist in cache or on Spotify
		getUserAndPlaylist: function(callback) {
			Spotify.data.get(['userId', 'playlistId'], function(items) {
				var userId = items.userId;
				var playlistId = items.playlistId;

				async.waterfall([
					function checkUserId(cb) {
						if(!userId) {
							Logger.info('[Spotify] No userId stored, need to fetch it.');

							Spotify.call({
								endpoint: '/v1/me',
								method: 'GET'
							}, function(err, data) {
								if(err) { Logger.error(err); return cb(err); }
								if(data && data.id) { Logger.error(data); return cb(new Error('Cannot get user ID')); }

								userId = data.id;

								Logger.info('[Spotify] User ID : '+ userId);

								cb();
							});
						} else {
							cb();
						}
					},

					function checkPlaylistId(cb) {
						if(!playlistId) {
							Logger.info('[Spotify] No playlistId stored, need to get or create one.');
							Spotify.playlist.getOrCreate(function(err, data) {
								if(data && data.id && !err) {
									playlistId = data.id;
									Logger.info('[Spotify] PlaylistId: '+ playlistId);
									cb();
								} else {
									Logger.error(err);
									cb(new Error('Error creating/getting playlist'));
								}
							});
						} else {
							cb();
						}
					}
				], function(err) {
					callback(err, userId, playlistId);
				});
			});
		},

		playlist: {
			name: chrome.i18n.getMessage('myTags'), // The playlist's name

			// Get id of existing playlist on Spotify or error if not found
			getExistingId: function(callback) {
				var playlistName = Spotify.playlist.name;

				Spotify.data.get(['userId', 'playlistId'], function(items) {
					var userId = items.userId;
					var playlistId = items.playlistId;

					if(playlistId) {
						return callback(null, playlistId);
					}

					Spotify.findInPagedResult({
						method: 'GET',
						endpoint: '/v1/users/'+ userId +'/playlists'
					}, function(data, cbFind) {
						var found = false;

						data.forEach(function(playlist) {
							if(playlist.name == playlistName) {
								found = playlist.id;
							}
						});

						cbFind(found);
					}, function(playlistId) {
						if(playlistId) {
							Spotify.data.set({playlistId: playlistId}, function() {
								callback(null, playlistId);
							});
						} else {
							callback(new Error('Playlist not found in Spotify.'));
						}
					});
				});
			},

			// Get playlist details
			get: function(callback) {
				Spotify.getUserAndPlaylist(function(err, userId, playlistId) {
					if(err) { return callback(err); }

					Spotify.call({
						method: 'GET',
						endpoint: '/v1/users/'+ userId +'/playlists/'+ playlistId
					}, function(err, data) {
						if(err) { Logger.error(err); }

						callback(err, data);
					});
				});
			},

			// Create playlist on Spotify
			create: function(callback) {
				Spotify.data.get(['userId', 'playlistId'], function(items) {
					var userId = items.userId;
					var playlistId = items.playlistId;

					if(playlistId) {
						Logger.info('[Spotify] PlaylistId exists in storage: '+ playlistId);
						return Spotify.playlist.get(callback);
					}

					Spotify.call({
						method: 'POST',
						endpoint: '/v1/users/'+ userId +'/playlists',
						data: JSON.stringify({
							'name': Spotify.playlist.name,
							'public': false
						})
					}, function(err, data) {
						if(err) { Logger.error(err); return callback(err); }

						Spotify.data.set({playlistId: data.id}, function() {
							callback(null, data);
						});
					});
				});
			},

			// Get playlist if it exists, or create a new one
			getOrCreate: function(callback) {
				Spotify.playlist.getExistingId(function(err, playlistId) {
					if(err) {
						Spotify.playlist.create(callback);
					} else {
						Spotify.playlist.get(callback);
					}
				});
			},

			removeAllTracks: function(callback) {
				Logger.info('[Spotify] Removing all tracks in playlist...');

				Spotify.getUserAndPlaylist(function(err, userId, playlistId) {
					if(err) { return callback(err); }

					Spotify.call({
						endpoint: '/v1/users/'+ userId +'/playlists/'+ playlistId +'/tracks',
						method: 'PUT',
						data: JSON.stringify({ uris: [] })
					}, function(err, data) {
						if(err) { 
							Logger.info('[Spotify] Error removing all tracks from playlist.'); 
							Logger.error(err); 
							return callback(err);
						}

						return callback(null, data);
					});
				});
			},

			// Add an array of trackIds to playlist
			addTracks: function(tracksIds, callback) {
				if(tracksIds.length === 0) {
					Logger.info('[Spotify] No tracks to add to playlist.');
					return callback();
				}

				Spotify.getUserAndPlaylist(function(err, userId, playlistId) {
					if(err) { return callback(err); }

					Logger.info('[Spotify] '+ tracksIds.length +' tracks to check if they already exist in playlist.');

					var alreadyInPlaylist = 0;

					// Check for already existing tracks in playlist
					Spotify.findInPagedResult({
						method: 'GET',
						endpoint: '/v1/users/'+ userId +'/playlists/'+ playlistId +'/tracks'
					}, function(data, cbFind) {
						// Check if tracks are already in playlist
						data.forEach(function(track) {
							var index = tracksIds.indexOf(track.track.id);
							if(index != -1) {
								tracksIds.splice(index, 1);
								alreadyInPlaylist++;
								Logger.info('[Spotify] Track '+ track.track.id +' already in playlist.');
							}
						});

						cbFind(false);
					}, function() {
						Logger.info('[Spotify] '+ alreadyInPlaylist +' tracks already in playlist.');
						Logger.info('[Spotify] '+ tracksIds.length +' tracks remaining to add.');

						var tracksPaths = [];
						tracksIds.forEach(function(id) {
							tracksPaths.push('spotify:track:'+ id);
						});

						Spotify.playlist._splitPlaylistTracksRequest(userId, playlistId, 'POST', tracksPaths, callback);
					});
				});
			},

			removeTracks: function(tracksIds, callback) {
				if(tracksIds.length === 0) {
					Logger.info('[Spotify] No tracks to remove from playlist.');
					return callback();
				}

				Spotify.getUserAndPlaylist(function(err, userId, playlistId) {
					if(err) { return callback(err); }

					Logger.info('[Spotify] '+ tracksIds.length +' tracks to remove from playlist.');

					var tracksPaths = [];
					tracksIds.forEach(function(id) {
						tracksPaths.push({ uri: 'spotify:track:'+ id });
					});

					Spotify.playlist._splitPlaylistTracksRequest(userId, playlistId, 'DELETE', tracksPaths, callback);
				});
			},

			// Handle arrays bigger than 100 items (should be splitted in multiple requests for Spotify API)
			_splitPlaylistTracksRequest: function(userId, playlistId, method, tracksPaths, callback) {
				// We don't have any tracks to add anymore
				if(tracksPaths.length === 0) {
					Logger.info('[Spotify] No tracks to '+ method +' to playlist.');
					return callback();
				}

				Logger.info('[Spotify] Going to '+ method +' tracks to playlist '+ playlistId +'...');

				//
				// Spotify API allow only send 100 tracks per requests, so we need to split it.
				// Slit it from the end, as tracks will be added to the start of playlist and needs to keep the right order.
				// For deletion (DELETE method), the order of track does not matters, so it's fine to get them from the end too.
				//
				// Example tracks to send (10 is the newest, 1 is the oldest) : 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 
				// Get 5 from the end : 5, 4, 3, 2, 1  -> add these to position 0 in playlist -> playlist = 5, 4, 3, 2, 1
				// Remaining tracks :   10, 9, 8, 7, 6
				// Get 5 from the end : 10, 9, 8, 7, 6 -> add these to position 0 in playlist -> playlist = 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
				//
				var remainingTracks  = tracksPaths.slice(0, -100);
				if(remainingTracks.length > 0) {
					Logger.info('[Spotify] Due to Spotify limitation (max 100 tracks/request), we will split this request.');
					Logger.info('[Spotify] Starting to process the last 100 tracks.');
					Logger.info('[Spotify] Then, we will have '+ remainingTracks.length +' tracks remaining to process.');

					tracksPaths = tracksPaths.slice(-100);
				}

				Logger.info('[Spotify] Sending '+ method +' request to playlist '+playlistId+' with tracks:');
				Logger.info(tracksPaths);

				var requestParams = {};
				var requestData = {};

				// If method is POST (add tracks), set position to 0 to add them at start of playlist
				if(method === 'POST') {
					requestParams.position = 0;
					requestData.uris = tracksPaths;
				} else if(method === 'DELETE') {
					requestData.tracks = tracksPaths;
				}

				var requestOpt = {
					method: method,
					endpoint: '/v1/users/'+ userId +'/playlists/'+ playlistId +'/tracks',
					data: JSON.stringify(requestData),
					params: requestParams
				};

				Spotify.call(requestOpt, function(err, data) {
					if(err) { 
						Logger.info('[Spotify] Error sending tracks to playlist.'); 
						Logger.error(err);

						return callback(err);
					}

					Logger.info('[Spotify] Request sent to playlist.');

					// If we have remaining tracks to process, call the method again
					if(remainingTracks.length > 0) {
						Logger.info('[Spotify] Waiting 2s before processing the next batch of tracks.');
						
						setTimeout(function() {
							Spotify.playlist._splitPlaylistTracksRequest(userId, playlistId, method, remainingTracks, callback);
						}, 2000);
					} else {
						// All tracks processed, finished !
						Logger.info('[Spotify] All done !');
						callback();
					}					
				});
			}
		},

		// Get details for a track from it's ID
		getTrack: function(trackId, callback) {
			Logger.info('[Spotify] Getting details for track "'+ trackId +'"...');

			Spotify.call({
				endpoint: '/v1/tracks/'+ trackId,
				method: 'GET'
			}, function(err, data) {
				if(err) { 
					Logger.info('[Spotify] Error getting track "'+ trackId +'".'); 
					Logger.error(err); 
					return callback(err);
				}

				return callback(null, data);
			});
		},

		// Find a track on Spotify
		findTrack: function(query, trackName, artist, callback) {
			Logger.info('[Spotify] Searching for track "'+ query +'"...');

			Spotify.call({
				endpoint: '/v1/search',
				method: 'GET',
				params: {
					q: query,
					type: 'track',
					limit: 20
				}
			}, function(err, data) {
				if(err) { Logger.info('[Spotify] Error searching track "'+ query +'".'); Logger.error(err); return callback(err); }
				if(data.tracks.total === 0) { Logger.info('[Spotify] Track "'+ query +'" not found.'); return callback(new Error('Not found')); }

				var found = null;
				for(var i = 0; i < data.tracks.items.length && !found; i++) {
					var track = data.tracks.items[i];

					// Only mark as found if the track name is exactly the same
					// TODO: should check for artists too
					if(track.name.toLowerCase() == trackName.toLowerCase()) {
						found = track;
					}
				}

				if(found) {
					Logger.info('[Spotify] Track found "'+ found.id +'".');

					return callback(null, found);
				} else {
					Logger.info('[Spotify] Track "'+ query +'" not found.');

					return callback(new Error('Not found'));
				}
			});
		},

		// Find tracks on Spotify
		findTracks: function(query, callback) {
			Logger.info('[Spotify] Searching tracks for "'+ query +'"...');

			Spotify.call({
				endpoint: '/v1/search',
				method: 'GET',
				params: {
					q: query,
					type: 'track',
					limit: 20
				}
			}, function(err, data) {
				if(err) { Logger.info('[Spotify] Error searching tracks for "'+ query +'".'); Logger.error(err); return callback(err); }
				if(data.tracks.total === 0) { Logger.info('[Spotify] No tracks found for query "'+ query +'".'); return callback(new Error('Not found')); }

				var tracks = [];

				// Loop over all tracks found
				for(var i = 0; i < data.tracks.items.length; i++) {
					var track = data.tracks.items[i];

					// Make a string with the artists' names
					var artist = '';
					if(track.artists.length > 0) {
						artist = track.artists[0].name;
						for(var j = 1; j < track.artists.length; j++) {
							artist += ', '+ track.artists[j].name;
						}
					}

					// Create a more concise track object and add to list
					tracks.push({
						name: track.name, 
						artist: artist,
						image: track.album.images[track.album.images.length-1].url,
						id: track.id,
						previewUrl: track.preview_url
					});
				}

				if(tracks.length > 0) {
					Logger.info('[Spotify] '+ tracks.length +' tracks found.');

					return callback(null, tracks);
				} else {
					Logger.info('[Spotify] No tracks found for query "'+ query +'".');

					return callback(new Error('Not found'));
				}
			});
		},

		// Storage for Spotify data (auth token, etc)
		data: new StorageHelper('Spotify', 'sync'), // New storage, synced with other Chrome installs

		// Helpers to get URLs for API calls
		getUrl: {
			redirect: function() {
				return chrome.identity.getRedirectURL() +'spotify_cb';
			},

			authorize: function() {
				var params = {
					client_id: Spotify.api.clientId,
					response_type: 'code',
					redirect_uri: Spotify.getUrl.redirect(),
					scope: 'playlist-read-private playlist-modify-private'
				};

				return 'https://accounts.spotify.com/authorize/?'+ $.param(params);
			},

			token: function() {
				return 'https://accounts.spotify.com/api/token';
			}
		},

		// Call the Spotify API and search in paged result with checkFind, call callback when found or when last page is reached
		findInPagedResult: function(callOptions, checkFind, callback) {
			Spotify.call(callOptions, function(err, data) {
				if(err) { Logger.error(err); }

				checkFind(data.items, function(found) {
					if(found) {
						return callback(found);
					}

					// Not found, and no next page
					if(!data.next) {
						return callback(false);
					}

					// Not found, but next page exists, load it
					callOptions.endpoint = null;
					callOptions.url = data.next;
					Spotify.findInPagedResult(callOptions, checkFind, callback);
				});
			});
		},

		// Call an API endpoint
		call: function(options, callback) {
			Spotify.loginStatus(function(status) {
				if(!status) {
					return callback(new Error('You must login on Spotify.'));
				}

				Spotify.data.get('accessToken', function(items) {
					var accessToken = items.accessToken;

					var url = (options.endpoint && !options.url) ? 'https://api.spotify.com'+ options.endpoint : options.url;

					if(options.params) {
						url += '?'+ $.param(options.params);
					}

					$.ajax({
						url: url,
						method: options.method,
						data: (options.data) ? options.data : null,
						headers: { 'Authorization': 'Bearer '+ accessToken }
					})
						.done(function(data) {
							callback(null, data);
						})
						.fail(function(jqXHR, textStatus) {
							if(jqXHR.status === 401) {
								Spotify.refreshToken(function(status) {
									if(status === true) {
										// Refresh/login successfull, retry call
										Spotify.call(options, callback);
									} else {
										// Error...
										callback(new Error('Please authorize Shazify to access your Spotify account.'));
									}
								});
							// Too many requests, wait and try again
							} else if(jqXHR.status === 429) {
								Logger.error('[Spotify] Too many requests, waiting 1s... ('+ jqXHR.status +') : '+textStatus+'.');
								setTimeout(function() {
									Spotify.call(options, callback);
								}, 1000);
							} else {
								callback(new Error('Error calling API ('+ jqXHR.status +').'));
								Logger.error('[Spotify] Error calling API ('+ jqXHR.status +') : '+textStatus+'.');
							}
						});
				});
			});
		},

		// Check login status on Spotify
		loginStatus: function(callback) {
			Spotify.data.get(['accessToken', 'tokenTime', 'expiresIn'], function(items) {
				// Don't have an access token ? We are not logged in...
				if(!items.accessToken) {
					return callback(false);
				}

				if(!items.tokenTime) {
					return callback(false);
				}

				if(!items.expiresIn) {
					return callback(false);
				}

				// Token expired, we need to get one new with the refreshToken
				if(new Date(new Date(items.tokenTime).getTime()+(items.expiresIn*1000)) <= new Date()) {
					Logger.info('[Spotify] Token expired, we need to refresh it.');
					Spotify.refreshToken(callback);
				} else {
					callback(true);
				}
			});
		},

		// Refresh access token
		refreshToken: function(callback) {
			Logger.info('[Spotify] Refreshing token...');

			Spotify.data.get('refreshToken', function(items) {
				if(items.refreshToken) {
					$.ajax({
						url: Spotify.getUrl.token(),
						method: 'POST',
						headers: {
							'Content-Type':  'application/x-www-form-urlencoded; charset=UTF-8',
							'Authorization': 'Basic '+ window.btoa(Spotify.api.clientId+':'+Spotify.api.clientSecret)
						},
						data: {
							grant_type: 'refresh_token',
							refresh_token: items.refreshToken
						}
					})
						.done(function(data) {
							Spotify.saveAccessToken(data, function(status) {
								if(status === true) {
									Logger.info('[Spotify] Token refresh successful.');
									callback(true);
								} else {
									Logger.error('[Spotify] Error while refreshing token... open login.');
									Spotify.openLogin(true, callback);
								}
							});
						})
						.fail(function(jqXHR, textStatus) {
							if(jqXHR.status === 429) {
								Logger.error('[Spotify] Too many requests, waiting 1s... ('+ jqXHR.status +') : '+textStatus+'.');

								setTimeout(function() {
									Spotify.refreshToken(callback);
								}, 1000);
							} else {
								Logger.error('[Spotify] Error getting token : '+textStatus+'.');
								callback(false);
							}
						});
				} else {
					Logger.info('[Spotify] No refresh token stored... open login.');
					Spotify.openLogin(true, callback);
				}
			});
		},

		// Get an access token from an auth code
		getAccessToken: function(authCode, callback) {
			Logger.info('[Spotify] Getting access token...');

			$.ajax({
				url: Spotify.getUrl.token(),
				method: 'POST',
				headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
				data: {
					grant_type: 'authorization_code',
					code: authCode,
					redirect_uri: Spotify.getUrl.redirect(),
					client_id: Spotify.api.clientId,
					client_secret: Spotify.api.clientSecret
				}
			})
				.done(function(data) {
					Logger.info('[Spotify] Access token successfuly fetched.');
					Spotify.saveAccessToken(data, callback);
				})
				.fail(function(jqXHR, textStatus) {
					if(jqXHR.status === 429) {
						Logger.error('[Spotify] Too many requests, waiting 1s... ('+ jqXHR.status +') : '+textStatus+'.');
						
						setTimeout(function() {
							Spotify.getAccessToken(authCode, callback);
						}, 1000);
					} else {
						Logger.error('[Spotify] Error getting access token : '+ textStatus +'.');
						callback(false);
					}
				});
		},

		// Save access token
		saveAccessToken: function(data, callback) {
			if(data.access_token && data.expires_in) {
				Spotify.data.set({
					'accessToken': data.access_token,
					'expiresIn': data.expires_in,
					'tokenTime': new Date().toString()
				}, function() {
					// In case of a refresh, the API will not return a new refreshToken
					if(!data.refresh_token) {
						return callback(true);
					}
					
					Spotify.data.set({
						'refreshToken': data.refresh_token
					}, function() {
						callback(true);
					});
				});
			} else {
				Logger.error(data);
				Logger.error('[Spotify] Error getting access token.');
				callback(false);
			}
		},

		// Open Spotify login (with chrome identity)
		openLogin: function(interactive, callback) {
			if(typeof interactive === 'function') {
				callback = interactive;
				interactive = true;
			} else if(typeof interactive === 'undefined') {
				interactive = true;
				callback = function(){};
			}

			Logger.info('[Spotify] Starting login process...');

			chrome.identity.launchWebAuthFlow({'url': Spotify.getUrl.authorize(), 'interactive': interactive}, function(redirectUrl) {
				if(chrome.runtime.lastError) {
					Logger.error('[Spotify] Authorization has failed : '+ chrome.runtime.lastError.message);

					return callback(false);
				}

				if(!redirectUrl) {
					Logger.error('[Spotify] Authorization failed : redirect URL empty.');

					return callback(false);
				}

				var params = Helper.getUrlVars(redirectUrl);

				if(params.error || !params.code) {
					Logger.error('[Spotify] Authorization has failed.');
					Logger.error(params.error);
					
					return callback(false);
				}

				Spotify.data.set({'authCode': params.code}, function() {
					Spotify.getAccessToken(params.code, function(status) {
						if(!status) {
							return callback(status);
						}

						// We get the user ID
						Spotify.call({
							endpoint: '/v1/me',
							method: 'GET'
						}, function(err, data) {
							if(err) { Logger.error(err); Logger.error('[Spotify] Error getting user infos.'); }
							
							Spotify.data.set({'userId': data.id}, function() {
								callback(true);
							});
						});
					});
				});
			});
		},

		// Disconnect from Spotify API
		disconnect: function(callback) {
			callback = callback || function(){};

			Spotify.data.set({
				'authCode': null,
				'userId': null,
				'playlistId': null,
				'accessToken': null,
				'expiresIn': null,
				'refreshToken': null,
				'tokenTime': null
			}, callback);
		}
	};

	window.s2s.Spotify = Spotify;
})(window.s2s.Helper, window.s2s.StorageHelper, window.s2s.Logger);