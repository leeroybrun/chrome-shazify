(function(Logger){
	var Db = (function() {
		var db = new Dexie('Shazify');

		/*db.version(1).stores({
		    users: "++id, name, &username, *email, address.city",
		    relations: "++, userId1, userId2, [userId1+userId2], relation"
		});

		db.open().catch(function (e) {
		    console.error("Open failed: " + e.stack);
		});*/

		return db;
	}());

	window.s2s.Db = Db;
})(window.s2s.Logger);