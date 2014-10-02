var shazamHelper = new Shazam();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if(request.action === 'Shazam.openLogin') {
		shazamHelper.openLogin();
	} else if(request.action === 'Shazam.loginStatus') {
		shazamHelper.loginStatus(function(status) {
			sendResponse({
				status: status
			});
		});
	} else if(request.action === 'Shazam.updateTags') {
		if(!request.lastTagsUpdate) {
			return sendResponse({ error: 'Please provide a last tags update date.'});
		}

		shazamHelper.updateTags(request.lastTagsUpdate, function(error, tags) {
			sendResponse({
				error: error,
				tags: tags || [],
				lastTagsUpdate: shazamHelper.lastTagsUpdate
			});
		});
	}
});