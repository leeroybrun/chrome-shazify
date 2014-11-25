window.s2s = {};

$(document).ready(function() {
	s2s.Logger.info('[init] Welcome ! '+ (new Date()));
	s2s.Logger.info('[init] Loading tags from storage...');

	s2s.Tags.load(function() {
		s2s.Logger.info('[init] '+ s2s.Tags.list.length +' tags loaded.');
	});
});