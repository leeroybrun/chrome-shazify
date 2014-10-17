angular.module('Shazam2Spotify').factory('StorageHelper', function() {
	var Storage = function(prefix, type) {
		type = type  || 'local';

		this.type = (['local', 'sync'].indexOf(type) != -1) ? type : 'local';
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
		chrome.storage[this.type].get(toGetFromStorage, function(items) {
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

		chrome.storage[this.type].set(data, function() {
			var error = null;
			if(chrome.runtime.lastError) {
				error = chrome.runtime.lastError;
				console.error('An error occured during storage set: ', error);
			}

			callback(error);
		});
	};

	return Storage;
});