Shazify
=====================

**Shazam2Spotify is now Shazify:** Shazam2Spotify has been taken down from Chrome Webstore by a DMCA notice from Shazam as I was using "Shazam" in the app's name and a part of their logo in the icon. It's now back on Chrome Webstore with a new name and icon !

Easily sync your Shazam tracks with a Spotify playlist.

[![ScreenShot](https://raw.githubusercontent.com/leeroybrun/chrome-shazify/master/promo_1400x560.png)](http://youtu.be/Zi1VRJqEI0Q)

### Disclaimer

Shazify is not affiliated with Shazam Entertainment Limited. "Shazam" and its logo are trademarks and registered trademarks of Shazam Entertainment Limited. All other companies and product names are trademarks or registered trademarks of their respective companies.

## Shazam 10th December 2014 update
Shazam pushed a new update the 10th December 2014 with support for syncing your tracks to Spotify. You can find more information [here](https://support.shazam.com/hc/en-us/articles/202911263-Latest-Update-Information-What-s-new-). If it's available for you, you should use it instead of this extension.

## How it works

<p align="center"><a href="https://www.youtube.com/watch?v=Zi1VRJqEI0Q"><img src="https://raw.githubusercontent.com/leeroybrun/chrome-shazify/master/video_screenshot.png" alt=""/></a></p>

## Install

You can install it from here : [Shazify on Chrome Webstore](https://chrome.google.com/webstore/detail/shazify/ncdhendbhjlcnboihkbjjldcndoebhan).

## How to use

It will only works if you use the Shazam app for iOS or Android AND you are logged in with Facebook in the app.

If these conditions are met, Shazam will sync your tags with their MyShazam service (www.shazam.com/myshazam).

This extension will then parse the MyShazam website, get your tags, and add them to a new playlist created on your Spotify account.

How it works :

1. Install the extension
2. Click on the new icon appeared on your Chrome toolbar
3. You will be asked to login on MyShazam and Spotify
4. A new playlist ("My Shazam Tags") will be created on your Spotify account
5. Your Shazam tags will be listed and automatically added to this playlist

If a Shazam tag cannot be found on Spotify, you will have the possibility to change the search query for this track.

When you want to update your Spotify playlist with new tags, simply click on the Shazify icon on Chrome toolbar. It will then search for new tags on Shazam and add them to Spotify.

## Developers

### How to build

```
grunt build
```

### How to bundle

```
grunt bundle
```

## Roadmap

- [ ] Refactor. Code is messy at some places...
- [ ] Use React/Inferno/Vue.js/Angular 2.x instead of Angular 1.x
- [ ] Use Promises instead of callbacks
- [ ] Use bulk* methods from Dexie.js to speedup tags addition/update to DB or transactions
- [ ] Put "new search" (in TagsCtrl) in a separate directive/controller
- [ ] Add volume control for audio preview
- [ ] When change/select other track for a Shazam tag, add it to the right place in playlist?
- [ ] When adding tracks to playlist, keep a list of added tracks in this batch. Prevent adding a tag twice if we have 2 Shazam tags for it. (User Shazamed 2 times the same song, as we are adding them together to the playlist, they are not already existing when we check, so we add them twice...)

## Disclaimer

Shazify is not affiliated with Shazam Entertainment Limited.
"Shazam" and its logo are trademarks and registered trademarks of Shazam Entertainment Limited.
All other companies and product names are trademarks or registered trademarks of their respective companies.

