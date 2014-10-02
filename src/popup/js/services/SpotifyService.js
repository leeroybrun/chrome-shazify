angular.module('Shazam2Spotify').factory('SpotifyService', function(ChromeHelper, StorageHelper, Helper, TagsService, $timeout, $http) {
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
							console.log('No userId stored, need to get one.');

							Spotify.call({
								endpoint: '/v1/me',
								method: 'GET'
							}, function(err, data) {
								if(err) { console.log(err); return cb(err); }
								if(data && data.id) { console.log(data); return cb(new Error('Cannot get user ID')); }

								userId = data.id;

								cb();
							});
						} else {
							cb();
						}
					},

					function checkPlaylistId(cb) {
						if(!playlistId) {
							console.log('No playlistId stored, need to getOrCreate.');
							Spotify.playlist.getOrCreate(function(err, data) {
								if(data && data.id && !err) {
									playlistId = data.id;
									cb();
								} else {
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

			get: function(callback) {
				Spotify.getUserAndPlaylist(function(err, userId, playlistId) {
					if(err) { return callback(err); }

					Spotify.call({
						method: 'GET',
						endpoint: '/v1/users/'+ userId +'/playlists/'+ playlistId
					}, function(err, data) {
						if(err) { console.log(err); }

						callback(err, data);
					});
				});
			},

			create: function(callback) {
				Spotify.data.get(['userId', 'playlistId'], function(items) {
					var userId = items.userId;
					var playlistId = items.playlistId;

					if(playlistId) {
						console.log('PlaylistId exists in storage: '+ playlistId);
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
						if(err) { console.log(err); return callback(err); }

						Spotify.data.set({playlistId: data.id}, function() {
							callback(null, data);
						});
					});
				});
			},

			getOrCreate: function(callback) {
				var playlistName = Spotify.playlist.name;

				Spotify.data.get(['userId', 'playlistId'], function(items) {
					var userId = items.userId;
					var playlistId = items.playlistId;

					if(playlistId) {
						return Spotify.playlist.get(callback);
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
								Spotify.playlist.get(callback);
							});
						} else {
							Spotify.playlist.create(callback);
						}
					});
				});
			},

			searchAndAddTags: function(callback) {
				var tracksAdded = [];

				async.eachSeries(TagsService.list, function(tag, cbi) {
					if(tag.status > 1) { return cbi(); }

					tag.query = tag.query || 'track:'+ tag.name.replace(' ', '+') +' artist:'+ tag.artist.replace(' ', '+');

					Spotify.playlist.searchAndAddTag(tag, tag.query, false, function(err) {
						if(!err) {
							tracksAdded.push(tag.spotifyId);
						}
						cbi();
					});
				}, function(err) {
					TagsService.save();
					Spotify.playlist.addTracks(tracksAdded, function(err) {
						callback(err);
					});
				});
			},

			searchAndAddTag: function(tag, query, shouldSave, callback) {
				Spotify.call({
					endpoint: '/v1/search',
					method: 'GET',
					params: {
						q: query,
						type: 'track',
						limit: 1
					}
				}, function(err, data) {
					if(err) { console.log(err); return callback(err); }
					if(data.tracks.total === 0) { tag.status = 2; return callback(new Error('Not found')); }

					var track = data.tracks.items[0];

					tag.spotifyId = track.id;
					tag.status = 3;

					if(shouldSave) {
						TagsService.save();
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
							if(tracksIds.indexOf(track.track.id) != -1) {
								alreadyInPlaylist.push(track.track.id);
							}
						});

						cbFind(false);
					}, function() {
						var tracksPaths = [];
						tracksIds.forEach(function(id) {
							if(alreadyInPlaylist.indexOf(id) == -1) {
								tracksPaths.push('spotify:track:'+ id);
							} else {
								console.log('Track '+ id +' already in playlist.');
							}
						});

						// We don't have any tracks to add anymore
						if(tracksPaths.length === 0) {
							return callback();
						}

						Spotify.call({
							method: 'POST',
							endpoint: '/v1/users/'+ userId +'/playlists/'+ playlistId +'/tracks',
							data: tracksPaths
						}, function(err, data) {
							callback(err);
						});
					});
				});
			}
		},

		data: new StorageHelper('Spotify'),

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

				return 'https://accounts.spotify.com/authorize/?'+ Helper.serializeUrlVars(params);
			},

			token: function() {
				return 'https://accounts.spotify.com/api/token';
			}
		},

		findInPagedResult: function(callOptions, checkFind, callback) {
			Spotify.call(callOptions, function(err, data) {
				if(err) { console.log(err); }

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

					$http({
						url: (options.endpoint && !options.url) ? 'https://api.spotify.com'+ options.endpoint : options.url,
						method: options.method,
						data: (options.data) ? options.data : null,
						params: (options.params) ? options.params : null,
						headers: { 'Authorization': 'Bearer '+ accessToken }
					})
						.success(function(data) {
							callback(null, data);
						})
						.error(function(data, status) {
							if(status === 401) {
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
								console.error('Error calling API : ', options, data, status);
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
					Spotify.refreshToken(callback);
				} else {
					callback(true);
				}
			});
		},

		refreshToken: function(callback) {
			Spotify.data.get('refreshToken', function(items) {
				if(items.refreshToken) {
					Spotify.getAccessToken(items.refreshToken, function(status) {
						if(status === true) {
							callback(true);
						} else {
							Spotify.openLogin(true, callback);
						}
					});
				} else {
					Spotify.openLogin(true, callback);
				}
			});
		},

		getAccessToken: function(authCode, callback) {
			$http({
				url: Spotify.getUrl.token(),
				method: 'POST',
				headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
				data: $.param({
					grant_type: 'authorization_code',
					code: authCode,
					redirect_uri: Spotify.getUrl.redirect(),
					client_id: Spotify.api.clientId,
					client_secret: Spotify.api.clientSecret
				})
			})
				.success(function(data) {
					if(data.access_token && data.expires_in && data.refresh_token) {
						Spotify.data.set({
							'accessToken': data.access_token,
							'expiresIn': data.expires_in,
							'refreshToken': data.refresh_token,
							'tokenTime': new Date().toString()
						}, function() {
							callback(true);
						});
					} else {
						callback(false);
						console.error('Error getting token : ', data);
					}
				})
				.error(function(data, status) {
					callback(false);
					console.error('Error getting token : ', data, status);
				});
		},

		openLogin: function(interactive, callback) {
			if(typeof interactive === 'function') {
				callback = interactive;
				interactive = true;
			} else if(typeof interactive === 'undefined') {
				interactive = true;
				callback = function(){};
			}

			chrome.identity.launchWebAuthFlow({'url': Spotify.getUrl.authorize(), 'interactive': interactive}, function(redirectUrl) {
				var params = Helper.getUrlVars(redirectUrl);

				if(!params.error && params.code) {
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
								if(err) { console.err('Error getting user infos', err); }
								
								Spotify.data.set({'userId': data.id}, function() {
									callback(true);
								});
							});
						});
					});
				} else {
					callback(false);
					console.log('Authorization has failed. '+ params.error);
				}
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

	return Spotify;
});