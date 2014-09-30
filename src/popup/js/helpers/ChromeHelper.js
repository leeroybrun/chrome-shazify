angular.module('Shazam2Spotify').factory('ChromeHelper', function() {
	var ChromeHelper = {
		focusOrCreateTab: function(url) {
		  chrome.windows.getAll({"populate":true}, function(windows) {
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
		    if (existing_tab) {
		      chrome.tabs.update(existing_tab.id, {"selected":true});
		    } else {
		      chrome.tabs.create({"url":url, "selected":true});
		    }
		  });
		}
	};

	return ChromeHelper;
});