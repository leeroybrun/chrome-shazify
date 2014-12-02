window.s2s = {};

$(document).ready(function() {
	s2s.Logger.info('[init] Welcome ! '+ (new Date()));
	s2s.Logger.info('[init] Loading tags from storage...');

	s2s.Tags.load(function() {
		s2s.Logger.info('[init] '+ s2s.Tags.list.length +' tags loaded.');
	});

	// When we receive a "clearStorage" message, we need to close popup and then clear storage
	chrome.extension.onMessage.addListener(function(request,sender,sendResponse)
	{
	    if(request.greeting === 'clearStorage')
	    {
	    	// Close popup before cleaning storage if we don't want Chrome to crash on Windows
	        var popup = chrome.extension.getViews({type: 'popup'})[0];
	        popup.window.close();

	        s2s.Logger.info('[core] Cleaning extension\'s background data.');

	        s2s.ChromeHelper.clearStorage();

	        // Reload background script
	        //window.location.reload();

	        // Clear cached data from background script
	        s2s.Tags.list = [];
	        s2s.Tags.data.clearCache();
	        s2s.Shazam.data.clearCache();
	        s2s.Spotify.data.clearCache();
	    }
	});	
});