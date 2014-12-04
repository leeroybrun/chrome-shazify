(function(){
	var Icon = {
		load: function() {
			var icon = this;

			this.loaded = false;

			this.interval = null;

			this.canvas = document.createElement('canvas');
			document.body.appendChild(this.canvas);
		    this.ctx = this.canvas.getContext('2d');

		    this.img = new Image();
		    this.img.src = '../icons/icon19.png';

		    this.ang = 0; //angle
		    this.fps = 1000 / 10; //number of frames per sec

		    this.img.onload = function () {
		    	icon.loaded = true;

		        icon.canvas.width = this.width;
		        icon.canvas.height = this.height;
		        icon.cache = this; //cache the local copy of image element for future reference

	            icon.ctx.clearRect(0, 0, icon.canvas.width, icon.canvas.height); //clear the canvas
	            icon.ctx.drawImage(icon.img, 0, 0);

		        var imageData = icon.ctx.getImageData(0, 0, 19, 19);
		        chrome.browserAction.setIcon({ imageData: imageData });
		    };
		},

		startRotation: function() {
			if(!this.loaded) {
				if(!this.img) {
					Icon.load();
				}

				setTimeout(function() {
					Icon.startRotation();
				}, 2000);

				return;
			}

			var icon = this;

			this.ang = 0;

			this.interval = setInterval(function () {
				icon.ctx.save();
	            icon.ctx.clearRect(0, 0, icon.canvas.width, icon.canvas.height); //clear the canvas
	            icon.ctx.translate(icon.cache.width/2, icon.cache.height/2);
	            icon.ctx.rotate(Math.PI / 180 * (icon.ang += 10)); //increment the angle and rotate the image 
	            icon.ctx.drawImage(icon.img, -icon.cache.width / 2, -icon.cache.height / 2, icon.cache.width, icon.cache.height); //draw the image ;)
				icon.ctx.restore();

	            var imageData = icon.ctx.getImageData(0, 0, 19, 19);
		        chrome.browserAction.setIcon({ imageData: imageData });
	        }, this.fps);
		},

		stopRotation: function() {
			clearInterval(this.interval);
			this.interval = null;

			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); //clear the canvas
            this.ctx.drawImage(this.img, 0, 0);

	        var imageData = this.ctx.getImageData(0, 0, 19, 19);
	        chrome.browserAction.setIcon({ imageData: imageData });
		}
	};

	window.s2s.Icon = Icon;
})();