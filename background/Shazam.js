var Shazam = function() {
	this.lastTagsUpdate = null;
	this.newTags = [];
};

Shazam.prototype.openLogin = function() {
	ChromeHelper.focusOrCreateTab('https://www.shazam.com/myshazam');
};

Shazam.prototype.loginStatus = function(callback) {
	$.get('https://www.shazam.com/fragment/myshazam')
		.done(function() {
			callback(true);
		})
		.fail(function(jqXHR) {
			if(jqXHR.status === 401) {
				callback(false);
			} else {
				callback(true);
			}
		});
};

Shazam.prototype.updateTags = function(lastTagsUpdate, callback) {
	var shazam = this;

	shazam.lastTagsUpdate = new Date(lastTagsUpdate) || new Date(0);
	shazam.lastTagsUpdate = (!isNaN(shazam.lastTagsUpdate.valueOf())) ? shazam.lastTagsUpdate : new Date(0);

	shazam.newTags = [];

	shazam.fetchTags('/fragment/myshazam', function(error) {
		if(error) {
			callback(error);
		} else {
			shazam.lastTagsUpdate = new Date()
			callback(null, shazam.newTags);
		}
	});
};

Shazam.prototype.fetchTags = function(path, callback) {
	var shazam = this;

	if(typeof callback === 'undefined' && typeof path === 'function') {
		callback = path;
		path = null;
	}

	callback = callback || function(){};
	path = path || '/fragment/myshazam';

	$.get('https://www.shazam.com'+ path)
		.done(function(data) {
			if(data && typeof data === 'object' && data.feed.indexOf('ms-no-tags') == -1) {
				var lastTagDate = $('<div/>').append(data.feed).find('article').last().find('.tl-date').attr('data-time');
					lastTagDate = new Date(parseInt(lastTagDate));

				shazam.parseTags(data.feed, function() {
					if(data.previous && data.feed.indexOf('ms-no-tags') == -1 && lastTagDate > shazam.lastTagsUpdate) {
						setTimeout(function() {
							shazam.fetchTags(data.previous, callback);
						}, 2000);
					} else {
						callback(null);
					}
				});
			} else {
				callback(null);
			}
		})
		.fail(function(jqXHR) {
			if(jqXHR.status === 401) {
				callback(new Error('Please login on MyShazam before requesting tags'));
			} else {
				callback(null);
			}
		});
};

Shazam.prototype.parseTags = function(data, callback) {
	var shazam = this;

	$('<div/>').append(data).find('article').each(function() {
		var date = parseInt($('.tl-date', this).attr('data-time'));

		if(new Date(date) > shazam.lastTagsUpdate) {
			shazam.newTags.push({
				id: $(this).attr('data-track-id'),
				name: $('[data-track-title]', this).text().trim(),
				artist: $('[data-track-artist]', this).text().trim().replace(/^by /, ''),
				date: date,
				image: $('img[itemprop="image"]', this).attr('src')
			});
		}
	});

	callback();
};