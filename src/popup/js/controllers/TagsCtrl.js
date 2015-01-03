angular.module('Shazify').controller('TagsCtrl', function($scope, $location, $interval, BackgroundService, PopupStorage, LoginService, TagsService) {
	$scope.login = LoginService;

	$scope.updating = function() { return TagsService.updating(); };
	$scope.tags = function() { return TagsService.list; };

	$scope.newSearch = {
		show: false,
		tag: null,
		error: null,
		query: {
			artist: '',
			track: ''
		},
		send: function() {
			TagsService.searchTag($scope.newSearch.query.track, $scope.newSearch.query.artist, $scope.newSearch.tag, function(err) {
				if(err) {
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

	var refreshTags = function() {
		TagsService.updateTags(function(err) {
			if(err) {
				return $location.path('/settings');
			}

			// Tags updated !
			console.log('Tags updated !');
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