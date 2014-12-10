(function(){
	var ChromeHelper = {
		findExistingTab: function(url, callback) {
			chrome.windows.getAll({'populate': true}, function(windows) {
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

				callback(existing_tab);
			});
		},
		
		// Remove existing tab, and recreate it
		removeAndCreateTab: function(url) {
			ChromeHelper.findExistingTab(url, function(existing_tab) {
				if (existing_tab) {
					chrome.tabs.remove(existing_tab.id);
				}
				
				chrome.tabs.create({'url': url, 'selected': true});
			});
		},

		// Focus existing tab or create it
		focusOrCreateTab: function(url) {
			ChromeHelper.findExistingTab(url, function(existing_tab) {
				if (existing_tab) {
					chrome.tabs.reload(existing_tab.id, {'bypassCache': true});
					chrome.tabs.update(existing_tab.id, {'selected': true});
				} else {
					chrome.tabs.create({'url': url, 'selected': true});
				}
			});
		},

		clearStorage: function() {
			chrome.storage.local.clear();
			chrome.storage.sync.clear();
		}
	};

	window.s2s.ChromeHelper = ChromeHelper;
})();