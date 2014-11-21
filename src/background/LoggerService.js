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

		Logger.logs.push(log);
	}
};