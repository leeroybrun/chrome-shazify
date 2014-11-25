(function(StorageHelper){
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
			callback = callback || function(){};

			Tags.data.set({'tagsList': Tags.list}, function() {
				callback();
			});
		},
		
		load: function(callback) {
			callback = callback || function(){};
			
			Tags.data.get('tagsList', function(items) {
				Tags.list = items.tagsList || [];

				callback();
			});
		},

		data: new StorageHelper('Tags')
	};

	window.s2s.Tags = Tags;
})(window.s2s.StorageHelper);