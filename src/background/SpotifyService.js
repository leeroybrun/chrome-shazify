(function(Helper, StorageHelper, Tags, Logger){
	var Spotify = {
		api: {
			clientId: 'b0b7b50eac4642f482825c535bae2708',
			clientSecret: 'b3bc17ef4d964fccb63b1f37af9101f8'
		},

		genQuery: function(track, artist) {
			var reSpaces = new RegExp(' ', 'g');

			return 'track:'+ track.replace(reSpaces, '+') +' artist:'+ artist.replace('Feat. ', '').replace(reSpaces, '+');
		},

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
			name: chrome.i18n.getMessage('myTags'),

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
						data: {
							'name': Spotify.playlist.name,
							'public': false
						}
					}, function(err, data) {
						if(err) { Logger.error(err); return callback(err); }

						Spotify.data.set({playlistId: data.id}, function() {
							callback(null, data);
						});
					});
				});
			},



			getOrCreate: function(callback) {
				Spotify.playlist.getExistingId(function(err, playlistId) {
					if(err) {
						Spotify.playlist.create(callback);
					} else {
						Spotify.playlist.get(callback);
					}
				});
			},

			searchAndAddTags: function(callback) {
				var tracksAdded = [];

				Logger.info('[Spotify] Searching tags on Spotify.');

				async.eachSeries(Tags.list, function(tag, cbi) {
					if(tag.status > 1) { return cbi(); }

					tag.query = tag.query || 'track:'+ tag.name.replace(' ', '+') +' artist:'+ tag.artist.replace(' ', '+');

					Spotify.playlist.searchAndAddTag(tag, tag.query, false, function(err) {
						if(!err) {
							tracksAdded.push(tag.spotifyId);
						}
						cbi();
					});
				}, function(err) {
					Tags.save();
					Spotify.playlist.addTracks(tracksAdded, function(err) {
						callback(err);
					});
				});
			},

			searchAndAddTag: function(tag, query, shouldSave, callback) {
				Logger.info('[Spotify] Searching for tag "'+ query +'"...');

				Spotify.call({
					endpoint: '/v1/search',
					method: 'GET',
					params: {
						q: query,
						type: 'track',
						limit: 1
					}
				}, function(err, data) {
					if(err) { Logger.info('[Spotify] Error searching tag "'+ query +'".'); Logger.error(err); return callback(err); }
					if(data.tracks.total === 0) { tag.status = 2; Logger.info('[Spotify] Tag "'+ query +'" not found.'); return callback(new Error('Not found')); }

					var track = data.tracks.items[0];

					tag.spotifyId = track.id;
					tag.status = 3;

					Logger.info('[Spotify] Tag found "'+ track.id +'".');

					if(shouldSave) {
						Tags.save();
						Spotify.playlist.addTracks([tag.spotifyId], function(err) {
							callback(err);
						});
					} else {
						callback();
					}
				});
			},

			addTracks: function(tracksIds, callback) {
				Spotify.getUserAndPlaylist(function(err, userId, playlistId) {
					if(err) { return callback(err); }

					var alreadyInPlaylist = [];

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
								Logger.info('[Spotify] Track '+ track.track.id +' already in playlist.');
							}
						});

						cbFind(false);
					}, function() {
						var tracksPaths = [];
						tracksIds.forEach(function(id) {
							tracksPaths.push('spotify:track:'+ id);
						});

						Spotify.playlist.addTracksPaths(tracksPaths, callback);						
					});
				});
			},

			addTracksPaths: function(tracksPaths, callback) {
				Spotify.getUserAndPlaylist(function(err, userId, playlistId) {
					if(err) { return callback(err); }

					Logger.info('[Spotify] Going to add tracks to playlist '+ playlistId +'...');

					// Spotify API allow only to add 100 tracks per requests, so we need to split it
					var remainingTracks  = tracksPaths.slice(99);
					if(remainingTracks.length > 0) {
						Logger.info('[Spotify] Due to Spotify limitation (max 100 tracks addition/request), we will split this request.');
						Logger.info('[Spotify] Starting to add the first 100 tracks.');
						Logger.info('[Spotify] Then, we will have '+ remainingTracks.length +' tracks remaining to add.');

						tracksPaths = tracksPaths.slice(0, 99);
					}
					
					// We don't have any tracks to add anymore
					if(tracksPaths.length === 0) {
						Logger.info('[Spotify] No tags to add to playlist.');
						return callback();
					}

					Logger.info('[Spotify] Saving tracks to playlist '+playlistId+' :');
					Logger.info(tracksPaths);

					Spotify.call({
						method: 'POST',
						endpoint: '/v1/users/'+ userId +'/playlists/'+ playlistId +'/tracks',
						data: JSON.stringify({ uris: tracksPaths })
					}, function(err, data) {
						if(err) { 
							Logger.info('[Spotify] Error saving tracks to playlist.'); 
							Logger.error(err);

							return callback(err);
						} else {
							Logger.info('[Spotify] Tracks saved to playlist.');

							// If we have remaining tracks to add, call the method again
							if(remainingTracks.length > 0) {
								Logger.info('[Spotify] Waiting 2s before processing the next batch of tracks.');
								
								setTimeout(function() {
									Spotify.playlist.addTracksPaths(remainingTracks, callback);
								}, 2000);
							} else {
								// All tracks added, finished !
								Logger.info('[Spotify] All done !');
								callback();
							}
						}						
					});
				});
			}
		},

		data: new StorageHelper('Spotify', 'sync'), // New storage, synced with other Chrome installs

		getUrl: {
			redirect: function() {
				return 'https://'+ chrome.runtime.id +'.chromiumapp.org/spotify_cb';
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
										callback(new Error('Please authorize Shazam2Spotify to access your Spotify account.'));
									}
								});
							} else {
								callback(new Error('Error calling API'));
								Logger.error('[Spotify] Error calling API : '+textStatus+'.');
							}
						});
				});
			});
		},

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
							Logger.error('[Spotify] Error getting token : '+textStatus+'.');
							callback(false);
						});
				} else {
					Logger.info('[Spotify] No refresh token stored... open login.');
					Spotify.openLogin(true, callback);
				}
			});
		},

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
					Logger.error('[Spotify] Error getting access token : '+ textStatus +'.');
					callback(false);
				});
		},

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
})(window.s2s.Helper, window.s2s.StorageHelper, window.s2s.Tags, window.s2s.Logger);