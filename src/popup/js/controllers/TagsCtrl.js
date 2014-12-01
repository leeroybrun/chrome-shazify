angular.module('Shazam2Spotify').controller('TagsCtrl', function($scope, $location, $interval, BackgroundService, PopupStorage) {
	$scope.updating = true;

	$scope.tags = BackgroundService.Tags.list;

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

				$scope.$apply();
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
		$scope.updating = true;
		
		checkLogin(function(status) {
			if(status === true) {
				BackgroundService.Spotify.playlist.get(function(err) {
					if(err) {
						$location.path('/settings');
						$scope.$apply();
						return;
					}

					BackgroundService.Tags.load(function() {
						$scope.tags = BackgroundService.Tags.list;

						// Dirty is dirty... refresh scope every 2s to view tags updating progress
						var interval = $interval(function() {
							$scope.$apply();
						}, 2000);

						BackgroundService.Shazam.updateTags(function(err) {
							$interval.cancel(interval);
							$scope.$apply();

							if(err) {
								return $scope.$apply(function() {
									$location.path('/settings');
								});
							}

							// Dirty is dirty... refresh scope every 2s to view tags updating progress
							interval = $interval(function() {
								$scope.$apply();
							}, 2000);

							BackgroundService.Spotify.playlist.searchAndAddTags(function() {
								$scope.updating = false;
								$interval.cancel(interval);
								$scope.$apply();
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

	// Do we need to show intro ?
	PopupStorage.get('introStep', function(items) {
		if(items.introStep && items.introStep >= 4) {
			refreshTags();
		} else {
			$location.path('/intro');
			$scope.$apply();
		}
	});
});