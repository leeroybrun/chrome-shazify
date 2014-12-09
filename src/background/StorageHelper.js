(function(Logger){
	var StorageHelper = function(prefix, type) {
		type = type  || 'local';

		this.type = (['local', 'sync'].indexOf(type) != -1) ? type : 'local';
		this.prefix = prefix;
		this.cache = {};
	};

	StorageHelper.prototype.get = function(names, callback) {
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

			try {
				callback(data);
			} catch(e) {
				Logger.error('An error occured in storage.get callback:');
				Logger.error(e);
			}
		});
	};

	StorageHelper.prototype.set = function(objects, callback) {
		callback = callback || function(){};

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

			try {
				callback(error);
			} catch(e) {
				Logger.error('An error occured in storage.set callback:');
				Logger.error(e);
			}
		});
	};

	StorageHelper.prototype.clearCache = function() {
		this.cache = {};
	};

	window.s2s.StorageHelper = StorageHelper;
})(window.s2s.Logger);