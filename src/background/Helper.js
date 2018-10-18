(function(){
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

		getUrlVars: function(url) {
		    var re = /[\\?&]([^&#=]*)=([^&#]*)/g;
			var params = {};
			var match;

			while ((match = re.exec(url)) !== null) {
			    params[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
			}

			return params;
		},

		// Thanks : https://github.com/spotify/web-api-auth-examples/blob/master/authorization_code/app.js#L24
		generateRandomString: function(length) {
			var text = '';
			var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

			for (var i = 0; i < length; i++) {
				text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			return text;
		},

		escapeRegExp: function(string) {
		    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
		},

		replaceAll: function(string, find, replace) {
			return string.replace(new RegExp(Helper.escapeRegExp(find), 'g'), replace);
		},

		replaceAllMulti: function(string, find, replace) {
			for(var i = 0; i < find.length; i++) {
				string = string.replace(new RegExp(Helper.escapeRegExp(find[i]), 'g'), replace[i]);
			}

			return string;
		}
	};

	window.s2s.Helper = Helper;
})();