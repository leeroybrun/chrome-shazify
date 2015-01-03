angular.module('Shazify').controller('IntroCtrl', function($scope, $location, PopupStorage, BackgroundService, LoginService) {
	$scope.currentStep = 1;

	$scope.goTo = function(step) {
		$scope.currentStep = step;

		PopupStorage.set({introStep: step});
	};

	$scope.goToTags = function() {
		$scope.goTo(4); // This let us know if the user accomplished the intro
		$location.path('/');
	};

	// Get current step from storage
	PopupStorage.get('introStep', function(items) {
		var step;

		if(items.introStep) {
			step = items.introStep;
		} else {
			step = 1;
		}

		// Finished intro ? Go to tags
		if(step >= 4) {
			$scope.goToTags();
		// Not finished intro, but already started... go to current step
		} else if($scope.currentStep != step) {
			$scope.goTo(step);
		}
	});

	$scope.login = LoginService;
});