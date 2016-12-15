# Changelog

## v0.4.4

- [x] Add tracks in the right order on Spotify (new tracks first)
- [x] Add setting to recreate tracks in playlist
- [x] Update script to automatically reorder tracks in playlist when updated to v0.4.4
- [x] When app update is completed, send message to popup to force update
- [x] Show tags & app updates in settings too
- [x] Change rotation or CanvasIcon to match popup icons' rotation

## v0.4.3

- [x] Bugfix in v0.4.2 update script

## v0.4.2

- [x] If tags list was empty, force reload on update to v0.4.x
- [x] Show loading indicator when searching tracks
- [x] Translate "Successful login on Shazam" message

## v0.4.1

- [x] Add Content Scripts to bundle

## v0.4.0

- [x] Store tags in IndexedDB instead of Local Storage
- [x] Pagination
- [x] Filter tags by status
- [x] Handle new Shazam login & API
- [x] Manually select the track we want from Spotify
- [x] Audio preview
- [x] Set a track as "not found" if none of the results is corresponding
- [x] New icons
- [x] Handle "Too Many Requests" error on Spotify
- [x] Update AngularJS to 1.5.9
- [x] Update scripts handle versions like 0.2.10 (two diggits / part)
- [x] Do not match a Spotify track if the title is not the same (lower case matching)
- [x] Bugfixes