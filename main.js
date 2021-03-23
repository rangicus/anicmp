// Functions
function fixMe (id, msg) {
    console.error(`FIXME ${id}`);
    console.error(msg);
}

function aniQuery (query, variables) {
    return new Promise((resolve, reject) => {
        fetch(`https://graphql.anilist.co`, {
            method: `POST`,
            headers: {
                "Content-Type": `application/json`,
                "Accept": `application/json`,
            },
            body: JSON.stringify({
                query: query,
                variables: variables,
            })
        }).then(res => {
            return res.json().then(json => {
                if (res.ok) return json;
                else reject(json.errors);
            });
        })
        .then(data => resolve(data))
        .catch(err => reject(err));
    });
}

function getUserIDFromName (username) {
    return new Promise((resolve, reject) => {
        aniQuery(`
            query ($name: String) {
                User (name: $name) {
                    id
                }
            }
        `, { name: username })
            .then(data => resolve(data.data.User.id))
            .catch(err => reject(err));
    });
}

function getAnimeFromUserID (userID) {
    return new Promise((resolve, reject) => {
        aniQuery(`
            query ($id: Int) {
                MediaListCollection (userId: $id, type: ANIME) {
                    lists {
                        name
                        entries {
                            mediaId
                            status
                            media {
                                coverImage {
                                    medium
                                    color
                                }
                                title {
                                    romaji
                                }
                            }
                        }
                    }
                }
            }
        `, { id: userID })
            .then(data => resolve(data.data.MediaListCollection.lists))
            .catch(err => reject(err));
    });
}

function loadUser (username) {
    return new Promise((resolve, reject) => {
        // Turn the username into a userID.

        getUserIDFromName(username).then(userID => {
            // Got userID. Let's get all their anime.

            getAnimeFromUserID(userID).then(lists => {
                // Got user anime. Let's format it.

                const allAnime = [];
                lists.forEach(list => {
                    list.entries.forEach(anime => {
                        allAnime.push({
                            id: anime.mediaId,
                            status: anime.status,
                            name: anime.media.title.romaji,
                            img: {
                                src: anime.media.coverImage.medium,
                                color: anime.media.coverImage.color,
                            }
                        });
                    })
                });

                // Remove Duplicates
                const onlyIds = allAnime.map(anime => anime.id);
                for (let i = allAnime.length - 1; i >= 0; i --) {
                    const anime = allAnime[i];

                    if (onlyIds.indexOf(anime.id) !== i) allAnime.splice(i, 1);
                }

                // Return
                resolve({
                    name: username,
                    id: userID,
                    anime: allAnime,
                });
            }).catch(err => {
                // Failed to get user's anime.

                console.error(`Error while trying to get anime from user: ${username}.`);
                reject(err);
            })
        }).catch(err => {
            // Failed to get userID.
            
            alert(`Couldn't get user: ${username}`);
            
            console.error(`There was an error trying to get a userID for: ${username}.`);
            reject(err);
        })
    });
}

function makeComparisons (user1, user2) {
    // Local Functions
    const newImage = anime => $(`<img />`, { src: anime.img.src, title: anime.name, width: 100, height: 150 });

    const newHeader = text => $(`<h1 />`, { text: text, class: `text-center`, style: `cursor: pointer;` })
        .on(`click`, function () {
            $(this).next().slideToggle();
        });

    // Setup
    $(`#comparisons`).fadeOut(`slow`, function () {
        // Empty Div
        $(this).empty();

        // Get Names
        const names = user1.anime.concat(user2.anime).reduce((all, anime) => ({ ...all, [anime.id]: anime }), {});
    
        // Mark "seen"
        const seen = [`completed`, `dropped`, `paused`, `current`];
        const unseen = [`planning`];
        const people = [user1, user2];

        for (let person of people) {
            for (let anime of person.anime) {
                const status = anime.status.toLowerCase();

                if (seen.includes(status)) anime.seen = true;
                else if (unseen.includes(status)) anime.seen = false;
                else fixMe(`gfjboivmrj`, status);
            }
        }
    
        // Find shows that both have seen.
        const seen1 = user1.anime.filter(anime => anime.seen).map(anime => anime.id);
        const seen2 = user2.anime.filter(anime => anime.seen).map(anime => anime.id);
    
        const bothSeen = seen1.filter(anime => seen2.includes(anime));
    
        if (bothSeen.length > 0) {
            const all = bothSeen.map(x => names[x]);
    
            $(this).append($(`<div>`).append(
                newHeader(`Anime You've Both Seen`),
                $(`<ul/>`).append(
                    ...all.map(anime => newImage(anime))
                )
            ));
        }
    
        // Find shows that one has and the other hasn't.
        const onlySeen1 = seen1.filter(anime => seen2.indexOf(anime) === -1);
        const onlySeen2 = seen2.filter(anime => seen1.indexOf(anime) === -1);
    
        if (onlySeen1.length > 0) {
            const all = onlySeen1.map(x => names[x]);
    
            $(this).append($(`<div/>`).append(
                newHeader(`Anime Only ${user1.name} Has Seen`),
                $(`<ul/>`).append(
                    ...all.map(anime => newImage(anime))
                )
            ));
        }
    
        if (onlySeen2.length > 0) {
            const all = onlySeen2.map(x => names[x]);
    
            $(this).append($(`<div/>`).append(
                newHeader(`Anime Only ${user2.name} Has Seen`),
                $(`<ul/>`).append(
                    ...all.map(anime => newImage(anime))
                )
            ));
        }
    
        // Find shows that they both plan to watch.
        const plan1 = user1.anime.filter(anime => anime.status.toLowerCase() === `planning`).map(x => x.id);
        const plan2 = user2.anime.filter(anime => anime.status.toLowerCase() === `planning`).map(x => x.id);
    
        const bothPlan = plan1.filter(anime => plan2.includes(anime));
    
        if (bothPlan.length > 0) {
            const all = bothPlan.map(x => names[x]);
    
            $(this).append($(`<div/>`).append(
                newHeader(`Anime You Both Plan To Watch`),
                $(`<ul/>`).append(
                    ...all.map(anime => newImage(anime))
                )
            ));
        }

        $(this).fadeIn(`slow`);
    });
}

// Main

// Bindings
$(document).ready(function () {
    const names = [`loveisvivid`, `Asourcious`];
    
    $(`#inputUser2`).val( names[Math.floor(Math.random() * names.length)] );
});

$(`#buttonStart`).on(`click`, function () {
    // Disable Inputs
    const disable = [ this, `#inputUser1`, `#inputUser2` ];
    disable.forEach(item => $(item).attr(`disabled`, true));

    // Load User1
    loadUser( $(`#inputUser1`).val() ).then(user1 => {
        // Load User2

        console.log(`User1: Done`);
        
        loadUser( $(`#inputUser2`).val() ).then(user2 => {
            
            console.log(`User2: Done`);

            makeComparisons(user1, user2);

            disable.forEach(item => $(item).attr(`disabled`, false));

        }).catch(err => {
            // Fail Load User2
            
            console.error(`User2: Fail`);
            console.error(err);
        })
    }).catch(err => {
        // Fail Load User1

        console.error(`User1: Fail`);
        console.error(err);
    });
});