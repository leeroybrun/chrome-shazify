angular.module('Shazam2Spotify').factory('TagsService', function(StorageHelper) {
	var Tags = {
		list: [],

		genSpotifyQuery: function(track, artist) {
			var reSpaces = new RegExp(' ', 'g');

			return 'track:'+ track.replace(reSpaces, '+') +' artist:'+ artist.replace('Feat. ', '').replace(reSpaces, '+');
		},

		add: function(newTag, callback) {
			callback = callback || function(){};

			newTag.spotifyId = newTag.spotifyId || null;
			newTag.status = newTag.status || 1; // Status : 1 = just added, 2 = not found in spotify, 3 = found & added to playlist

			newTag.query = newTag.query || Tags.genSpotifyQuery(newTag.name, newTag.artist);

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