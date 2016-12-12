(function(Database, StorageHelper, Logger, Spotify, Shazam){
	var Tags = {
		lastUpdate: new Date(0),

		// Add/update a tag in the tags list
		add: function(tag, callback) {
			callback = callback || function(){};

			tag.spotifyId = tag.spotifyId || null;
			tag.status = tag.status || 1; // Status : 1 = just added, 2 = not found in spotify, 3 = found, 4 = added to playlist

			tag.query = tag.query || Spotify.genQuery(tag.name, tag.artist);

			tag.date = (tag.date instanceof Date) ? tag.date.getTime() : tag.date;

			// Search track on Spotify, if not already found
			if(tag.status < 3) {
				Spotify.findTrack(tag.query, tag.name, tag.artist, function(err, track) {
					if(err || !track) {
						tag.status = 2;
					} else {
						tag.status = 3;
						tag.image = track.album.images[track.album.images.length-1].url;
						tag.spotifyId = track.id;
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
					Logger.info('[Tags] Got '+ tags.length +' tags from Shazam.');

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

			var tags = Tags.db.orderBy('date');

			/* 
				{
					status: [1, 2, 3, 4], // Will be translated to .where('status').anyOf([1, 2, 3, 4])
					name: 'Hello' 				// Will be translated to .and('name').equals('Hello')
				}
			*/
			if(options.where) {
				var firstWhere = true;
				Object.keys(options.where).forEach(function(key) {
					if(firstWhere) {
						tags = tags.where(key);
						firstWhere = false;
					} else {
						tags = tags.and(key);
					}

					if(Array.isArray(options.where[key])) {
						tags = tags.anyOf(options.where[key]);
					} else {
						tags = tags.equals(options.where[key]);
					}
				});
			}

			if(options.offset) {
				tags = tags.offset(options.offset);
			}

			if(options.limit) {
				tags = tags.limit(options.limit);
			}

			tags.toArray().then(function(tagsList) {
				return callback(null, tagsList);
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