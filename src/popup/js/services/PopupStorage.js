angular.module('Shazify').factory('PopupStorage', function(BackgroundService) {
	var PopupStorage = new BackgroundService.StorageHelper('Popup', 'sync');
	
	return PopupStorage;
});