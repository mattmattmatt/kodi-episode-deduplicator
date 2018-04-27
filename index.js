const kodi = require('kodi-ws');
const app = require('express')();
const port = process.env.PORT || 3000;
const kodiHost = process.env.KODI_HOST || 'kodi.my.home';
const kodiWebsocketPort = process.env.KODI_WS_PORT || 9090;

function getWorstVideo(v1, v2) {
    const v1worst = -1;
    const v2worst = 1;

    const v1v = v1.streamdetails.video[0];
    const v2v = v2.streamdetails.video[0];

    // check for significantly higher resolution (e.g. 1080 > 720)
    if (v1v && v2v) {
        if (v1v.height > v2v.height + 100) {
            return v2worst;
        }
        if (v1v.height < v2v.height - 100) {
            return v1worst;
        }
    }

    // check for subtitle count (e.g. 1 > 0)
    if (v1.streamdetails.subtitle.length > v2.streamdetails.subtitle.length) {
        return v2worst;
    }
    if (v1.streamdetails.subtitle.length < v2.streamdetails.subtitle.length) {
        return v1worst;
    }

    if (!v2v) return v2worst;
    if (!v1v) return v1worst;

    // check for higher resolution (small diffs, e.g. 720 > 719)
    if (v1v.height > v2v.height) {
        return v2worst;
    }
    if (v1v.height < v2v.height) {
        return v1worst;
    }

    // check for duration (e.g. 5500 secs > 5420 secs)
    if (v1v.duration > v2v.duration) {
        return v2worst;
    }
    if (v1v.duration < v2v.duration) {
        return v1worst;
    }

    return 0;
}

function getKodiConnection() {
    return kodi(kodiHost, kodiWebsocketPort);
}

function getDeletableDuplicates() {
    return getKodiConnection().then(kodi => {
        return (
            kodi.VideoLibrary.GetEpisodes({
                properties: [
                    'showtitle',
                    'playcount',
                    'tvshowid',
                    'uniqueid',
                    'streamdetails',
                    'episode',
                    'season',
                    'file',
                ],
                filter: { field: 'playcount', operator: 'is', value: '0' },
            })
                .then(r => r.episodes)
                // build map of unique episodes with array of files
                .then(episodes =>
                    episodes.reduce((acc, episode) => {
                        const key = `${episode.tvshowid}-${episode.season}-${episode.episode}`;
                        const list = acc[key] || [];
                        episode.key = key;
                        list.push(episode);
                        acc[key] = list;
                        return acc;
                    }, {})
                )
                // remove episodes that don't have duplicates
                .then(consolidatedEpisodes =>
                    Object.values(consolidatedEpisodes).filter(episodeBatch => episodeBatch.length > 1)
                )
                // remove the file that we want to keep/that shouldn't get "deleted"
                .then(episodeBatches =>
                    episodeBatches.map(episodeBatch => episodeBatch.sort(getWorstVideo).slice(0, -1))
                )
                // turn that map back into an array of deletable episodes
                .then(episodeBatches =>
                    episodeBatches.reduce((acc, episodeBatch) => {
                        return acc.concat(episodeBatch);
                    }, [])
                )
        );
    });
}

function setEpisodesWatched(episodes) {
    return getKodiConnection().then(kodi => {
        episodes.forEach(episode => {
            console.log('  ⏹  Marking as watched:', episode.showtitle, episode.label);
            kodi.VideoLibrary.SetEpisodeDetails({ episodeid: episode.episodeid, playcount: 1 })
                .then(() => {
                    console.log('  ✅  Marked as watched:', episode.showtitle, episode.label, episode.uniqueid);
                })
                .catch(e => {
                    console.error('🛑  Error during', episode.showtitle, episode.label, e);
                });
        });
        return episodes;
    });
}
app.get('/', (req, res) => {
    getDeletableDuplicates()
        .then(episodes => {
            if (req.query.mark_watched === 'true') {
                return setEpisodesWatched(episodes);
            }
            return episodes;
        })
        .then(episodes => {
            res.json(episodes);
        })
        .catch(error => {
            console.error(error);
            res.status(503).json(error);
        });
});

app.listen(port, () => {
    console.log(`👂  Listening on port ${port}`);
    console.log(`🌍  Visit http://localhost:${port} to see duplicate episodes`);
    console.log(`✅  Visit http://localhost:${port}?mark_watched=true to mark duplicate episodes as watched`);
});
