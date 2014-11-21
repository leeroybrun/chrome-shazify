angular.module('Shazam2Spotify').controller('TagsCtrl', function($scope, $location, $timeout, BackgroundService) {
	$scope.updating = true;

	$scope.tags = BackgroundService.Tags.list;

	$scope.updateTags = function(callback) {
		$scope.updating = true;

		BackgroundService.Shazam.updateTags(function(err) {
			$scope.updating = false;

			if(err) {
				$scope.$apply(function() {
					$location.path('/settings');
				});
			}
			
			callback();
		});
	};

	$scope.newSearch = {
		show: false,
		tag: null,
		error: null,
		query: {
			artist: '',
			track: ''
		},
		send: function() {
			var query = BackgroundService.Spotify.genQuery($scope.newSearch.query.track, $scope.newSearch.query.artist);

			BackgroundService.Spotify.playlist.searchAndAddTag($scope.newSearch.tag, query, true, function(error) {
				if(error) {
					$scope.newSearch.error = chrome.i18n.getMessage('noTrackFoundQuery');
				} else {
					$scope.newSearch.error = null;
					$scope.newSearch.tag = null;
					$scope.newSearch.show = false;
				}
			});
		},
		cancel: function() {
			$scope.newSearch.error = null;
			$scope.newSearch.tag = null;
			$scope.newSearch.show = false;
		}
	};

	$scope.retryTagSearch = function(tag) {
		$scope.newSearch.query.artist = tag.artist;
		$scope.newSearch.query.track = tag.name;
		$scope.newSearch.tag = tag;
		$scope.newSearch.show = true;
	};

	function checkLogin(callback) {
		BackgroundService.Shazam.loginStatus(function(status) {
			if(status === false) {
				return callback(false);
			}

			BackgroundService.Spotify.loginStatus(function(status) {
				if(status === false) {
					return callback(false);
				}

				callback(true);
			});
		});
	}

	var refreshTags = function() {
		checkLogin(function(status) {
			if(status === true) {
				BackgroundService.Spotify.playlist.get(function(err) {
					if(err) {
						$location.path('/settings');
						$scope.$apply();
						return;
					}

					BackgroundService.Tags.load(function() {
						$scope.tags = Tags.list;

						$scope.updateTags(function() {
							BackgroundService.Spotify.playlist.searchAndAddTags(function() {
								// Tags added
							});
						});
					});
				});
			} else {
				$location.path('/settings');
				$scope.$apply();
			}
		});
	};

	$scope.refreshTags = refreshTags;

	refreshTags();
});