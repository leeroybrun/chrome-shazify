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

## Roadmap for v0.4.0

- Custom update scripts, handle versions like 0.2.10
- Add tracks in order on Spotify
    - Reorder existing tracks
- Add filter functionnality from tag status (found, not found)
- Rounded tag image
- Store tags and Spotify tracks found in IndexedDB (use Dexie.js)
- Remove tags from localStorage
- When select a different Spotify track for a tag, remove the old one from playlist (if not associated with another tag) and add the new one
- Create an update page to let the users know of the new functionnalities
- Add an edit button for tracks found, to le the user know he can change the track found

## Disclaimer

Shazify is not affiliated with Shazam Entertainment Limited.
"Shazam" and its logo are trademarks and registered trademarks of Shazam Entertainment Limited.
All other companies and product names are trademarks or registered trademarks of their respective companies.

