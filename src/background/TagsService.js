(function(Database, StorageHelper, Logger, Spotify, Shazam){
	var Tags = {
		lastUpdate: new Date(0),

		// Add/update a tag in the tags DB and search for Spotify track
		add: function(tag, callback) {
			callback = callback || function(){};

			tag.spotifyId = tag.spotifyId || null;
			tag.status = tag.status || 1; // Status : 1 = just added, 2 = not found in spotify, 3 = found, 4 = added to playlist, 5 = not found, manual search

			tag.query = tag.query || Spotify.genQuery(tag.name, tag.artist);

			tag.date = (tag.date instanceof Date) ? tag.date.getTime() : tag.date;

			// Search track on Spotify, if not already found
			if(tag.status < 3) {
				Spotify.findTrack(tag.query, tag.name, tag.artist, function(err, track) {
					if(err || !track) {
						tag.status = 2;
					} else {
						tag.status = 3;
						tag = Tags.setSpotifyInfosToTag(tag, track);
					}

					Tags._addToList(tag, callback);
				});
			} else {
				Tags._addToList(tag, callback);
			}
		},

		// Private : called from Tags.add, add the specified tag to list or update it
		_addToList: function(tag, callback) {
			Tags.db.put(tag).then(function() {
				return Tags.db.get(tag.shazamId).then(function(tag) {
					return callback(null, tag);
				});
			}).catch(function(reason) {
				Logger.error('[Tags] Error adding/updating tag to DB : '+ reason +'.');
				Logger.error(reason);

				return callback(reason);
			});
		},

		setSpotifyInfosToTag: function(tag, track) {
			tag.image = track.album.images[track.album.images.length-1].url;
			tag.previewUrl = track.preview_url;
			tag.spotifyId = track.id;

			return tag;
		},

		_updateStatusNbTags: 0, // Nombre de tags au total en cours d'ajout
		_updateStatusTagsAdded: 0, // Nombre de tags déjà ajoutés

		getUpdateStatus: function()
		{
			return {
				all: Tags._updateStatusNbTags,
				added: Tags._updateStatusTagsAdded
			};
		},

		// Update tags list from MyShazam and then update Spotify playlist
		update: function(callback) {
			Logger.info('[Tags] Updating since '+ Tags.lastUpdate +'.');

			Tags._updateStatusTagsAdded = 0;

			Shazam.getTags(Tags.lastUpdate, function(err, tags) {
				if(!err && Array.isArray(tags)) {
					Logger.info('[Tags] Got '+ tags.length +' new tags from Shazam.');

					Tags._updateStatusNbTags = tags.length;

					if(tags.length === 0) {
						return callback();
					}

					Tags.lastUpdate = new Date();

					async.eachSeries(tags, function(tag, cbe) {
						Tags.add(tag, function() {
							Tags._updateStatusTagsAdded++;
							cbe();
						});
					}, function() {
						Tags.updatePlaylist(callback);
					});
				} else {
					callback(err);
				}
			});
		},

		// Update Spotify playlist with tags found but not already added (status=3)
		updatePlaylist: function(callback) {
			Logger.info('[Tags] Updating playlist on Spotify.');

			// Used to revert "status" if an error occurs
			Tags.db.where('status').equals(3).toArray().then(function(tracksToAdd) {
				var tracksIdsToAdd = []; // Used to add tracks to playlist

				for(var i in tracksToAdd) {
					tracksIdsToAdd.push(tracksToAdd[i].spotifyId);
					tracksToAdd[i].status = 4; // Set status as added, will not be saved to DB if an error occurs
				}

				Spotify.playlist.addTracks(tracksIdsToAdd, function(err) {
					if(err) {
						Logger.info('[Tags] Cannot add tags to playlist.');
					} else {
						// Only update DB if addition succeeded
						Tags.db.bulkPut(tracksToAdd).then(function() {
							Logger.info('[Tags] Updated in DB.');
						}).catch(function(reason) {
							Logger.error('[Tags] Error updating tags in DB.');
							Logger.error(reason);
						});
					}

					Tags.save(callback);
				});
			}).catch(function(reason) {
				Logger.error('[Tags] Error getting tags list to add.');
				Logger.error(reason);
			});
		},

		// Manually select a Spotify track for a tag
		selectSpotifyTrack: function(shazamId, newSpotifyId, callback) {
			var Promise = Dexie.Promise;

			Tags.db.get(shazamId).then(function(tag) {
				var oldSpotifyId = tag.spotifyId;

				Logger.info('[Tags] Replacing Spotify track for '+ shazamId +' (old: '+ oldSpotifyId +' | new: '+ newSpotifyId +').');

				// Selected spotifyId is the same as already registered for the track
				if(oldSpotifyId && oldSpotifyId === newSpotifyId) {
					Logger.info('[Tags] Replacing Spotify track for '+ shazamId +' : same, nothing to do.');
					return callback();
				}

				var promise = Promise.resolve(tag);

				// -- Remove old track from playlist --
				// Tag was already linked to a Spotify track, but we link it to a new one
				// If other tags are linked to the old track -> don't change anything in playlist
				// If no other is linked to it, remove it to playlist
				if(oldSpotifyId) {
					Logger.info('[Tags] Replacing Spotify track for '+ shazamId +' : an other track was already defined.');
					promise.then(function() {
						return new Promise(function(resolve, reject) {
							Tags.removeTrackFromPlaylist(shazamId, oldSpotifyId, function(err) {
								if(err) {
									return reject(err);
								}

								return resolve(tag);
							});
						});
					});
				}

				return promise;

			// -- Add new track to playlist --
			}).then(function(tag) {
				return new Promise(function(resolve, reject) {
					Logger.info('[Tags] Replacing Spotify track for '+ shazamId +' : adding new track to playlist.');
					Spotify.playlist.addTracks([newSpotifyId], function(err) {
						if(err) {
							return reject(err);
						}

						return resolve(tag);
					});
				});

			// -- Getting track details from Spotify --
			}).then(function(tag) {
				Logger.info('[Tags] Replacing Spotify track for '+ shazamId +' : getting track details from Spotify.');
				return new Promise(function(resolve, reject) {
					Spotify.getTrack(newSpotifyId, function(err, track) {
						if(err) {
							return reject(err);
						}

						return resolve({
							tag: tag,
							track: track
						});
					});
				});

			// -- Update tag in DB with new spotifyId --
			}).then(function(result) {
				Logger.info('[Tags] Replacing Spotify track for '+ shazamId +' : updating tag in DB.');
				result.tag = Tags.setSpotifyInfosToTag(result.tag, result.track);
				result.tag.status = 4;

				return Tags.db.put(result.tag);

			// -- Finished --
			}).then(function() {
				Logger.info('[Tags] Replacing Spotify track for '+ shazamId +' : all done!');
				return callback();

			// -- Catch all errors --
			}).catch(function(reason) {
				Logger.error('[Tags] Error trying to replace Spotify track for '+ shazamId +'.');
				Logger.error(reason);
				return callback(reason);
			});
		},

		// Remove track from playlist if not used by another tag
		removeTrackFromPlaylist: function(shazamId, spotifyId, callback) {
			Tags.db.where('spotifyId').equals(spotifyId).filter(function(tag) {
				// Filter to get only tags != to the one for which we want to remove the track
				return tag.shazamId !== shazamId;
			}).count().then(function(count) {
				Logger.info('[Tags] Removing Spotify track '+ spotifyId +' : '+ count +' other tags have the old one too.');
				// No other tags linked to the old Spotify track except this one
				if(count === 0) {
					Logger.info('[Tags] Removing Spotify track '+ spotifyId +' : no other tag is linked to the old track, removing from playlist.');

					Spotify.playlist.removeTracks([spotifyId], function(err) {
						if(err) {
							return callback(err);
						}

						return callback();
					});
				} else {
					return callback();
				}
			});
		},

		// Set a tag as not found
		// Will stop searching automatically for it
		setAsNotFound: function(shazamId, callback) {
			var Promise = Dexie.Promise;

			Tags.db.get(shazamId).then(function(tag) {
				var oldSpotifyId = tag.spotifyId;

				Logger.info('[Tags] Setting '+ shazamId +' as not found.');

				var promise = Promise.resolve(tag);

				// -- Remove old track from playlist --
				// Tag was already linked to a Spotify track, but we link it to a new one
				// If other tags are linked to the old track -> don't change anything in playlist
				// If no other is linked to it, remove it to playlist
				if(tag.spotifyId) {
					Logger.info('[Tags] Checking if we need to remove Spotify track for '+ shazamId +' from playlist.');
					promise.then(function(tag) {
						return new Promise(function(resolve, reject) {
							Tags.removeTrackFromPlaylist(shazamId, tag.spotifyId, function(err) {
								if(err) {
									return reject(err);
								}

								return resolve(tag);
							});
						});
					});
				}

				return promise;

			// -- Update tag in DB --
			}).then(function(tag) {
				Logger.info('[Tags] Setting '+ shazamId +' as not found: updating tag in DB.');
				tag.image = null;
				tag.previewUrl = null;
				tag.spotifyId = null;
				tag.status = 5; // Manual search

				return Tags.db.put(tag);

			// -- Finished -- 
			}).then(function() {
				Logger.info('[Tags] Setting '+ shazamId +' as not found: all done!');
				return callback();

			// -- Catch all errors --
			}).catch(function(reason) {
				Logger.error('[Tags] Error trying to setting '+ shazamId +' as not found.');
				Logger.error(reason);
				return callback(reason);
			});
		},

		// Save tags data (lastUpdate)
		save: function(callback) {
			callback = callback || function(){};

			Logger.info('[Tags] Saving tags data.');

			Tags.data.set({'lastUpdate': Tags.lastUpdate.getTime()}, function() {
				callback();
			});
		},

		getList: function(options, callback) {
			options = options || {};
			callback = callback || function(){};

			var tags = Tags.db;

			tags = tags.orderBy('date').reverse();

			// Count all tags before filtering them
			tags.count().then(function(totalCount) {

				/* 
					{
						status: [1, 2, 3, 4], // Will be translated to .where('status').anyOf([1, 2, 3, 4])
						name: 'Hello' 				// Will be translated to .and('name').equals('Hello')
					}
				*/
				if(options.where) {
					tags.filter(function(tag) {
						var found = true;
						Object.keys(options.where).forEach(function(key) {
							if(Array.isArray(options.where[key])) {
								found = found && options.where[key].indexOf(tag[key]) !== -1;
							} else {
								found = found && tag[key] === options.where[key];
							}
						});

						return found;
					});
				}

				// Count filtered tags
				return tags.count().then(function(count) {
					if(options.limit) {
						if('offset' in options) {
							tags = tags.offset(options.offset);
						}

						tags = tags.limit(options.limit);
					}

					return tags.toArray().then(function(list) {
						return callback(null, {
							totalCount: totalCount,
							count: count,
							list: list
						});
					});
				});
			}).catch(function(reason) {
				return callback(reason);
			});
		},

		count: function(callback) {
			Tags.db.count().then(function(tagsCount) {
				return callback(null, tagsCount);
			}).catch(function(reason) {
				return callback(reason);
			});
		},
		
		// Load tags data (list & lastUpdate)
		load: function(callback) {
			callback = callback || function(){};
			
			Tags.data.get('lastUpdate', function(items) {				
				Tags.lastUpdate = new Date(items.lastUpdate) || new Date(0);
				Tags.lastUpdate = (!isNaN(Tags.lastUpdate.valueOf())) ? Tags.lastUpdate : new Date(0);

				Tags.count(function(error, tagsCount) {
					if(error) {
						return Logger.error('[Tags] Error counting tags in DB : '+ error +'.');
					}

					Logger.info('[Tags] '+ tagsCount +' items in DB.');
				});
				
				Logger.info('[Tags] Got from storage -> lastUpdate: '+ Tags.lastUpdate +'.');

				callback();
			});
		},

		data: new StorageHelper('Tags', 'sync'),
		db: Database.tags
	};

	window.s2s.Tags = Tags;
})(window.s2s.Db, window.s2s.StorageHelper, window.s2s.Logger, window.s2s.Spotify, window.s2s.Shazam);