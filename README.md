# Kodi Episode Deduplicator

This script scans a Kodi video library for duplicate files of the same episode and marks all but one of them as watched.

It can be started by visiting a simple URL.

## Usage

1. Run `npm install`
1. Run `npm start`
1. Visit [`http://localhost:3000`](http://localhost:3000) to just see what duplicates you have
1. Visit [`http://localhost:3000?json`](http://localhost:3000?json) to see the same in JSON with more technical details
1. Visit [`http://localhost:3000?mark_watched=true`](http://localhost:3000?mark_watched=true) to mark all but one duplicate per episode as watched

The script will prefer to keep episodes with subtitles and higher resolutions unwatched.

![](https://media.giphy.com/media/eirkO1X9Tma88/giphy.gif)

## Configuration
By default, the script will be available locally at port `3000`. You can change that by setting the `PORT` environment variable like so `PORT=8000 npm start`.

To tell the script what host your Kodi instance is running under, set the `KODI_HOST` environment variable like so `KODI_HOST=192.168.1.140 npm start`.

The script will connect to Kodi at websocket port `9090`, but if you want it to use a different port, you can set the `KODI_WS_PORT` environment variable like so `KODI_WS_PORT=9191 npm start`.

All environment variables are combinable.

## Development

Run `npm run dev` to automatically restart your server after every file change. ✨
