(function(StorageHelper, Logger, Spotify, Shazam){
	var Tags = {
		list: [],
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
				Spotify.findTrack(tag.query, function(err, track) {
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
			// TODO: use Array.prototype.find when available on Chrome
			var found = false;
			for(var i in Tags.list) {
				if(Tags.list[i].shazamId == tag.shazamId) {
					found = true;
					$.extend(Tags.list[i], tag); // Update existing tag
					break;
				}
			}

			if(!found) {
				Tags.list.push(tag);
			}

			Tags.list.sort(function (a, b) {
				if (a.date > b.date) { return -1; }
				if (a.date < b.date) { return 1; }
				return 0;
			});

			callback();
		},

		// Update tags list from MyShazam and then update Spotify playlist
		update: function(callback) {
			Logger.info('[Tags] Updating since '+ Tags.lastUpdate +'.');

			Shazam.getTags(Tags.lastUpdate, function(err, tags) {
				if(!err && Array.isArray(tags)) {
					Logger.info('[Tags] Got '+ tags.length +' tags from Shazam.');

					if(tags.length === 0) {
						return callback();
					}

					Tags.lastUpdate = new Date();

					async.eachSeries(tags, function(tag, cbe) {
						Tags.add(tag, function() {
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

			var tracksToAdd = [];    // Used to revert "status" if an error occurs
			var tracksIdsToAdd = []; // Used to add tracks to playlist

			for(var i in Tags.list) {
				var tag = Tags.list[i];

				if(tag.status == 3) { 
					tracksToAdd.push(tag);
					tracksIdsToAdd.push(tag.spotifyId);
					tag.status = 4;
				}
			}

			Spotify.playlist.addTracks(tracksIdsToAdd, function(err) {
				if(err) {
					Logger.info('[Tags] Cannot add tags to playlist, reverting tags status.');
					// If an error occurs, revert tag status to 3. This will let the system retry addition later.
					for(var i in tracksToAdd) {
						tracksToAdd[i].status = 3;
					}
				}

				Tags.save(callback);
			});
		},

		// Save tags data (list & lastUpdate)
		save: function(callback) {
			callback = callback || function(){};

			Logger.info('[Tags] Saving tags data.');

			Tags.data.set({'tagsList': Tags.list, 'lastUpdate': Tags.lastUpdate.getTime()}, function() {
				callback();
			});
		},
		
		// Load tags data (list & lastUpdate)
		load: function(callback) {
			callback = callback || function(){};
			
			Tags.data.get(['tagsList', 'lastUpdate'], function(items) {
				Tags.list = items.tagsList || [];
				Tags.lastUpdate = new Date(items.lastUpdate) || new Date(0);
				Tags.lastUpdate = (!isNaN(Tags.lastUpdate.valueOf())) ? Tags.lastUpdate : new Date(0);

				Logger.info('[Tags] Got from storage -> tagsList: '+ Tags.list.length +' items.');
				Logger.info('[Tags] Got from storage -> lastUpdate: '+ Tags.lastUpdate +'.');

				callback();
			});
		},

		data: new StorageHelper('Tags')
	};

	window.s2s.Tags = Tags;
})(window.s2s.StorageHelper, window.s2s.Logger, window.s2s.Spotify, window.s2s.Shazam);