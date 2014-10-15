angular.module('Shazam2Spotify', ['ngRoute', 'ngAnimate'])
	.config(['$routeProvider', function($routeProvider) {
		$routeProvider
			.when('/', {
				templateUrl: 'partials/tags.html', 
				controller: 'TagsCtrl'
			})
			.when('/settings', {
				templateUrl: 'partials/settings.html',
				controller: 'SettingsCtrl'
			})
			.otherwise({redirectTo: '/'});

		// Load SVG icons (dirty, should not use jQuery...)
		$.ajax({
			url: 'img/icons.svg',
			method: 'GET',
			dataType: 'html',
			success: function(data) {
				$("body").prepend(data);
			}
		});
	}]);;angular.module('Shazam2Spotify').controller('SettingsCtrl', function($scope, $location, ShazamService, SpotifyService) {
	$scope.shazam = {
		loginStatus: false,
		openLogin: ShazamService.openLogin
	};

	ShazamService.loginStatus(function(status) {
		$scope.shazam.loginStatus = status;
	});

	$scope.spotify = {
		loginStatus: false,
		openLogin: function() {
			SpotifyService.openLogin(function(status) {
				$scope.spotify.loginStatus = status;
				$scope.$apply();
			});
		},
		disconnect: function() {
			SpotifyService.disconnect(function() {
				$scope.spotify.loginStatus = false;
				$scope.$apply();
			});
		}
	};

	SpotifyService.loginStatus(function(status) {
		$scope.spotify.loginStatus = status;
	});

	$scope.return = function() {
		$location.path('/');
	};
});;angular.module('Shazam2Spotify').controller('TagsCtrl', function($scope, $location, $timeout, ShazamService, SpotifyService, TagsService) {
	$scope.updating = true;

	$scope.tags = TagsService.list;

	$scope.updateTags = function(callback) {
		$scope.updating = true;

		ShazamService.updateTags(function(err) {
			$scope.updating = false;

			if(err) {
				$scope.$apply(function() {
					$location.path('/settings');
				});
			}
			
			callback();
		});
	};

	$scope.newSearch = {
		show: false,
		tag: null,
		error: null,
		query: {
			artist: '',
			track: ''
		},
		send: function() {
			var query = SpotifyService.genQuery($scope.newSearch.query.track, $scope.newSearch.query.artist);

			SpotifyService.playlist.searchAndAddTag($scope.newSearch.tag, query, true, function(error) {
				if(error) {
					$scope.newSearch.error = chrome.i18n.getMessage('noTrackFoundQuery');
				} else {
					$scope.newSearch.error = null;
					$scope.newSearch.tag = null;
					$scope.newSearch.show = false;
				}
			});
		},
		cancel: function() {
			$scope.newSearch.error = null;
			$scope.newSearch.tag = null;
			$scope.newSearch.show = false;
		}
	};

	$scope.retryTagSearch = function(tag) {
		$scope.newSearch.query.artist = tag.artist;
		$scope.newSearch.query.track = tag.name;
		$scope.newSearch.tag = tag;
		$scope.newSearch.show = true;
	};

	function checkLogin(callback) {
		ShazamService.loginStatus(function(status) {
			if(status === false) {
				return callback(false);
			}

			SpotifyService.loginStatus(function(status) {
				if(status === false) {
					return callback(false);
				}

				callback(true);
			});
		});
	}

	var refreshTags = function() {
		checkLogin(function(status) {
			if(status === true) {
				SpotifyService.playlist.get(function(err) {
					TagsService.load(function() {
						$scope.tags = TagsService.list;

						$scope.updateTags(function() {
							SpotifyService.playlist.searchAndAddTags(function() {
								// Tags added
							});
						});
					});
				});
			} else {
				$location.path('/settings');
				$scope.$apply();
			}
		});
	};

	$scope.refreshTags = refreshTags;

	refreshTags();
});;angular.module('Shazam2Spotify').directive('chromeTranslate', function() {
    return {
        restrict: 'A',
        link: function($scope, elem) {
			elem.text(chrome.i18n.getMessage(elem.text()));
        }
    };
});;angular.module('Shazam2Spotify').factory('ChromeHelper', function() {
	var ChromeHelper = {
		focusOrCreateTab: function(url) {
		  chrome.windows.getAll({"populate":true}, function(windows) {
		    var existing_tab = null;
		    for (var i in windows) {
		      var tabs = windows[i].tabs;
		      for (var j in tabs) {
		        var tab = tabs[j];
		        if (tab.url == url) {
		          existing_tab = tab;
		          break;
		        }
		      }
		    }
		    if (existing_tab) {
		      chrome.tabs.update(existing_tab.id, {"selected":true});
		    } else {
		      chrome.tabs.create({"url":url, "selected":true});
		    }
		  });
		}
	};

	return ChromeHelper;
});;angular.module('Shazam2Spotify').factory('Helper', function() {
	var Helper = {
		// Thanks : http://stackoverflow.com/a/1714899/1160800
		serializeUrlVars: function(obj) {
			var str = [];
			for(var p in obj)
				if (obj.hasOwnProperty(p)) {
					str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				}
			return str.join("&");
		},

		// Thanks : http://stackoverflow.com/a/4656873/1160800
		getUrlVars: function(url) {
		    var vars = [], hash;
		    var hashes = url.slice(url.indexOf('?') + 1).split('&');
		    for(var i = 0; i < hashes.length; i++)
		    {
		        hash = hashes[i].split('=');
		        vars.push(hash[0]);
		        vars[hash[0]] = hash[1];
		    }
		    return vars;
		},

		// Thanks : https://github.com/spotify/web-api-auth-examples/blob/master/authorization_code/app.js#L24
		generateRandomString: function(length) {
			var text = '';
			var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

			for (var i = 0; i < length; i++) {
				text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			return text;
		}
	};

	return Helper;
});;angular.module('Shazam2Spotify').factory('StorageHelper', function() {
	var Storage = function(prefix) {
		this.prefix = prefix;
		this.cache = {};
	};

	// For now we use local storage only. Tags list is too big to be stored with sync (QUOTA_BYTES_PER_ITEM exceeds).
	// Maybe split items list into smaller chunks, so we can store them with sync.

	Storage.prototype.get = function(names, callback) {
		var storage = this;

		if(!Array.isArray(names)) {
			names = [names];
		}

		// Check for each data we want if it's cached or not
		var toGetFromStorage = [];
		var data = {};
		names.forEach(function(name) {
			if(name in storage.cache) {
				data[name] = storage.cache[name];
			} else {
				toGetFromStorage.push(storage.prefix+'_'+name);
			}
		});

		// We've got all from cache, yay !
		if(toGetFromStorage.length === 0) {
			return callback(data);
		}

		// Get additional values from storage
		chrome.storage.local.get(toGetFromStorage, function(items) {
			for(var key in items) {
				var name = key.replace(storage.prefix+'_', ''); // Retrive original name

				data[name] = JSON.parse(items[key]);
				storage.cache[name] = data[name];
			}

			callback(data);
		});
	};

	Storage.prototype.set = function(objects, callback) {
		var data = {};
		for(var key in objects) {
			this.cache[key] = objects[key];
			data[this.prefix+'_'+key] = JSON.stringify(objects[key]);
		}

		chrome.storage.local.set(data, function() {
			var error = null;
			if(chrome.runtime.lastError) {
				error = chrome.runtime.lastError;
				console.error('An error occured during storage set: ', error);
			}

			callback(error);
		});
	};

	return Storage;
});;angular.module('Shazam2Spotify').factory('ShazamService', function(ChromeHelper, StorageHelper, TagsService, SpotifyService, $timeout, $http) {
	var Shazam = {
		newTags: [],

		data: new StorageHelper('Shazam'),

		openLogin: function() {
			ChromeHelper.focusOrCreateTab('https://www.shazam.com/myshazam');
		},

		loginStatus: function(callback) {
			$http.get('https://www.shazam.com/fragment/myshazam')
				.success(function() {
					callback(true);
				})
				.error(function(data, status) {
					if(status === 401) {
						callback(false);
					} else {
						callback(true);
					}
				});
		},

		updateTags: function(path, callback) {
			if(typeof callback === 'undefined' && typeof path === 'function') {
				callback = path;
				path = null;
			}

			callback = callback || function(){};
			path = path || '/fragment/myshazam';

			function saveTags(error) {
				if(error) {
					TagsService.save(function() {
						callback(error);
					});
				} else {
					Shazam.data.set({'lastTagsUpdate': (new Date()).toString()}, function() {
						TagsService.save(function() {
							callback();
						});
					});
				}
			}

			Shazam.data.get('lastTagsUpdate', function(items) {
				var lastTagsUpdate = new Date(items.lastTagsUpdate) || new Date(0);
				lastTagsUpdate = (!isNaN(lastTagsUpdate.valueOf())) ? lastTagsUpdate : new Date(0);

				$http.get('https://www.shazam.com'+ path)
					.success(function(data) {
						if(data && typeof data === 'object' && data.feed.indexOf('ms-no-tags') == -1) {
							var lastTagDate = new Date(parseInt($('<div/>').append(data.feed).find('article').last().find('.tl-date').attr('data-time')));

							Shazam.parseTags(lastTagsUpdate, data.feed, function() {
								if(data.previous && data.feed.indexOf('ms-no-tags') == -1 && lastTagDate > lastTagsUpdate) {
									$timeout(function() {
										Shazam.updateTags(data.previous, callback);
									}, 2000);
								} else {
									saveTags(false);
								}
							});
						} else {
							saveTags(false);
						}
					})
					.error(function(data, status) {
						if(status === 401) {
							saveTags(true);
						} else {
							saveTags(false);
						}
					});
			});
		},

		parseTags: function(lastTagsUpdate, data, callback) {
			$('<div/>').append(data).find('article').each(function() {
				var date = parseInt($('.tl-date', this).attr('data-time'));

				if(new Date(date) > lastTagsUpdate) {
					var tag = {
						id: $(this).attr('data-track-id'),
						name: $('[data-track-title]', this).text().trim(),
						artist: $('[data-track-artist]', this).text().trim().replace(/^by /, ''),
						date: date,
						image: $('img[itemprop="image"]', this).attr('src')
					};

					tag.query = SpotifyService.genQuery(tag.name, tag.artist);

					TagsService.add(tag);
				}
			});

			callback();
		}
	};

	Shazam.data.get('tags', function(items) {
		Shazam.tags = items.tags;
	});

	return Shazam;
});;angular.module('Shazam2Spotify').factory('SpotifyService', function(ChromeHelper, StorageHelper, Helper, TagsService, $timeout, $http) {
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
				console.log('redirectUrl: '+redirectUrl);

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
});;angular.module('Shazam2Spotify').factory('TagsService', function(StorageHelper) {
	var Tags = {
		list: [],

		add: function(newTag, callback) {
			callback = callback || function(){};

			newTag.spotifyId = newTag.spotifyId || null;
			newTag.status = newTag.status || 1; // Status : 1 = just added, 2 = not found in spotify, 3 = found & added to playlist

			newTag.query = newTag.query || '';

			var found = false;
			for(var i in Tags.list) {
				if(Tags.list[i].id == newTag.id) {
					found = true;
					$.extend(Tags.list[i], newTag); // Update existing tag
					break;
				}
			}

			if(!found) {
				Tags.list.push(newTag);
			}

			Tags.list.sort(function (a, b) {
				if (a.date > b.date) { return -1; }
				if (a.date < b.date) { return 1; }
				return 0;
			});

			callback();
		},

		save: function(callback) {
			Tags.data.set({'tagsList': Tags.list}, function() {
				callback();
			});
		},
		
		load: function(callback) {
			Tags.data.get('tagsList', function(items) {
				Tags.list = items.tagsList || [];

				callback();
			});
		},

		data: new StorageHelper('Tags')
	};

	return Tags;
});