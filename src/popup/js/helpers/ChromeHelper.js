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
		},

		exportData: function(fileName, data) {
			window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

			window.requestFileSystem(window.TEMPORARY, 5*1024*1024, function(fs) {
				fs.root.getFile(fileName, {create: true}, function(fileEntry) { // test.bin is filename
				    fileEntry.createWriter(function(fileWriter) {
				    	
				        var truncated = false;
				        fileWriter.onwriteend = function(err) {
				        	if (!truncated) {
					            truncated = true;
					            this.truncate(this.position);
					            return;
					        }

				            ChromeHelper.focusOrCreateTab(fileEntry.toURL());
				        };

				        fileWriter.onerror = function(error) {
					        console.error(error);
					    };

				        var blob = new Blob([data], {type: 'text/plain'});
				        fileWriter.write(blob);

				    }, function(error) {
						console.error(error);
					});
				}, function(error) {
					console.error(error);
				});
			}, function(error) {
				console.error(error);
			});
		}
	};

	return ChromeHelper;
});