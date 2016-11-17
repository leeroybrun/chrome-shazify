(function(StorageHelper, Logger, Spotify, Shazam){
	var Db = (function() {
		var tDB = {};
		var datastore = null;

		/**
		* Open a connection to the datastore.
		*/
		tDB.open = function(callback) {
			// Database version.
			var version = 1;

			// Open a connection to the datastore.
			var request = indexedDB.open('todos', version);

			// Handle datastore upgrades.
			request.onupgradeneeded = function(e) {
				var db = e.target.result;

				e.target.transaction.onerror = tDB.onerror;

				// Delete the old datastore.
				if (db.objectStoreNames.contains('todo')) {
					db.deleteObjectStore('todo');
				}

				// Create a new datastore.
				var store = db.createObjectStore('todo', {
					keyPath: 'timestamp'
				});
			};

			// Handle successful datastore access.
			request.onsuccess = function(e) {
				// Get a reference to the DB.
				datastore = e.target.result;

				// Execute the callback.
				callback();
			};

			// Handle errors when opening the datastore.
			request.onerror = tDB.onerror;
		};

		// Export the tDB object.
		return tDB;
	}());

	window.s2s.Db = Db;
})(window.s2s.StorageHelper, window.s2s.Logger, window.s2s.Spotify, window.s2s.Shazam);