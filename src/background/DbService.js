(function(Logger){
	var Db = (function() {
		var db = new Dexie('Shazify');

		db.version(1).stores({
			// shazamId is primary key & unique
		  tags: 'shazamId, date, spotifyId, status', // name, artist, query, image
		});

		db.open().catch(function (e) {
		  console.error("Open failed: " + e.stack);
		});

		return db;
	}());

	window.s2s.Db = Db;
})(window.s2s.Logger);