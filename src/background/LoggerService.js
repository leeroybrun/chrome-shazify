(function(){
	var Logger = {
		logs: [],

		info: function(data) {
			console.log(data);
			Logger.add('info', data);
		},

		error: function(data) {
			console.error(data);
			Logger.add('error', data);
		},

		add: function(type, data) {
			var log = {
				type: type,
				date: new Date(),
				message: ''
			};

			if(data instanceof Error) {
				log.message = data.toString();
				log.stack = data.stack;
			} else {
				log.message = data;
			}

			Logger.logs.unshift(log);
		},

		exportLogs: function() {
			var data = '';

			Logger.logs.forEach(function(log) {
				data += '['+ log.type +'] '+ log.date.toISOString() +' - '+ log.message;

				if(log.stack) {
					data += log.stack;
				}

				data += '\n';
			});

			return data;
		},

		exportLogsMessages: function() {
			var data = '';

			Logger.logs.forEach(function(log) {
				data += log.message;

				if(log.stack) {
					data += log.stack;
				}

				data += '\n';
			});

			return data;
		}
	};

	window.s2s.Logger = Logger;
})();