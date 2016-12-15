angular.module('Shazify').controller('TagsCtrl', function($scope, $location, $interval, $timeout, $anchorScroll, BackgroundService, PopupStorage, LoginService, TagsService, SpotifyService) {
	$scope.login = LoginService;

	$scope.updateStatus = '';
	$scope.updating = function() { return TagsService.updating(); };
  $scope.updatingApp = function() { return TagsService.updatingApp(); };
	$scope.items = [];
  $scope.totalCount = 0;
  $scope.filteredCount = 0;

	$scope.loading = true;

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if(message.action && message.action === 'forcePopupUpdate') {
      $timeout(function() {
        updateList();
      }, 0);
    }
  });

	function updateList() {
		$scope.loading = true;
		TagsService.getList($scope.tagsStatusFilters, $scope.pagination.offset(), $scope.pagination.limit(), function(error, result) {
      if(error) {
        console.error(error);
        return console.error('Error getting tags list : '+ error);
      }

      $scope.items = result.list;
      $scope.filteredCount = result.count;
      $scope.totalCount = result.totalCount;
      $scope.loading = false;
		});
	}

	$scope.shouldShowFilters = false;
	$scope.toggleShowFilters = function() {
		$scope.shouldShowFilters = !$scope.shouldShowFilters;
	};

	// Status : 1 = just added, 2 = not found in spotify, 3 = found, 4 = added to playlist, 5 = not found, manual search
	$scope.statusFilters = [
		{
			icon: 'icon-check',
			status: [1, 3, 4]
		},
		{
			icon: 'icon-close',
			status: [2, 5]
		}
	];

  $scope.isFilterSelected = function(statusArr) {
    if(!Array.isArray(statusArr)) {
      statusArr = [statusArr];
    }

    var selected = true;

    statusArr.forEach(function(status) {
      selected = selected && $scope.tagsStatusFilters.indexOf(status) !== -1;
    });

    return selected;
  };

	$scope.tagsStatusFilters = [1, 2, 3, 4, 5];

  $scope.toggleStatusFilter = function(statusArr) {
    if(!Array.isArray(statusArr)) {
      statusArr = [statusArr];
    }

    statusArr.forEach(function(status) {
      var i = $scope.tagsStatusFilters.indexOf(status);
      if(i === -1) {
        $scope.tagsStatusFilters.push(status);
      } else {
        delete $scope.tagsStatusFilters[i];
      }
    });

    updateList();
  };

  $scope.pagination = {
  	page: 0,
  	offset: function() { return this.page * this.limit(); },
    limitString: '10',
  	limit: function() { return parseInt(this.limitString); },

    limitChanged: function() {
      this.page = 0;

      $timeout(function() {
        updateList();
      }, 0);
    },

  	nbPages: function() {
      return (this.limit() === 0) ? 1 : Math.ceil($scope.filteredCount / this.limit());
    },

  	hasNextPage: function() {
  		return this.page < this.nbPages();
  	},
  	nextPage: function() {
  		if(!this.hasNextPage()) {
    		return;
    	}

  		this.page++;

      $anchorScroll();

      $timeout(function() {
        updateList();
      }, 0);
  	},

  	hasPrevPage: function() {
  		return this.page > 0;
  	},
  	prevPage: function() {
  		if(!this.hasPrevPage()) {
    		return;
    	}

  		this.page--;

      $anchorScroll();

  		$timeout(function() {
        updateList();
      }, 0);
  	}
  };

	var updateStatus = function(){
		TagsService.getUpdateStatus(function(status){
			$scope.updateStatus = '('+ status.added +'/'+ status.all +')';
		});
	};

	var refreshTags = function() {
		TagsService.updateTags(function() {
			// Called multiple times to update list/count during update
			updateStatus();
			updateList();
		}, function(err) {
			// Final callback called only once
			if(err) {
				return $location.path('/settings');
			}

			// Tags updated !
			console.log('Tags updated !');
		});

		updateStatus();
	};

	$scope.refreshTags = refreshTags;

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
    isSelectedTrack: function(track) {
      return this.selectedTrack && track.id == this.selectedTrack.id;
    },

    send: function() {
      $scope.loading = true;

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

          $scope.loading = false;
        });
      });
    },

    setNotFound: function() {
      $scope.newSearch.tag.spotifyId = null;
      $scope.newSearch.tag.status = 5;
      $scope.newSearch.tag.image = null;
      $scope.newSearch.tag.previewUrl = null;

      TagsService.setAsNotFound($scope.newSearch.tag.shazamId, function(err) {
        if(err) {
          console.error(err);
        }

        updateList();
      });

      $scope.newSearch.error = null;
      $scope.newSearch.tag = null;
      $scope.newSearch.show = false;
    },

    selectTrack: function(track) {
      $scope.newSearch.tag.spotifyId = track.id;
      $scope.newSearch.tag.status = 3;
      $scope.newSearch.tag.image = track.image;

      TagsService.selectSpotifyTrack($scope.newSearch.tag.shazamId, track.id, function(err) {
        if(err) {
          console.error(err);
        }

        updateList();
      });

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