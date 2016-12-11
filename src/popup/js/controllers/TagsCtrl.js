angular.module('Shazify').controller('TagsCtrl', function($scope, $location, $interval, BackgroundService, PopupStorage, LoginService, TagsService, SpotifyService) {
	$scope.login = LoginService;

	$scope.updateStatus = '';
	$scope.updating = function() { return TagsService.updating(); };
	$scope.tags = function() { return TagsService.list; };

	$scope.shouldShowFilters = false;
	$scope.toggleShowFilters = function() {
		$scope.shouldShowFilters = !$scope.shouldShowFilters;
	};

	// Status : 1 = just added, 2 = not found in spotify, 3 = found, 4 = added to playlist
	$scope.statusFilters = [
		{
			icon: 'icon-check',
			status: 4
		},
		{
			icon: 'icon-close',
			status: 2
		},
		{
			icon: 'icon-clock',
			status: 1
		}
	];

	$scope.tagsStatusFilters = [1, 2, 3, 4];

	$scope.filterByStatus = function(tag) {
    return ($scope.tagsStatusFilters.indexOf(tag.status) !== -1);
  };

  $scope.toggleStatusFilter = function(status) {
  	var i = $scope.tagsStatusFilters.indexOf(status);
  	if(i === -1) {
  		$scope.tagsStatusFilters.push(status);
  	} else {
  		delete $scope.tagsStatusFilters[i];
  	}
  };

	$scope.newSearch = {
		show: false,
		tag: null,
		error: null,
		results: [],
		query: {
			artist: '',
			track: ''
		},
		selectedTrack: null,

		send: function() {
			SpotifyService.genQuery($scope.newSearch.query.track, $scope.newSearch.query.artist, function(query) {
				SpotifyService.searchTracks(query, function(err, tracks) {
					if(err) {
						$scope.newSearch.error = chrome.i18n.getMessage('noTrackFoundQuery');
					} else {
						$scope.newSearch.results = tracks;
						$scope.newSearch.error = null;

						// We search on list the current selected track
						if($scope.newSearch.tag.spotifyId) {
							for(var i = 0; i < tracks.length; i++) {
								if(tracks[i].id == $scope.newSearch.tag.spotifyId) {
									$scope.newSearch.selectedTrack = tracks[i];
								}
							}
						}
					}
				});
			});
		},

		selectTrack: function(track) {
			$scope.newSearch.tag.spotifyId = track.id;
			$scope.newSearch.tag.status = 3;
			$scope.newSearch.tag.image = track.image;

			// TODO: Remove old selected from playlist, add this one instead and save tags

			$scope.newSearch.error = null;
			$scope.newSearch.tag = null;
			$scope.newSearch.show = false;
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
		$scope.newSearch.results = [];
		$scope.newSearch.selectedTrack = null;
		$scope.newSearch.show = true;

		$scope.newSearch.send();
	};

	var updateStatus = function(){
		TagsService.getUpdateStatus(function(status){
			$scope.updateStatus = '('+ status.added +'/'+ status.all +')';
		});
	};

	var refreshTags = function() {
		// This timer will update the status of tags addition
		var refreshTimer = setInterval(function(){
			updateStatus();
		}, 3000);

		TagsService.updateTags(function(err) {
			clearInterval(refreshTimer);

			if(err) {
				return $location.path('/settings');
			}

			// Tags updated !
			console.log('Tags updated !');
		});

		updateStatus();
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