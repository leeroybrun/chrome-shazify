# Changelog

## v0.5.0

- [x] Add the ability to fetch list of Shazam tags from iCloud and Firebase
- [x] Add Youtube video links

## v0.4.7

- [x] Lower volume for track preview
- [x] Bugfix `Spotify.genQuery`, don't replace spaces anymore (replacing them with %20 or + was causing Spotify to not find the tracks)
- [x] Bugfix `Spotify.genQuery`, replace " Feat. ", " & " and ", " with spaces in the artist field

## v0.4.6

- [x] Filter tracks to add not add them twice to the playlist
- [x] Bugfix `Spotify.setSpotifyInfosToTag`, check if album has images before using them
- [x] Bugfix `Spotify.genQuery`, remove consecutive `+`

## v0.4.5

- [x] Add button to show/copy logs while updating (in case the update process is blocked)

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