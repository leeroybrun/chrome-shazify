angular.module('Shazam2Spotify').factory('Helper', function() {
	var Helper = {
		// Thanks : http://stackoverflow.com/a/1714899/1160800
		serializeUrlVars: function(obj) {
			var str = [];
			for(var p in obj)
				if (obj.hasOwnProperty(p)) {
					str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				}
			return str.join("&");
		},

		// Thanks : http://stackoverflow.com/a/4656873/1160800
		getUrlVars: function(url) {
		    var vars = [], hash;
		    var hashes = url.slice(url.indexOf('?') + 1).split('&');
		    for(var i = 0; i < hashes.length; i++)
		    {
		        hash = hashes[i].split('=');
		        vars.push(hash[0]);
		        vars[hash[0]] = hash[1];
		    }
		    return vars;
		},

		// Thanks : https://github.com/spotify/web-api-auth-examples/blob/master/authorization_code/app.js#L24
		generateRandomString: function(length) {
			var text = '';
			var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

			for (var i = 0; i < length; i++) {
				text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			return text;
		}
	};

	return Helper;
});