window.addEventListener('popstate', (event) => {
                if (event.state) {
                    if (event.state.view === 'home') {
                        goHome();
                    } else if (event.state.view === 'popular') {
                        goPopular();
                    } else if (event.state.view === 'detail') {
                        const anime = animeData.find(a => a.id === event.state.animeId);
                        if (anime) loadDetailView(anime);
                    }
                }
            });


            function switchView(viewName) {
                document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
                const target = document.getElementById(viewName + 'View');
                if (target) target.classList.add('active');
                if (viewName !== 'detail') {
                    const player = document.getElementById('detailYoutubePlayer');
                    if (player) player.src = '';
                }
                document.body.setAttribute('data-view', viewName);
                window.scrollTo(0, 0);
            }
            document.body.setAttribute('data-view', 'home');


            function loadDetailView(anime) {
                if (typeof switchView === 'function') {
                    switchView('detail');
                } else {
                    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
                    document.getElementById('detailView').classList.add('active');
                    document.getElementById('detailYoutubePlayer').src = '';
                }

                document.getElementById('detailHeroBg').style.backgroundImage = `url('${anime.image}')`;
                document.getElementById('detailPosterImg').src = anime.image;

                const detailsContainer = document.querySelector('.detail-anime-details');
                let seasonWrapper = document.getElementById('seasonWrapper');
                if (seasonWrapper) seasonWrapper.remove();

                updateContent(anime.youtubeId, anime.title, anime.synopsis, anime.episodes, anime.rating, anime.watchUrl);

                document.getElementById('detailStudio').textContent = anime.studio;
                document.getElementById('detailGenre').textContent = anime.genre;

                if (anime.seasons && anime.seasons.length > 0) {
                    seasonWrapper = document.createElement('div');
                    seasonWrapper.id = 'seasonWrapper';
                    seasonWrapper.className = 'season-selector-wrapper';

                    const select = document.createElement('select');
                    select.className = 'season-select';

                    anime.seasons.forEach((season, index) => {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = season.name;
                        select.appendChild(option);
                    });

                    select.addEventListener('change', (e) => {
                        const index = e.target.value;
                        const selectedSeason = anime.seasons[index];

                        updateContent(
                            selectedSeason.youtubeId,
                            anime.title + " (" + selectedSeason.name.split(':')[0] + ")",
                            selectedSeason.synopsis,
                            selectedSeason.episodes,
                            selectedSeason.rating,
                            selectedSeason.watchUrl 
                        );
                    });

                    seasonWrapper.appendChild(select);

                    const metaSection = document.querySelector('.detail-anime-meta');
                    detailsContainer.insertBefore(seasonWrapper, metaSection);
                }

                if (typeof renderReviews === 'function') {
                    renderReviews(anime);
                }

                window.scrollTo(0, 0);
            }

            function updateContent(youtubeId, title, synopsis, episodes, rating, watchUrl) {
                document.getElementById('detailYoutubePlayer').src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=1&modestbranding=1&rel=0&iv_load_policy=3`;

                document.getElementById('detailTitle').textContent = title;
                document.getElementById('detailSynopsis').textContent = synopsis;
                document.getElementById('detailEpisodes').textContent = episodes;

                document.getElementById('detailRating').textContent = rating;

                document.getElementById('detailStars').textContent = generateStars(rating);

                const watchBtn = document.getElementById('watchNowBtn');

                const newBtn = watchBtn.cloneNode(true);
                watchBtn.parentNode.replaceChild(newBtn, watchBtn);

                newBtn.addEventListener('click', () => {
                    if (watchUrl) {
                        window.location.href = watchUrl;
                    } else {
                        alert("Stream link coming soon!");
                    }
                });
            }

            function goHome() {
                renderGallery(animeData, 'gallery'); 
                switchView('home');
                history.pushState({ view: 'home' }, '', '#home');
            }

            function goPopular() {
                switchView('popular');
                history.pushState({ view: 'popular' }, '', '#popular');

                const gallery = document.getElementById('popularGallery');
                gallery.innerHTML = '<p style="color:white; padding:20px; text-align:center;">Loading Top Anime from AniList...</p>';

                const query = `
                query {
                    Page(page: 1, perPage: 50) {
                        media(sort: POPULARITY_DESC, type: ANIME) {
                            idMal
                            title { romaji }
                        }
                    }
                }
                `;

                fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ query: query })
                })
                    .then(res => res.json())
                    .then(data => {
                        const trendingAnime = data.data.Page.media;
                        const topIds = trendingAnime.map(anime => anime.idMal);

                        console.log("Ranked IDs:", topIds);

                        let popularAnime = animeData.filter(a => topIds.includes(a.malId));

                        popularAnime.sort((a, b) => {
                            return topIds.indexOf(a.malId) - topIds.indexOf(b.malId);
                        });

                        if (popularAnime.length === 0) {
                            gallery.innerHTML = '<div style="grid-column: 1 / -1; height: 60vh; display: flex; justify-content: center; align-items: center; color: white; font-size: 20px;">Loading Top Anime from AniList...</div>';
                        } else {
                            renderGallery(popularAnime, 'popularGallery');
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        gallery.innerHTML = '<p style="color:orange; text-align:center;">⚠️ Connection Failed. Showing backup.</p>';

                        const backupIds = [21, 16498, 20, 38000, 31964, 1535, 223];
                        const backupAnime = animeData.filter(a => backupIds.includes(a.malId));
                        renderGallery(backupAnime, 'popularGallery');
                    });
            }

            function goNew() {
                switchView('new');
                history.pushState({ view: 'new' }, '', '#new');

                const gallery = document.getElementById('newGallery');
                gallery.innerHTML = '<div style="grid-column: 1 / -1; height: 60vh; display: flex; justify-content: center; align-items: center; color: white; font-size: 20px;">Loading Trending Anime...</div>';

                console.log("🚀 FETCHING TRENDING WITH RELATIONS...");

                const getQuery = (page) => `
                    query {
                        Page(page: ${page}, perPage: 50) {  
                            media(sort: TRENDING_DESC, type: ANIME) {
                                idMal
                                title { romaji }
                                # Ask for relations (Prequels, Parents, etc.)
                                relations {
                                    edges {
                                        relationType
                                        node {
                                            idMal
                                        }
                                    }
                                }
                            }
                        }
                    }
                    `;

                Promise.all([
                    fetch('https://graphql.anilist.co', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({ query: getQuery(1) })
                    }).then(res => res.json()),

                    fetch('https://graphql.anilist.co', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({ query: getQuery(2) })
                    }).then(res => res.json())
                ])
                    .then(([data1, data2]) => {
                        const list1 = data1.data.Page.media || [];
                        const list2 = data2.data.Page.media || [];
                        const trendingList = [...list1, ...list2];

                        console.log(`Checking ${trendingList.length} trending shows against your list...`);

                        let newAnime = animeData.filter(myCard => {
                            return trendingList.some(trend => {
                                if (trend.idMal === myCard.malId) return true;

                                if (trend.relations && trend.relations.edges) {
                                    return trend.relations.edges.some(edge =>
                                        edge.node.idMal === myCard.malId &&
                                        (edge.relationType === 'PREQUEL' || edge.relationType === 'PARENT' || edge.relationType === 'ALTERNATIVE')
                                    );
                                }
                                return false;
                            });
                        });

                        newAnime = [...new Set(newAnime)];

                        console.log("Found " + newAnime.length + " trending franchises.");

                        if (newAnime.length === 0) {
                            gallery.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:40px;"><h3>No Trending Anime Found</h3></div>';
                        } else {
                            renderGallery(newAnime, 'newGallery');
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        gallery.innerHTML = '<p style="color:orange; text-align:center;">⚠️ API Failed. Showing Backup.</p>';
                        renderGallery(animeData, 'newGallery');
                    });
            }


            const genres = [
                "Action", "Adventure", "Comedy", "Drama", "Fantasy",
                 "Romance", "Sci-Fi", "Seinen", "Shounen",
                "Slice of Life", "Sports", "Supernatural", "Thriller"
            ];

            function goCategories() {
                switchView('categories');
                history.pushState({ view: 'categories' }, '', '#categories');
                renderCategoryRows();
            }


            function renderCategoryRows() {
                const tagsContainer = document.getElementById('genreTags');
                const rowsContainer = document.getElementById('categoryRows');

                tagsContainer.innerHTML = '';
                rowsContainer.innerHTML = '';

                genres.forEach(genre => {
                    const tag = document.createElement('div');
                    tag.className = 'genre-tag';
                    tag.innerText = genre;
                    tag.onclick = () => openGenreView(genre);
                    tagsContainer.appendChild(tag);
                });

                genres.forEach(genre => {
                    const matches = animeData.filter(a => a.genre.includes(genre));

                    if (matches.length > 0) {
                        const rowSection = document.createElement('div');
                        rowSection.className = 'category-row-section';

                        rowSection.innerHTML = `
                        <div class="row-header">
                            <div class="row-title">${genre}</div>
                            <div class="view-all-btn" onclick="openGenreView('${genre}')">View All ></div>
                        </div>
                        
                        <button class="scroll-btn scroll-left" onclick="scrollRow(this, 'left')">‹</button>
                        
                        <div class="anime-row">
                            ${matches.map(anime => createCardHTML(anime)).join('')}
                        </div>
                        
                        <button class="scroll-btn scroll-right" onclick="scrollRow(this, 'right')">›</button>
                    `;

                        rowsContainer.appendChild(rowSection);

                        setTimeout(() => {
                            const row = rowSection.querySelector('.anime-row');
                            const leftBtn = rowSection.querySelector('.scroll-left');
                            const rightBtn = rowSection.querySelector('.scroll-right');

                            updateButtonVisibility(row, leftBtn, rightBtn);

                            row.addEventListener('scroll', () => {
                                updateButtonVisibility(row, leftBtn, rightBtn);
                            });
                        }, 100);
                    }
                });
            }

            function scrollRow(btn, direction) {
                const container = btn.parentElement;
                const row = container.querySelector('.anime-row');

                if (row) {
                    const scrollAmount = row.clientWidth - 70;

                    const scrollValue = direction === 'left' ? -scrollAmount : scrollAmount;

                    row.scrollBy({ left: scrollValue, behavior: 'smooth' });
                }
            }

            function updateButtonVisibility(row, leftBtn, rightBtn) {
                if (row.scrollLeft > 10) {
                    leftBtn.classList.add('visible');
                    leftBtn.style.opacity = ''; 
                } else {
                    leftBtn.classList.remove('visible');
                }

                const maxScroll = row.scrollWidth - row.clientWidth - 10;

                if (maxScroll > 0 && row.scrollLeft < maxScroll) {
                    rightBtn.classList.add('visible');
                    rightBtn.style.opacity = ''; 
                } else {
                    rightBtn.classList.remove('visible');
                }
            }

            function openGenreView(genre) {
                document.getElementById('categoriesView').classList.remove('active');
                document.getElementById('filteredView').classList.add('active');
                document.getElementById('filteredTitle').innerText = `${genre} Anime`;

                const matches = animeData.filter(a => a.genre.includes(genre));
                renderGallery(matches, 'filteredGallery');

                window.scrollTo(0, 0);
            }

            function createCardHTML(anime) {
                return `
                    <div class="card" onclick="showDetails(${anime.id})">
                        <img src="${anime.image}" alt="${anime.title}">
                        <h3>${anime.title}</h3> <div class="overlay">
                            <h4>${anime.title}</h4>
                            <div class="overlay-meta">
                                <span class="star">★</span> ${anime.rating} 
                                <span class="dot">•</span> ${anime.episodes} Eps
                            </div>
                            <p class="synopsis">${anime.synopsis}</p>
                        </div>
                    </div>
                `;
            }

            const animeData = [
                {
                    id: 1,
                    title: "Dragon Ball Super",
                    malId: 16498,
                    image: "images/DragonBall/dragon.jpeg",
                    banner: "images/DragonBall/Dràgøñ bàll super.jpg",
                    youtubeId: "sxufB6DxXk0",
                    synopsis: "Seven years after the defeat of Majin Buu, Earth is at peace, and its people live free from any dangers lurking in the universe. However, this peace is short-lived; a sleeping threat awakens in the dark reaches of the galaxy: Beerus, the ruthless God of Destruction. Disturbed by a prophecy that he will be defeated by a Super Saiyan God, Beerus and his angelic attendant Whis search the universe for this mysterious being. Before long, they reach Earth and encounter Gokuu Son, one of the planet's mightiest warriors, and his powerful friends.",
                    genre: "Action, Fantasy, Shounen, Sci-Fi",
                    studio: "Toei Animation",
                    episodes: 100,
                    rating: 4.6,
                    watchUrl: "https://anikai.to/watch/dragon-ball-super-vxyy#ep=1",
                },
                {
                    id: 2,
                    title: "Bleach",
                    malId: 269,
                    image: "images/Bleach/download (1).jpeg",
                    banner: "images/Bleach/Bleach.jpg",
                    youtubeId: "mnFXQUq-7ks",
                    synopsis: "Ichigo Kurosaki is an ordinary high schooler—until his family is attacked by a Hollow, a corrupt spirit that seeks to devour human souls. It is then that he meets a Soul Reaper named Rukia Kuchiki, who gets injured while protecting Ichigo's family from the assailant. To save his family, Ichigo accepts Rukia's offer of taking her powers and becomes a Soul Reaper as a result. However, as Rukia is unable to regain her powers, Ichigo is given the daunting task of hunting down the Hollows that plague their town. However, he is not alone in his fight, as he is later joined by his friends—classmates Orihime Inoue, Yasutora Sado, and Uryuu Ishida—who each have their own unique abilities. As Ichigo and his comrades get used to their new duties and support each other on and off the battlefield, the young Soul Reaper soon learns that the Hollows are not the only real threat to the human world.",
                    genre: "Action, Supernatural, Shounen, Drama",
                    studio: "Pierrot",
                    episodes: 366,
                    rating: 4.7,
                    watchUrl: "https://anikai.to/watch/bleach-re3j#ep=1",
                    seasons: [
                        {
                            name: "S1: Bleach",
                            youtubeId: "mnFXQUq-7ks",
                            synopsis: "Ichigo Kurosaki is an ordinary high schooler—until his family is attacked by a Hollow, a corrupt spirit that seeks to devour human souls. It is then that he meets a Soul Reaper named Rukia Kuchiki, who gets injured while protecting Ichigo's family from the assailant. To save his family, Ichigo accepts Rukia's offer of taking her powers and becomes a Soul Reaper as a result. However, as Rukia is unable to regain her powers, Ichigo is given the daunting task of hunting down the Hollows that plague their town. However, he is not alone in his fight, as he is later joined by his friends—classmates Orihime Inoue, Yasutora Sado, and Uryuu Ishida—who each have their own unique abilities. As Ichigo and his comrades get used to their new duties and support each other on and off the battlefield, the young Soul Reaper soon learns that the Hollows are not the only real threat to the human world.",
                            episodes: 366,
                            rating: 4.7,
                            watchUrl: "https://anikai.to/watch/bleach-re3j#ep=1"
                        },
                        {
                            name: "S2: Bleach: Thousand-Year Blood War",
                            youtubeId: "e8YBesRKq_U",
                            synopsis: "Substitute Soul Reaper Ichigo Kurosaki spends his days fighting against Hollows, dangerous evil spirits that threaten Karakura Town. Ichigo carries out his quest with his closest allies: Orihime Inoue, his childhood friend with a talent for healing; Yasutora Sado, his high school classmate with superhuman strength; and Uryuu Ishida, Ichigo's Quincy rival. Ichigo's vigilante routine is disrupted by the sudden appearance of Asguiaro Ebern, a dangerous Arrancar who heralds the return of Yhwach, an ancient Quincy king. Yhwach seeks to reignite the historic blood feud between Soul Reaper and Quincy, and he sets his sights on erasing both the human world and the Soul Society for good. Yhwach launches a two-pronged invasion into both the Soul Society and Hueco Mundo, the home of Hollows and Arrancar. In retaliation, Ichigo and his friends must fight alongside old allies and enemies alike to end Yhwach's campaign of carnage before the world itself comes to an end.",
                            episodes: 13,
                            rating: 4.7,
                            watchUrl: "https://anikai.to/watch/bleach-thousand-year-blood-war-k70q#ep=1"
                        },
                        {
                            name: "S3: Bleach: Thousand-Year Blood War - The Separation",
                            youtubeId: "Pi_sIP-wjC0",
                            synopsis: "After a brutal surprise attack by the forces of Quincy King Yhwach, the resident Reapers of the Soul Society lick their wounds and mourn their losses. Many of the surviving Soul Reaper captains train to battle without their Bankai, the ultimate technique wielded by the fiercest warriors. In the previous assault, Ichigo Kurosaki narrowly managed to help fend off Yhwach's fearsome wrath. However, to ultimately defeat his godly adversary and save his allies, Ichigo must now undergo severe training that will push him beyond his physical, emotional, and mental limits. Though Yhwach already holds the upper hand in this ongoing blood feud, he also successfully recruits Uryuu Ishida, Ichigo's close friend and rival, to be his successor. Yhwach strikes out once again at the weakened Soul Society, intent on finally obliterating his long-standing enemies. As Ichigo struggles to attain new power, the Soul Reaper captains fight for survival and borrowed time.",
                            episodes: 13,
                            rating: 4.7,
                            watchUrl: "https://anikai.to/watch/bleach-thousand-year-blood-war-the-separation-xjgq#ep=1"
                        },
                        {
                            name: "S4: Bleach: Thousand-Year Blood War - The Conflict",
                            youtubeId: "KPL8K8Rfyxc",
                            synopsis: "After an awe-inspiring battle with Ichibei Hyousube—leader of the Soul Society's Royal Guard—the powerful Yhwach moves into the final stage of his master plan. He aims to slay the Soul King, the being whose very existence maintains the status quo of three worlds: Hueco Mundo, the Soul Society, and the realm of humans that Ichigo Kurosaki and his closest friends hail from. Conquering his own bout with the remainder of the Royal Guard, Uryuu Ishida joins Yhwach in his efforts to create a new world in his image. With a flood of resolution and newfound power, Ichigo rushes to stop Yhwach from accomplishing his ultimate goal and save the countless lives within the three existing realms. But Ichigo has a complicated lineage, one that leaves him susceptible to Yhwach's sinister influence. Meanwhile, in a final desperate gambit, Jirou Sakuranosuke Shunsui Kyouraku, the newly promoted head captain of the Soul Society's combat corps, enlists the help of an old enemy whose immense power may turn the tide of battle.",
                            episodes: 14,
                            rating: 4.7,
                            watchUrl: "https://anikai.to/watch/bleach-thousand-year-blood-war-the-conflict-zev9#ep=1"
                        }
                    ]
                },
                {
                    id: 3,
                    title: "One Piece",
                    malId: 21,
                    image: "images/OnePiece/e um papel de parede.jpeg",
                    banner: "images/OnePiece/One Piece.jpg",
                    youtubeId: "1KMcoJBMWE4",
                    synopsis: "Luffy dreams of becoming Pirate King. Forms a diverse crew of loyal friends. Explores uncharted seas seeking treasures. Faces dangerous enemies and rival pirates. Embraces adventure, loyalty, and the spirit of freedom.",
                    genre: "Action, Adventure, Fantasy, Shounen",
                    studio: "Toei Animation",
                    episodes: 1155,
                    rating: 4.8,
                    watchUrl: "https://anikai.to/watch/one-piece-dk6r#ep=1",
                },
                {
                    id: 4,
                    title: "Naruto",
                    malId: 20,
                    image: "images/Naruto/download (3).jpeg",
                    banner: "images/Naruto/Naruto.jpg",
                    youtubeId: "-G9BqkgZXRA",
                    synopsis: "Naruto dreams of becoming Hokage of his village. Trains tirelessly to master ninjutsu skills. Faces powerful foes and rival ninjas. Builds unbreakable bonds with friends and mentors. Proves courage and determination in every challenge.",
                    genre: "Action, Adventure, Shounen",
                    studio: "Pierrot",
                    episodes: 220,
                    rating: 4.6,
                    watchUrl: "https://anikai.to/watch/naruto-9r5k#ep=1",
                },
                {
                    id: 5,
                    title: "My Hero Academia",
                    malId: 31964,
                    image: "images/MHA/Midoriya Izuku _ My Hero Academia.jpeg",
                    banner: "images/MHA/MHA.jpg",
                    youtubeId: "mZS7u4KHZl0",
                    synopsis: "Izuku Midoriya dreams of being a hero despite being powerless. After meeting All Might, he inherits 'One For All'. (Season 1)",
                    genre: "Action, Fantasy, Shounen",
                    studio: "Bones",
                    episodes: 13,
                    rating: 4.7,
                    watchUrl: "https://anikai.to/watch/my-hero-academia-1yqp#ep=1",
                    seasons: [
                        {
                            name: "S1: My Hero Academia",
                            youtubeId: "mZS7u4KHZl0",
                            synopsis: "Izuku Midoriya dreams of being a hero despite being powerless. After meeting All Might, he inherits 'One For All'.The U.A. Sports Festival begins! Deku must compete without using his quirk to break his bones.",
                            episodes: 13,
                            rating: 4.9,
                            watchUrl: "https://anikai.to/watch/my-hero-academia-1yqp#ep=1"
                        },
                        {
                            name: "S2: My Hero Academia",
                            youtubeId: "aifkxK0qmcM",
                            synopsis: "The U.A. Sports Festival begins! Deku must compete without using his quirk to break his bones.",
                            episodes: 25,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/my-hero-academia-season-2-3n1w#ep=1"
                        },
                        {
                            name: "S3: My Hero Academia",
                            youtubeId: "K2UMYJ2BbuU",
                            synopsis: "Class 1-A goes on a summer training camp. This leads to the legendary showdown: All Might vs. All For One.",
                            episodes: 25,
                            rating: 4.9,
                            watchUrl: "https://anikai.to/watch/my-hero-academia-season-3-639v#ep=1"
                        },
                        {
                            name: "S4: My Hero Academia",
                            youtubeId: "jcYG-YIE0QM",
                            synopsis: "Deku joins the hero agency of Sir Nighteye to stop the Yakuza leader Overhaul.",
                            episodes: 25,
                            rating: 4.6,
                            watchUrl: "https://anikai.to/watch/my-hero-academia-season-4-g5l6#ep=1"
                        },
                        {
                            name: "S5: My Hero Academia",
                            youtubeId: "DjapXaE8yL0",
                            synopsis: "Class 1-A vs Class 1-B. A training arc that leads into the Villain Academia arc.",
                            episodes: 25,
                            rating: 4.3,
                            watchUrl: "https://anikai.to/watch/my-hero-academia-season-5-x8qk#ep=1"
                        },
                        {
                            name: "S6: My Hero Academia",
                            youtubeId: "bSt5YwdNlxk",
                            synopsis: "The Heroes launch an all-out war. Society begins to crumble as the villains rise.",
                            episodes: 25,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/my-hero-academia-season-6-lgxl#ep=1"
                        },
                        {
                            name: "S7: My Hero Academia",
                            youtubeId: "T5HMoxJRhRY",
                            synopsis: "Izuku Midoriya dreams of being a hero despite being powerless. After meeting All Might, he inherits 'One For All'.The U.A. Sports Festival begins! Deku must compete without using his quirk to break his bones.",
                            episodes: 21,
                            rating: 4.9,
                            watchUrl: "https://anikai.to/watch/my-hero-academia-season-7-2gyg#ep=1"
                        },
                        {
                            name: "S8: My Hero Academia",
                            youtubeId: "FwE87GX3dEc",
                            synopsis: "Izuku Midoriya dreams of being a hero despite being powerless. After meeting All Might, he inherits 'One For All'.The U.A. Sports Festival begins! Deku must compete without using his quirk to break his bones.",
                            episodes: 11,
                            rating: 4.9,
                            watchUrl: "https://anikai.to/watch/my-hero-academia-final-season-pq45#ep=1"
                        }
                    ]
                },
                {
                    id: 6,
                    title: "Death Note",
                    malId: 1535,
                    image: "images/DeathNote/download (1).jpeg",
                    banner: "images/DeathNote/death note.jpg",
                    youtubeId: "BHUPZpSKkhk",
                    synopsis: "Light Yagami discovers a notebook that kills. Seeks to create a world without crime. Faces detective L in intense mind battles. Struggles with morality and justice. Unfolds a psychological thriller of power and consequence.",
                    genre: "Psychological, Thriller, Shounen",
                    studio: "Madhouse",
                    episodes: 37,
                    rating: 4.8,
                    watchUrl: "https://anikai.to/watch/death-note-616q#ep=1"
                },
                {
                    id: 7,
                    title: "Re:ZERO",
                    malId: 31240,
                    image: "images/ReZero/download (1).jpeg",
                    banner: "images/ReZero/rezero.jpg",
                    youtubeId: "Aj5PnhQyyVY",
                    synopsis: "When Subaru Natsuki leaves the convenience store, the last thing he expects is to be wrenched from his everyday life and dropped into a fantasy world. Things are not looking good for the bewildered teenager; however, not long after his arrival, he is attacked by some thugs. Armed with only a bag of groceries and a now useless cell phone, he is quickly beaten to a pulp. Fortunately, a mysterious beauty named Satella, in hot pursuit after the one who stole her insignia, happens upon Subaru and saves him. In order to thank the honest and kindhearted girl, Subaru offers to help in her search, and later that night, he even finds the whereabouts of that which she seeks. But unbeknownst to them, a much darker force stalks the pair from the shadows, and just minutes after locating the insignia, Subaru and Satella are brutally murdered. However, Subaru immediately reawakens to a familiar scene—confronted by the same group of thugs, meeting Satella all over again—the enigma deepens as history inexplicably repeats itself.",
                    genre: "Fantasy, Psychological, Drama",
                    studio: "White Fox",
                    episodes: 25,
                    rating: 4.7,
                    watchUrl: "Aj5PnhQyyVY",
                    seasons: [
                        {
                            name: "S1: Re:ZERO -Starting Life in Another World",
                            youtubeId: "Aj5PnhQyyVY",
                            synopsis: "When Subaru Natsuki leaves the convenience store, the last thing he expects is to be wrenched from his everyday life and dropped into a fantasy world. Things are not looking good for the bewildered teenager; however, not long after his arrival, he is attacked by some thugs. Armed with only a bag of groceries and a now useless cell phone, he is quickly beaten to a pulp. Fortunately, a mysterious beauty named Satella, in hot pursuit after the one who stole her insignia, happens upon Subaru and saves him. In order to thank the honest and kindhearted girl, Subaru offers to help in her search, and later that night, he even finds the whereabouts of that which she seeks. But unbeknownst to them, a much darker force stalks the pair from the shadows, and just minutes after locating the insignia, Subaru and Satella are brutally murdered. However, Subaru immediately reawakens to a familiar scene—confronted by the same group of thugs, meeting Satella all over again—the enigma deepens as history inexplicably repeats itself.",
                            episodes: 25,
                            rating: 4.7,
                            watchUrl: "https://anikai.to/watch/rezero-starting-life-in-another-world-k2np#ep=1"
                        },
                        {
                            name: "S2: Re:ZERO -Starting Life in Another World",
                            youtubeId: "15KuYDt8P7M",
                            synopsis: "A reunion that was supposed to spell the arrival of peaceful times is quickly shattered when Subaru Natsuki and Emilia return to Irlam village. Witnessing the devastation left behind by the calamities known as Sin Archbishops, Subaru sinks into the depths of despair as his ability to redo proves futile. As the group makes their way to the Sanctuary in search of answers, Subaru has an unexpected encounter with the Witch of Greed—Echidna. Subjected to her untamed rhythm, he is forced to dive into the spirals of the past and future. At the same time, several mysterious threats set their sights on the Sanctuary, heralding a horrific fate for the hapless people trapped within. Everlasting contracts, past sins, and unrequited love will clash and submerge into a river of blood in the second season of Re:Zero kara Hajimeru Isekai Seikatsu. Pushed to the brink of hopelessness, how long will Subaru's resolve to save his loved ones last?",
                            episodes: 25,
                            rating: 4.7,
                            watchUrl: "https://anikai.to/watch/rezero-starting-life-in-another-world-season-2-dnqk#ep=1"
                        },
                        {
                            name: "S3: Re:ZERO -Starting Life in Another World",
                            youtubeId: "lXs3yIc_2CU",
                            synopsis: "One year after the events at the Sanctuary, Subaru Natsuki trains hard to better face future challenges. The peaceful days come to an end when Emilia receives an invitation to a meeting in the Watergate City of Priestella from none other than Anastasia Hoshin, one of her rivals in the royal selection. Considering the meeting's significance and the potential dangers Emilia could face, Subaru and his friends accompany her. However, as Subaru reconnects with old associates and companions in Priestella, new formidable foes emerge. Driven by fanatical motivations and engaging in ruthless methods to achieve their ambitions, the new enemy targets Emilia and threaten the very existence of the city. Rallying his allies, Subaru must give his all once more to stop their nefarious goals from becoming a concrete reality.",
                            episodes: 16,
                            rating: 4.7,
                            watchUrl: "https://anikai.to/watch/rezero-starting-life-in-another-world-season-3-7n80#ep=1"
                        }
                    ]
                },
                {
                    id: 8,
                    title: "Solo Leveling",
                    malId: 52299,
                    image: "images/SoloLeveling/download (1).jpeg",
                    banner: "images/SoloLeveling/solo leveling.jpg",
                    youtubeId: "jsjDrJaAHNM",
                    synopsis: "Humanity was caught at a precipice a decade ago when the first gates—portals linked with other dimensions that harbor monsters immune to conventional weaponry—emerged around the world. Alongside the appearance of the gates, various humans were transformed into hunters and bestowed superhuman abilities. Responsible for entering the gates and clearing the dungeons within, many hunters chose to form guilds to secure their livelihoods. Sung Jin-Woo is an E-rank hunter dubbed as the weakest hunter of all mankind. While exploring a supposedly safe dungeon, he and his party encounter an unusual tunnel leading to a deeper area. Enticed by the prospect of treasure, the group presses forward, only to be confronted with horrors beyond their imagination. Miraculously, Jin-Woo survives the incident and soon finds that he now has access to an interface visible only to him. This mysterious system promises him the power he has long dreamed of—but everything comes at a price.",
                    genre: "Action, Adventure, Fantasy",
                    studio: "A-1 Pictures",
                    episodes: 12,
                    rating: 4.8,
                    watchUrl: "https://anikai.to/watch/solo-leveling-93rg#ep=1",
                    seasons: [
                        {
                            name: "S1: Solo Leveling",
                            youtubeId: "jsjDrJaAHNM",
                            synopsis: "Humanity was caught at a precipice a decade ago when the first gates—portals linked with other dimensions that harbor monsters immune to conventional weaponry—emerged around the world. Alongside the appearance of the gates, various humans were transformed into hunters and bestowed superhuman abilities. Responsible for entering the gates and clearing the dungeons within, many hunters chose to form guilds to secure their livelihoods. Sung Jin-Woo is an E-rank hunter dubbed as the weakest hunter of all mankind. While exploring a supposedly safe dungeon, he and his party encounter an unusual tunnel leading to a deeper area. Enticed by the prospect of treasure, the group presses forward, only to be confronted with horrors beyond their imagination. Miraculously, Jin-Woo survives the incident and soon finds that he now has access to an interface visible only to him. This mysterious system promises him the power he has long dreamed of—but everything comes at a price.",
                            episodes: 12,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/solo-leveling-93rg#ep=1"
                        },
                        {
                            name: "S2: Solo Leveling ",
                            youtubeId: "VEa-32eURrc",
                            synopsis: "Sung Jin-Woo, dubbed the weakest hunter of all mankind, grows stronger by the day with the supernatural powers he has gained. However, keeping his skills hidden becomes more difficult as dungeon-related incidents pile up around him. When Jin-Woo and a few other low-ranked hunters are the only survivors of a dungeon that turns out to be a bigger challenge than initially expected, he draws attention once again, and hunter guilds take an increased interest in him. Meanwhile, a strange hunter who has been lost for ten years returns with a dire warning about an upcoming catastrophic event. As the calamity looms closer, Jin-Woo must continue leveling up to make sure nothing stops him from reaching his ultimate goal—saving the life of his mother.",
                            episodes: 13,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/solo-leveling-season-2-arise-from-the-shadow-x7rq#ep=1"
                        }
                    ]
                },
                {
                    id: 9,
                    title: "My Dress-Up Darling",
                    malId: 48736,
                    image: "images/MyDressUpDarling/𝑀𝑦 𝐷𝑟𝑒𝑠𝑠-𝑈𝑝 𝐷𝑎𝑟𝑙𝑖𝑛𝑔.jpeg",
                    banner: "images/MyDressUpDarling/MyDressUpDarling.jpg",
                    youtubeId: "8oveGY6h6T8",
                    synopsis: "High school boy helps classmate cosplay. Explores creative cosplay and sewing skills. Develops friendship and understanding. Faces challenges in expressing passions. Experiences fun, romance, and self-growth.",
                    genre: "Romance, Comedy, School",
                    studio: "Cloverworks",
                    episodes: 12,
                    rating: 4.6,
                    watchUrl: "https://anikai.to/watch/my-dress-up-darling-6k8k#ep=1",
                    seasons: [
                        {
                            name: "S1: My Dress-Up Darling ",
                            youtubeId: "8oveGY6h6T8",
                            synopsis: "High school student Wakana Gojou spends his days perfecting the art of making hina dolls, hoping to eventually reach his grandfather's level of expertise. While his fellow teenagers busy themselves with pop culture, Gojou finds bliss in sewing clothes for his dolls. Nonetheless, he goes to great lengths to keep his unique hobby a secret, as he believes that he would be ridiculed were it revealed. Enter Marin Kitagawa, an extraordinarily pretty girl whose confidence and poise are in stark contrast to Gojou's meekness. It would defy common sense for the friendless Gojou to mix with the likes of Kitagawa, who is always surrounded by her peers. However, the unimaginable happens when Kitagawa discovers Gojou's prowess with a sewing machine and brightly confesses to him about her own hobby: cosplay. Because her sewing skills are pitiable, she decides to enlist his help. As Gojou and Kitagawa work together on one cosplay outfit after another, they cannot help but grow close—even though their lives are worlds apart.",
                            episodes: 12,
                            rating: 4.6,
                            watchUrl: "https://anikai.to/watch/my-dress-up-darling-6k8k#ep=1"
                        },
                        {
                            name: "S2: My Dress-Up Darling ",
                            youtubeId: "TPMfqN5Uo4E",
                            synopsis: "After Marin Kitagawa introduced Wakana Gojou to the world of cosplay, he has been creating her outfits with ease. Even so, he still has a lot to learn, and every new lesson seems to strengthen his love for sewing and for the hina dolls his grandfather taught him to make. Meanwhile, Kitagawa finds it harder and harder to hide her feelings for Gojou. Friends and strangers alike constantly mistake them for a couple, much to Gojou's embarrassment. After all, in his eyes, their worlds are far too different for anyone to think they could be romantically linked. However, as Gojou spends more time with Kitagawa and realizes that his passions are not ridiculed by other people, a relationship between the two no longer seems so far-fetched.",
                            episodes: 12,
                            rating: 4.6,
                            watchUrl: "https://anikai.to/watch/my-dress-up-darling-season-2-p8em#ep=1"
                        }
                    ]
                },
                {
                    id: 10,
                    title: "Classroom of the Elite",
                    malId: 35507,
                    image: "images/Classroom-Of-The-Elite/download (3).jpeg",
                    banner: "images/Classroom-Of-The-Elite/classroom of the elite.jpg",
                    youtubeId: "RTvdxGyWV6c",
                    synopsis: "On the surface, Koudo Ikusei Senior High School is a utopia. The students enjoy an unparalleled amount of freedom, and it is ranked highly in Japan. However, the reality is less than ideal. Four classes, A through D, are ranked in order of merit, and only the top classes receive favorable treatment. Kiyotaka Ayanokouji is a student of Class D, where the school dumps its worst. There he meets the unsociable Suzune Horikita, who believes she was placed in Class D by mistake and desires to climb all the way to Class A, and the seemingly amicable class idol Kikyou Kushida, whose aim is to make as many friends as possible. While class membership is permanent, class rankings are not; students in lower ranked classes can rise in rankings if they score better than those in the top ones. Additionally, in Class D, there are no bars on what methods can be used to get ahead. In this cutthroat school, can they prevail against the odds and reach the top?",
                    genre: "Psychological, School, Drama",
                    studio: "Lerche",
                    episodes: 12,
                    rating: 4.5,
                    watchUrl: "https://anikai.to/watch/classroom-of-the-elite-9ke6#ep=1",
                    seasons: [
                        {
                            name: "S1: My Classroom of the Elite",
                            youtubeId: "RTvdxGyWV6c",
                            synopsis: "On the surface, Koudo Ikusei Senior High School is a utopia. The students enjoy an unparalleled amount of freedom, and it is ranked highly in Japan. However, the reality is less than ideal. Four classes, A through D, are ranked in order of merit, and only the top classes receive favorable treatment. Kiyotaka Ayanokouji is a student of Class D, where the school dumps its worst. There he meets the unsociable Suzune Horikita, who believes she was placed in Class D by mistake and desires to climb all the way to Class A, and the seemingly amicable class idol Kikyou Kushida, whose aim is to make as many friends as possible. While class membership is permanent, class rankings are not; students in lower ranked classes can rise in rankings if they score better than those in the top ones. Additionally, in Class D, there are no bars on what methods can be used to get ahead. In this cutthroat school, can they prevail against the odds and reach the top?",
                            episodes: 12,
                            rating: 4.5,
                            watchUrl: "https://anikai.to/watch/classroom-of-the-elite-9ke6#ep=1"
                        },
                        {
                            name: "S2: Classroom of the Elite",
                            youtubeId: "_7YD1VntJWM",
                            synopsis: "Life back on the cruise following the Island Special Examination is anything but smooth sailing. Almost immediately after their return, the first-year students of Tokyo Metropolitan Advanced Nurturing High School face yet another special exam, with both class and individual points on the line. In addition to the complicated ruleset, more issues arise in the form of Kakeru Ryuuen and Kei Karuizawa. Angered by the previous test's outcome, Ryuuen is dead set on outdoing every class in the new challenge using any means necessary. Meanwhile, Karuizawa, a crucial pillar of Class D, is close to crumbling under the pressure of her past. The stage is now set for Kiyotaka Ayanokouji to once again—using the full extent of his planning, foresight, and ruthless manipulation—steer Class D to victory as dangerously close enemy forces try to bring it down.",
                            episodes: 13,
                            rating: 4.5,
                            watchUrl: "https://anikai.to/watch/classroom-of-the-elite-ii-78x2#ep=1"
                        },
                        {
                            name: "S3: Classroom of the Elite",
                            youtubeId: "6Gx4pQ14HLk",
                            synopsis: "Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 3rd Season; Classroom of the Elite III; Welcome to the Classroom of the Elite; You-jitsu 3rd Season; You-zitsu 3rd Season",
                            episodes: 13,
                            rating: 4.5,
                            watchUrl: "https://anikai.to/watch/classroom-of-the-elite-iii-65vq#ep=1"
                        }
                    ]
                },
                {
                    id: 11,
                    title: "That Time I Got Reincarnated as a Slime",
                    malId: 37430,
                    image: "images/Tensura/download (1).jpeg",
                    banner: "images/Tensura/That Time I Got Reincarnated As A Slime.jpg",
                    youtubeId: "COVeeclmK98",
                    synopsis: "Thirty-seven-year-old Satoru Mikami is a typical corporate worker, who is perfectly content with his monotonous lifestyle in Tokyo, other than failing to nail down a girlfriend even once throughout his life. In the midst of a casual encounter with his colleague, he falls victim to a random assailant on the streets and is stabbed. However, while succumbing to his injuries, a peculiar voice echoes in his mind, and recites a bunch of commands which the dying man cannot make sense of. When Satoru regains consciousness, he discovers that he has reincarnated as a goop of slime in an unfamiliar realm. In doing so, he acquires newfound skills—notably, the power to devour anything and mimic its appearance and abilities. He then stumbles upon the sealed Catastrophe-level monster \"Storm Dragon\" Veldora who had been sealed away for the past 300 years for devastating a town to ashes. Sympathetic to his predicament, Satoru befriends him, promising to assist in destroying the seal. In return, Veldora bestows upon him the name Rimuru Tempest to grant him divine protection. Now, liberated from the mundanities of his past life, Rimuru embarks on a fresh journey with a distinct goal in mind. As he grows accustomed to his new physique, his gooey antics ripple throughout the world, gradually altering his fate.",
                    genre: "Adventure, Fantasy, Comedy",
                    studio: "8bit",
                    episodes: 24,
                    rating: 4.6,
                    watchUrl: "https://anikai.to/watch/that-time-i-got-reincarnated-as-a-slime-v936#ep=1",
                    seasons: [
                        {
                            name: "S1: That Time I Got Reincarnated as a Slime",
                            youtubeId: "COVeeclmK98",
                            synopsis: "Thirty-seven-year-old Satoru Mikami is a typical corporate worker, who is perfectly content with his monotonous lifestyle in Tokyo, other than failing to nail down a girlfriend even once throughout his life. In the midst of a casual encounter with his colleague, he falls victim to a random assailant on the streets and is stabbed. However, while succumbing to his injuries, a peculiar voice echoes in his mind, and recites a bunch of commands which the dying man cannot make sense of. When Satoru regains consciousness, he discovers that he has reincarnated as a goop of slime in an unfamiliar realm. In doing so, he acquires newfound skills—notably, the power to devour anything and mimic its appearance and abilities. He then stumbles upon the sealed Catastrophe-level monster \"Storm Dragon\" Veldora who had been sealed away for the past 300 years for devastating a town to ashes. Sympathetic to his predicament, Satoru befriends him, promising to assist in destroying the seal. In return, Veldora bestows upon him the name Rimuru Tempest to grant him divine protection. Now, liberated from the mundanities of his past life, Rimuru embarks on a fresh journey with a distinct goal in mind. As he grows accustomed to his new physique, his gooey antics ripple throughout the world, gradually altering his fate.",
                            episodes: 24,
                            rating: 4.6,
                            watchUrl: "https://anikai.to/watch/that-time-i-got-reincarnated-as-a-slime-v936#ep=1"
                        },
                        {
                            name: "S2: That Time I Got Reincarnated as a Slime",
                            youtubeId: "E6CfFkZqLxQ",
                            synopsis: "Taking a break from his time as a teacher, the powerful slime Rimuru Tempest returns to his kingdom, eponymously named Tempest, just in time to begin negotiations with a nearby nation—the Kingdom of Eurazania. While the negotiations are anything but peaceful, they do end successfully, allowing Rimuru to return and finish teaching. When trying to again return to Tempest, this time permanently, Rimuru is stopped by a mysterious figure who is somehow able to constrain the many magical abilities he has at his disposal. In Tempest, the situation is even worse. A group of unknown humans has invaded the land and are assaulting its citizens, both influential and innocent. They are not just trying to bring harm either—they have the intent to kill. Can Rimuru overcome his powerful and dangerous foe and return to Tempest before it is too late?",
                            episodes: 24,
                            rating: 4.6,
                            watchUrl: "https://anikai.to/watch/that-time-i-got-reincarnated-as-a-slime-season-2-4111#ep=1"
                        },
                        {
                            name: "S3: That Time I Got Reincarnated as a Slime",
                            youtubeId: "gqrkjNpoeQM",
                            synopsis: "Rimuru Tempest is victorious following his climactic showdown with Demon Lord Clayman. With Diablo's aid, the war with the Falmuth Kingdom ends decisively in Rimuru's favor. Fueled by increased migration and the integration of Jura Forest, the nation of Tempest undergoes rapid growth. Rimuru's victory shifts the balance of power, giving rise to a renewed period of peace—but whether that peace will last is another matter. Yuuki Kagurazaka and Kazalim are conspiring with the Harlequin Alliance to bring about Rimuru's downfall. Furthermore, the Western Holy Church continues its intolerant crusade against Rimuru and his non-human subordinates. Both allies and enemies engage in a battle of wits, carefully advancing their agendas without shattering the delicate status quo. But once the first domino inevitably falls, the race to supremacy begins.",
                            episodes: 24,
                            rating: 4.6,
                            watchUrl: "https://anikai.to/watch/that-time-i-got-reincarnated-as-a-slime-season-3-vy2y#ep=1"
                        }
                    ]
                },
                {
                    id: 12,
                    title: "DAN DA DAN",
                    malId: 57058,
                    image: "images/DanDaDan/Momo x Okarun.jpeg",
                    banner: "images/DanDaDan/dan da dan.jpg",
                    youtubeId: "0XJxfbN36Uw",
                    synopsis: "Reeling from her recent breakup, Momo Ayase, a popular high schooler, shows kindness to her socially awkward schoolmate, Ken Takakura, by standing up to his bullies. Takakura misunderstands her intentions, believing he has made a new friend who shares his obsession with aliens and UFOs. However, Momo's own eccentric occult beliefs lie in the supernatural realm; she thinks aliens do not exist. A rivalry quickly brews as each becomes determined to prove the other wrong. Despite their initial clash over their opposing beliefs, Momo and Takakura form an unexpected but intimate friendship, a bond forged in a series of supernatural battles and bizarre encounters with urban legends and paranormal entities. As both develop unique superhuman abilities, they learn to supplement each other's weaknesses, leading them to wonder if their newfound partnership may be about more than just survival.",
                    genre: "Action, Comedy, Supernatural",
                    studio: "Science SARU",
                    episodes: 12,
                    rating: 4.7,
                    watchUrl: "https://anikai.to/watch/dan-da-dan-vmly#ep=1",
                    seasons: [
                        {
                            name: "S1: DAN DA DAN",
                            youtubeId: "0XJxfbN36Uw",
                            synopsis: "Reeling from her recent breakup, Momo Ayase, a popular high schooler, shows kindness to her socially awkward schoolmate, Ken Takakura, by standing up to his bullies. Takakura misunderstands her intentions, believing he has made a new friend who shares his obsession with aliens and UFOs. However, Momo's own eccentric occult beliefs lie in the supernatural realm; she thinks aliens do not exist. A rivalry quickly brews as each becomes determined to prove the other wrong. Despite their initial clash over their opposing beliefs, Momo and Takakura form an unexpected but intimate friendship, a bond forged in a series of supernatural battles and bizarre encounters with urban legends and paranormal entities. As both develop unique superhuman abilities, they learn to supplement each other's weaknesses, leading them to wonder if their newfound partnership may be about more than just survival.",
                            episodes: 12,
                            rating: 4.7,
                            watchUrl: "https://anikai.to/watch/dan-da-dan-vmly#ep=1"
                        },
                        {
                            name: "S2: DAN DA DAN",
                            youtubeId: "kSP207E1gh8",
                            synopsis: "While the mission to exorcise Jin (Jiji) Enjouji's family home is underway, things are not going as expected. Momo Ayase narrowly evades an attempted abduction while Ken (Okarun) Takakura and Jiji are ambushed by the Kitou family—the unsettling landlords of the cursed estate. The trio's efforts threaten the foundation of this enigmatic town shrouded in legends and mysteries. As Momo, Okarun, and Jiji are drawn deeper into the maze of folklore and supernatural entities, they must each utilize their unique powers if they want to survive and unravel the secrets of the uncanny town.",
                            episodes: 12,
                            rating: 4.7,
                            watchUrl: "https://anikai.to/watch/dan-da-dan-season-2-8lk0#ep=1"
                        }
                    ]
                },
                {
                    id: 13,
                    title: "Attack on Titan",
                    malId: 16498,
                    image: "images/Attack-Of-Titan/download (1).jpeg",
                    banner: "images/Attack-Of-Titan/Attack on Titan.jpg",
                    youtubeId: "LV-nazLVmgo",
                    synopsis: "Humanity fights giant Titans threatening survival. Eren and friends join the Survey Corps. Battles reveal secrets of Titans' origin. Faces betrayal, loss, and moral dilemmas. Explores courage, sacrifice, and hope in dire times.",
                    genre: "Action, Dark Fantasy, Shounen",
                    studio: "Wit Studio",
                    episodes: 89,
                    rating: 4.7,
                    watchUrl: "https://anikai.to/watch/attack-on-titan-nk0p#ep=1"
                },
                {
                    id: 14,
                    title: "Gachiakuta",
                    malId: 55562,
                    image: "images/Gachiyakuta/3dfc16e5-9a8c-4da2-b42f-797e3420939d.jpeg",
                    banner: "images/Gachiyakuta/Gachiyakuta.jpg",
                    youtubeId: "VtHD9MlW6mA",
                    synopsis: "The inhabitants of a certain wealthy town think nothing of throwing objects away. However, their waste is priceless to Rudo, a resident of the town's slums. Despite the constant warnings from his adoptive father Regto, Rudo spends his days searching for reusable materials that would otherwise be sent to the giant disposal area known as the Pit. Due to its vastness, the Pit doubles as a means of criminal punishment; those dropped in are never to return again. When Regto is murdered by a mysterious assailant, Rudo is falsely accused of the crime and thrown into the Pit. To his surprise, he awakens in a trash-filled area inhabited by enormous monsters formed from the junk. As the toxic air and Trash Beasts push Rudo to the brink of death, he is saved by Enjin, one of the Cleaners who wield weapons known as Vital Instruments to fight the monstrosities. Having gained his own Vital Instrument, Rudo soon joins the Cleaners in the hopes of finding a way to escape the Pit and avenge his father.",
                    genre: "Action, Adventure, Shounen",
                    studio: "Bones",
                    episodes: 24,
                    rating: 4.6,
                    watchUrl: "https://anikai.to/watch/gachiakuta-l1rl#ep=1"
                },
                {
                    id: 15,
                    title: "Demon Slayer",
                    malId: 38000,
                    image: "images/Demon-Slayer/DemonSlayer.png",
                    banner: "images/Demon-Slayer/Demon Slayer.jpg",
                    youtubeId: "gxM1j64w4fk",
                    synopsis: "Ever since the death of his father, the burden of supporting the family has fallen upon Tanjirou Kamado's shoulders. Though living impoverished on a remote mountain, the Kamado family are able to enjoy a relatively peaceful and happy life. One day, Tanjirou decides to go down to the local village to make a little money selling charcoal. On his way back, night falls, forcing Tanjirou to take shelter in the house of a strange man, who warns him of the existence of flesh-eating demons that lurk in the woods at night. When he finally arrives back home the next day, he is met with a horrifying sight—his whole family has been slaughtered. Worse still, the sole survivor is his sister Nezuko, who has been turned into a bloodthirsty demon. Consumed by rage and hatred, Tanjirou swears to avenge his family and stay by his only remaining sibling. Alongside the mysterious group calling themselves the Demon Slayer Corps, Tanjirou will do whatever it takes to slay the demons and protect the remnants of his beloved sister's humanity.",
                    genre: "Action, Adventure, Shounen",
                    studio: "Ufotable",
                    episodes: 55,
                    rating: 4.8,
                    watchUrl: "https://anikai.to/watch/demon-slayer-kimetsu-no-yaiba-9eew#ep=1",
                    seasons: [
                        {
                            name: "S1: Demon Slayer",
                            youtubeId: "gxM1j64w4fk",
                            synopsis: "Ever since the death of his father, the burden of supporting the family has fallen upon Tanjirou Kamado's shoulders. Though living impoverished on a remote mountain, the Kamado family are able to enjoy a relatively peaceful and happy life. One day, Tanjirou decides to go down to the local village to make a little money selling charcoal. On his way back, night falls, forcing Tanjirou to take shelter in the house of a strange man, who warns him of the existence of flesh-eating demons that lurk in the woods at night. When he finally arrives back home the next day, he is met with a horrifying sight—his whole family has been slaughtered. Worse still, the sole survivor is his sister Nezuko, who has been turned into a bloodthirsty demon. Consumed by rage and hatred, Tanjirou swears to avenge his family and stay by his only remaining sibling. Alongside the mysterious group calling themselves the Demon Slayer Corps, Tanjirou will do whatever it takes to slay the demons and protect the remnants of his beloved sister's humanity.",
                            episodes: 26,
                            rating: 4.9,
                            watchUrl: "https://anikai.to/watch/demon-slayer-kimetsu-no-yaiba-9eew#ep=1"
                        },
                        {
                            name: "S2: Demon Slayer: Mugen Train Arc",
                            youtubeId: "X5xuf4A6WT0",
                            synopsis: "A mysterious string of disappearances on a certain train has caught the attention of the Demon Slayer Corps, and they have sent one of their best to exterminate what can only be a demon responsible. However, the plan to board the Mugen Train is delayed by a lesser demon who is terrorizing the mechanics and targeting a kind, elderly woman and her granddaughter. Kyoujurou Rengoku, the Flame Hashira, must eliminate the threat before boarding the train. Sent to assist the Hashira, Tanjirou Kamado, Inosuke Hashira, and Zenitsu Agatsuma enter the train prepared to fight. But their monstrous target already has a devious plan in store for them and the two hundred passengers: by delving deep into their consciousness, the demon intends to obliterate everyone in a stunning display of the power held by the Twelve Kizuki.",
                            episodes: 7,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/demon-slayer-kimetsu-no-yaiba-mugen-train-arc-1yxj#ep=1"
                        },
                        {
                            name: "S3: Demon Slayer: Entertainment District Arc",
                            youtubeId: "6HYjSmXDK5o",
                            synopsis: "The devastation of the Mugen Train incident still weighs heavily on the members of the Demon Slayer Corps. Despite being given time to recover, life must go on, as the wicked never sleep: a vicious demon is terrorizing the alluring women of the Yoshiwara Entertainment District. The Sound Hashira, Tengen Uzui, and his three wives are on the case. However, when he soon loses contact with his spouses, Tengen fears the worst and enlists the help of Tanjirou Kamado, Zenitsu Agatsuma, and Inosuke Hashibira to infiltrate the district's most prominent houses and locate the depraved Upper Rank Demon.",
                            episodes: 11,
                            rating: 4.9,
                            watchUrl: "https://anikai.to/watch/demon-slayer-kimetsu-no-yaiba-entertainment-district-arc-4lmw#ep=1"
                        },
                        {
                            name: "S4: Demon Slayer: Swordsmith Village Arc",
                            youtubeId: "AV-jGrB8gyA",
                            synopsis: "For centuries, the Demon Slayer Corps has sacredly kept the location of Swordsmith Village a secret. As the village of the greatest forgers, it provides Demon Slayers with the finest weapons, which allow them to fight night-crawling fiends and ensure the safety of humans. After his sword was chipped and deemed useless, Tanjirou Kamado, along with his precious little sister Nezuko, is escorted to the village to receive a new one. Meanwhile, the death of an Upper Rank Demon disturbs the idle order in the demon world. As Tanjirou becomes acquainted with Mist Hashira Muichirou Tokitou and Love Hashira Mitsuri Kanroji, ferocious powers creep from the shadows and threaten to shatter the Demon Slayers' greatest line of defense.",
                            episodes: 11,
                            rating: 4.6,
                            watchUrl: "https://anikai.to/watch/demon-slayer-kimetsu-no-yaiba-swordsmith-village-arc-e260#ep=1"
                        },
                        {
                            name: "S5: Demon Slayer: Hashira Training Arc",
                            youtubeId: "EaQv86zPJwo",
                            synopsis: "After a series of mighty clashes with Upper Rank Demons, the Ubuyashiki clan prepares for one last battle with the hellish forces of Muzan Kibutsuji. In order to finally defeat the Demon leader once and for all, the clan devises a training camp for the Demon Slayer Corps, one led by the remaining Hashira—the most elite warriors in the organization. Each Hashira forms a specialized exercise that will hone both their own abilities and the skills of the ordinary soldiers. Tanjirou Kamado, a boy at the heart of the brewing conflict, recovers from wounds received in a recent fight. While his half-Demon sister Nezuko is studied by researchers like Shinobu Kochou, Tanjirou embarks to train with the Hashira, seeking mastery in each of their assigned areas of expertise to be best prepared for the coming war—skills vital to Tanjirou, as he has vowed to be the very warrior who will eliminate Muzan for good.",
                            episodes: 8,
                            rating: 4.3,
                            watchUrl: "https://anikai.to/watch/demon-slayer-kimetsu-no-yaiba-hashira-training-arc-5vn8#ep=1"
                        }
                    ]
                },
                {
                    id: 16,
                    title: "One Punch Man",
                    malId: 30276,
                    image: "images/one punch man/download.jpg",
                    banner: "images/one punch man/one punch man 1.jpg",
                    youtubeId: "X4e3oZaPtaE",
                    synopsis: "The seemingly unimpressive Saitama has a rather unique hobby: being a hero. In order to pursue his childhood dream, Saitama relentlessly trained for three years, losing all of his hair in the process. Now, Saitama is so powerful, he can defeat any enemy with just one punch. However, having no one capable of matching his strength has led Saitama to an unexpected problem—he is no longer able to enjoy the thrill of battling and has become quite bored. One day, Saitama catches the attention of 19-year-old cyborg Genos, who witnesses his power and wishes to become Saitama's disciple. Genos proposes that the two join the Hero Association in order to become certified heroes that will be recognized for their positive contributions to society. Saitama, who is shocked that no one knows who he is, quickly agrees. Meeting new allies and taking on new foes, Saitama embarks on a new journey as a member of the Hero Association to experience the excitement of battle he once felt.",
                    genre: "Action, Comedy, Seinen",
                    studio: "Madhouse",
                    episodes: 12,
                    rating: 4.8,
                    watchUrl: "https://anikai.to/watch/one-punch-man-wq18#ep=1",
                    seasons: [
                        {
                            name: "S1: One Punch Man",
                            youtubeId: "X4e3oZaPtaE",
                            synopsis: "The seemingly unimpressive Saitama has a rather unique hobby: being a hero. In order to pursue his childhood dream, Saitama relentlessly trained for three years, losing all of his hair in the process. Now, Saitama is so powerful, he can defeat any enemy with just one punch. However, having no one capable of matching his strength has led Saitama to an unexpected problem—he is no longer able to enjoy the thrill of battling and has become quite bored. One day, Saitama catches the attention of 19-year-old cyborg Genos, who witnesses his power and wishes to become Saitama's disciple. Genos proposes that the two join the Hero Association in order to become certified heroes that will be recognized for their positive contributions to society. Saitama, who is shocked that no one knows who he is, quickly agrees. Meeting new allies and taking on new foes, Saitama embarks on a new journey as a member of the Hero Association to experience the excitement of battle he once felt.",
                            episodes: 12,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/one-punch-man-wq18#ep=1"
                        },
                        {
                            name: "S2: One Punch Man",
                            youtubeId: "Sp3PXRVRQHk",
                            synopsis: "In the wake of defeating Boros and his mighty army, Saitama has returned to his unremarkable everyday life in Z-City. However, unbeknownst to him, the number of monsters appearing is still continuously on the rise, putting a strain on the Hero Association's resources. Their top executives decide on the bold move of recruiting hoodlums in order to help in their battle. But during the first meeting with these potential newcomers, a mysterious man calling himself Garou makes his appearance. Claiming to be a monster, he starts mercilessly attacking the crowd. The mysterious Garou continues his rampage against the Hero Association, crushing every hero he encounters. He turns out to be the legendary martial artist Silverfang's best former disciple and seems driven by unknown motives. Regardless, this beast of a man seems unstoppable. Intrigued by this puzzling new foe and with an insatiable thirst for money, Saitama decides to seize the opportunity and joins the interesting martial arts competition. As the tournament commences and Garou continues his rampage, a new great menace reveals itself, threatening the entire human world. Could this finally be the earth-shattering catastrophe predicted by the great seer Madame Shibabawa?",
                            episodes: 12,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/one-punch-man-season-2-jng1#ep=1"
                        }
                    ]
                },
                {
                    id: 17,
                    title: "Fullmetal Alchemist: Brotherhood",
                    malId: 5114,
                    image: "images/Fullmetal Alchemist Brotherhood/download.jpg",
                    banner: "images/Fullmetal Alchemist Brotherhood/Fullmetal Alchemist Brotherhood.jpg",
                    youtubeId: "-GoNo0DGroU",
                    synopsis: "After a horrific alchemy experiment goes wrong in the Elric household, brothers Edward and Alphonse are left in a catastrophic new reality. Ignoring the alchemical principle banning human transmutation, the boys attempted to bring their recently deceased mother back to life. Instead, they suffered brutal personal loss: Alphonse's body disintegrated while Edward lost a leg and then sacrificed an arm to keep Alphonse's soul in the physical realm by binding it to a hulking suit of armor. The brothers are rescued by their neighbor Pinako Rockbell and her granddaughter Winry. Known as a bio-mechanical engineering prodigy, Winry creates prosthetic limbs for Edward by utilizing \"automail,\" a tough, versatile metal used in robots and combat armor. After years of training, the Elric brothers set off on a quest to restore their bodies by locating the Philosopher's Stone—a powerful gem that allows an alchemist to defy the traditional laws of Equivalent Exchange. As Edward becomes an infamous alchemist and gains the nickname \"Fullmetal,\" the boys' journey embroils them in a growing conspiracy that threatens the fate of the world.",
                    genre: "Action, Adventure, Drama, Fantasy",
                    studio: "Bones",
                    episodes: 64,
                    rating: 4.9,
                    watchUrl: "https://anikai.to/watch/fullmetal-alchemist-brotherhood-wmpk#ep=1"
                },
                {
                    id: 18,
                    title: "Sword Art Online",
                    malId: 11757,
                    image: "images/Sword Art Online/Sword Art Online (1).jpg",
                    banner: "images/Sword Art Online/Sword Art Online 1.jpg",
                    youtubeId: "C8Jl_-b7ju0",
                    synopsis: "In the near future, a Virtual Reality Massive Multiplayer Online Role-Playing Game (VRMMORPG) called Sword Art Online has been released where players control their avatars with their bodies using a piece of technology called: Nerve Gear.",
                    genre: "Action, Adventure, Fantasy, Romance",
                    studio: "A-1 Pictures",
                    episodes: 25,
                    rating: 4.3,
                    watchUrl: "https://anikai.to/watch/sword-art-online-qlvr#ep=1"
                },
                {
                    id: 19,
                    title: "Tokyo Ghoul",
                    malId: 22319,
                    image: "images/Tokyo Ghoul/Tokyo Ghoul.jpg",
                    banner: "images/Tokyo Ghoul/Tokyo Ghoul 1.jpg",
                    youtubeId: "vGuQeQsoRgU",
                    synopsis: "Tokyo has become a cruel and merciless city—a place where vicious creatures called \"ghouls\" exist alongside humans. The citizens of this once great metropolis live in constant fear of these bloodthirsty savages and their thirst for human flesh.",
                    genre: "Action, Horror, Mystery, Supernatural",
                    studio: "Pierrot",
                    episodes: 12,
                    rating: 4.5,
                    watchUrl: "https://anikai.to/watch/tokyo-ghoul-g8j3#ep=1"
                },
                {
                    id: 20,
                    title: "Hunter x Hunter",
                    malId: 11061,
                    image: "images/Hunter x Hunter/download (2).jpg",
                    banner: "images/Hunter x Hunter/Hunter x Hunter.jpg",
                    youtubeId: "d6kBeJjTGnY",
                    synopsis: "Gon Freecss aspires to become a Hunter, an exceptional being capable of greatness. With his friends and his potential, he seeks out his father, who left him when he was younger.",
                    genre: "Action, Adventure, Fantasy, Shounen",
                    studio: "Madhouse",
                    episodes: 148,
                    rating: 4.9,
                    watchUrl: "https://anikai.to/watch/hunter-x-hunter2-3gm9#ep=1"
                },
                {
                    id: 21,
                    title: "Your Name",
                    malId: 32281,
                    image: "images/Your Name/download.jpg",
                    banner: "images/Your Name/your name 1.jpg",
                    youtubeId: "s0wTdCQoc2k",
                    synopsis: "Mitsuha Miyamizu, a high school girl, yearns to live the life of a boy in the bustling city of Tokyo—a dream that stands in stark contrast to her present life in the countryside. Meanwhile in the city, Taki Tachibana lives a busy life as a high school student.",
                    genre: "Drama, Romance, Supernatural",
                    studio: "CoMix Wave Films",
                    episodes: 1,
                    rating: 4.9,
                    watchUrl: "https://anikai.to/watch/your-name-lgqy#ep=1"
                },
                {
                    id: 22,
                    title: "A Silent Voice",
                    malId: 28851,
                    image: "images/A silente voice/A silente voice.jpg",
                    banner: "images/A silente voice/A silent voice.jpg",
                    youtubeId: "nfK6UgLra7g",
                    synopsis: "Shouya Ishida, a former delinquent who bullied the deaf classmate Shouko Nishimiya alongside his friends back when he was in elementary school. When Nishimiya transferred, all of his friends and teachers turned against him, making him isolated well into high school.",
                    genre: "Drama, Slice of Life",
                    studio: "Kyoto Animation",
                    episodes: 1,
                    rating: 4.8,
                    watchUrl: "https://anikai.to/watch/a-silent-voice-vwmk#ep=1"
                },
                {
                    id: 23,
                    title: "Jujutsu Kaisen",
                    malId: 40748,
                    image: "images/Jujutsu Kaisen/Jujutsu Kaisen.jpg",
                    banner: "images/Jujutsu Kaisen/Jujutsu Kaisen 1.jpg",
                    youtubeId: "pkKu9hLT-t8",
                    synopsis: "Idly indulging in baseless paranormal activities with the Occult Club, high schooler Yuuji Itadori spends his days at the clubroom or the hospital, where he visits his bedridden grandfather. However, this leisurely lifestyle soon takes a turn for the strange when he unknowingly encounters a cursed item. Triggering a chain of supernatural occurrences, Yuuji finds himself suddenly thrust into the world of Curses—dreadful beings formed from human malice and negativity—after swallowing the said item, revealed to be a finger belonging to the demon Sukuna Ryoumen, the King of Curses. Yuuji experiences first-hand the threat these Curses pose to society as he discovers his own newfound powers. Introduced to the Tokyo Prefectural Jujutsu High School, he begins to walk down a path from which he cannot return—the path of a Jujutsu sorcerer.",
                    genre: "Action, Fantasy, Supernatural",
                    studio: "MAPPA",
                    episodes: 24,
                    rating: 4.8,
                    watchUrl: "https://anikai.to/watch/jujutsu-kaisen-4gm6#ep=1",
                    seasons: [
                        {
                            name: "S1: Jujutsu Kaisen",
                            youtubeId: "pkKu9hLT-t8",
                            synopsis: "Idly indulging in baseless paranormal activities with the Occult Club, high schooler Yuuji Itadori spends his days at either the clubroom or the hospital, where he visits his bedridden grandfather. However, this leisurely lifestyle soon takes a turn for the strange when he unknowingly encounters a cursed item. Triggering a chain of supernatural occurrences, Yuuji finds himself suddenly thrust into the world of Curses—dreadful beings formed from human malice and negativity—after swallowing the said item, revealed to be a finger belonging to the demon Sukuna Ryoumen, the King of Curses. Yuuji experiences first-hand the threat these Curses pose to society as he discovers his own newfound powers. Introduced to the Tokyo Prefectural Jujutsu High School, he begins to walk down a path from which he cannot return—the path of a Jujutsu sorcerer.",
                            episodes: 24,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/jujutsu-kaisen-4gm6#ep=1"
                        },
                        {
                            name: "S2: Jujutsu Kaisen: Shibuya Incident",
                            youtubeId: "9OhV3IWUsxE",
                            synopsis: "The year is 2006, and the halls of Tokyo Prefectural Jujutsu High School echo with the endless bickering and intense debate between two inseparable best friends. Exuding unshakeable confidence, Satoru Gojou and Suguru Getou believe there is no challenge too great for young and powerful Special Grade sorcerers such as themselves. They are tasked with safely delivering a sensible girl named Riko Amanai to the entity whose existence is the very essence of the jujutsu world. However, the mission plunges them into an exhausting swirl of moral conflict that threatens to destroy the already feeble amity between sorcerers and ordinary humans. Twelve years later, students and sorcerers are the frontline defense against the rising number of high-level curses born from humans' negative emotions. As the entities grow in power, their self-awareness and ambition increase too. The curses unite for the common goal of eradicating humans and creating a world of only cursed energy users, led by a dangerous, ancient cursed spirit. To dispose of their greatest obstacle—the strongest sorcerer, Gojou—they orchestrate an attack at Shibuya Station on Halloween. Dividing into teams, the sorcerers enter the fight prepared to risk everything to protect the innocent and their own kind.",
                            episodes: 23,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/jujutsu-kaisen-season-2-73v2#ep=1"
                        }
                    ]
                },
                {
                    id: 24,
                    title: "No Game No Life",
                    malId: 19815,
                    image: "images/No game no life/No game no life.jpg",
                    banner: "images/No game no life/No Game No Life 1.jpg",
                    youtubeId: "IaM5DAkewWY",
                    synopsis: "No Game No Life is a surreal comedy that follows Sora and Shiro, shut-in NEET siblings and the online gamer duo behind the legendary username \"Blank.\" They view the real world as just another lousy game.",
                    genre: "Adventure, Comedy, Fantasy, Ecchi",
                    studio: "Madhouse",
                    episodes: 12,
                    rating: 4.6,
                    watchUrl: "https://anikai.to/watch/no-game-no-life-5xp8#ep=1"
                },
                {
                    id: 25,
                    title: "Violet Evergarden",
                    malId: 33352,
                    image: "images/Violet Evergarden/download.jpg",
                    banner: "images/Violet Evergarden/Violet Evergarden 1.jpg",
                    youtubeId: "UZEOpfelkxQ",
                    synopsis: "The Great War finally came to an end after four long years of conflict; fractured in two, the continent of Telesis began to flourish once again. Caught in the bloodshed was Violet Evergarden, a young girl raised for the sole purpose of decimating enemy lines.",
                    genre: "Drama, Fantasy, Slice of Life",
                    studio: "Kyoto Animation",
                    episodes: 13,
                    rating: 4.7,
                    watchUrl: "https://anikai.to/watch/violet-evergarden-6wwx#ep=1"
                },
                {
                    id: 26,
                    title: "Chainsaw Man",
                    malId: 44511,
                    image: "images/Chainsaw Man/Chainsaw Man.jpg",
                    banner:"images/Classroom-Of-The-Elite/classroom of the elite.jpg",
                    youtubeId: "FaHY74-6UYs",
                    synopsis: "Denji is robbed of a normal teenage life, left with nothing but his dead father's overwhelming debt. His only companion is his pet, the chainsaw devil Pochita, with whom he slays devils for money that inevitably ends up in the yakuza's pockets.",
                    genre: "Action, Fantasy, Shounen",
                    studio: "MAPPA",
                    episodes: 12,
                    rating: 4.7,
                    watchUrl: "https://anikai.to/watch/chainsaw-man-2nmr#ep=1"
                },
                {
                    id: 27,
                    title: "Code Geass: Lelouch of the Rebellion",
                    malId: 1575,
                    image: "images/code geass/code geass.jpg",
                    banner: "images/code geass/Code geass 1.jpg",
                    youtubeId: "yAlNoYU3eAs",
                    synopsis: "In the year 2010, the Holy Empire of Britannia is establishing itself as a dominant military nation, starting with the conquest of Japan. Renamed to Area 11 after its swift defeat, Japan has seen significant resistance against these tyrants in an attempt to regain independence. Lelouch Lamperouge, a Britannian student, unfortunately finds himself caught in a crossfire between the Britannian and the Area 11 rebel armed forces. He is able to escape, however, thanks to the timely appearance of a mysterious girl named C.C., who bestows upon him Geass, the \"Power of Kings.\" Realizing the vast potential of his newfound \"power of absolute obedience,\" Lelouch embarks upon a perilous journey as the masked vigilante known as Zero, leading a merciless onslaught against Britannia in order to get revenge once and for all.",
                    genre: "Action, Drama, Mecha, Sci-Fi",
                    studio: "Sunrise",
                    episodes: 25,
                    rating: 4.8,
                    watchUrl: "https://anikai.to/watch/code-geass-lelouch-of-the-rebellion-oxrm#ep=1",
                    seasons: [
                        {
                            name: "S1: Code Geass: Lelouch of the Rebellion",
                            youtubeId: "TvW8Z5fBl0E",
                            synopsis: "In the year 2010, the Holy Empire of Britannia is establishing itself as a dominant military nation, starting with the conquest of Japan. Renamed to Area 11 after its swift defeat, Japan has seen significant resistance against these tyrants in an attempt to regain independence. Lelouch Lamperouge, a Britannian student, unfortunately finds himself caught in a crossfire between the Britannian and the Area 11 rebel armed forces. He is able to escape, however, thanks to the timely appearance of a mysterious girl named C.C., who bestows upon him Geass, the \"Power of Kings.\" Realizing the vast potential of his newfound \"power of absolute obedience,\" Lelouch embarks upon a perilous journey as the masked vigilante known as Zero, leading a merciless onslaught against Britannia in order to get revenge once and for all.",
                            episodes: 25,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/code-geass-lelouch-of-the-rebellion-oxrm#ep=1"
                        },
                        {
                            name: "S2: Code Geass: Lelouch of the Rebellion",
                            youtubeId: "yAlNoYU3eAs",
                            synopsis: "One year has passed since the Black Rebellion, a failed uprising against the Holy Britannian Empire led by the masked vigilante Zero, who is now missing. At a loss without their revolutionary leader, Area 11's resistance group—the Black Knights—find themselves too powerless to combat the brutality inflicted upon the Elevens by Britannia, which has increased significantly in order to crush any hope of a future revolt. Lelouch Lamperouge, having lost all memory of his double life, is living peacefully alongside his friends as a high school student at Ashford Academy. His former partner C.C., unable to accept this turn of events, takes it upon herself to remind him of his past purpose, hoping that the mastermind Zero will rise once again to finish what he started.",
                            episodes: 25,
                            rating: 4.8,
                            watchUrl: "https://anikai.to/watch/code-geass-lelouch-of-the-rebellion-r2-xm4m#ep=1"
                        }
                    ]
                }
            ];

            function generateStars(rating) {
                const fullStars = Math.floor(rating);
                const hasHalfStar = rating % 1 >= 0.5;
                let stars = '★'.repeat(fullStars);
                if (hasHalfStar) stars += '½';
                return stars;
            }

            function renderGallery(data = animeData, containerId = 'gallery') {
                const gallery = document.getElementById(containerId);
                gallery.innerHTML = '';

                data.forEach(anime => {
                    const card = document.createElement('a');
                    card.className = 'card';
                    card.setAttribute('data-mal-id', anime.malId);
                    card.href = '#';
                    card.innerHTML = `
                    <img src="${anime.image}" alt="${anime.title}">
                    <h3>${anime.title}</h3>
                    <div class="overlay">
                        <h4>${anime.title}</h4>
                        <div class="overlay-meta">
                            <span class="star">★</span> ${anime.rating} 
                            <span class="dot">•</span> ${anime.episodes} Eps
                        </div>
                        <p class="synopsis">${anime.synopsis}</p>
                    </div>
                `;
                    card.addEventListener('click', (e) => {
                        e.preventDefault();
                        navigateToDetail(anime);
                    });
                    gallery.appendChild(card);
                });
            }

            function navigateToDetail(anime) {
                loadDetailView(anime);
                history.pushState({ view: 'detail', animeId: anime.id }, '', '#detail');
                window.scrollTo(0, 0);
            }

            function goBack() {
                document.getElementById('detailView').classList.remove('active');
                document.getElementById('homeView').classList.add('active');
                document.getElementById('detailYoutubePlayer').src = '';
                history.pushState({ view: 'home' }, '', '#home');
                window.scrollTo(0, 0);
            }

            document.getElementById('logoHome').addEventListener('click', goBack);

            const searchInput = document.getElementById('navbarSearch');
            searchInput.addEventListener('keyup', () => {
                const filter = searchInput.value.toLowerCase();
                const filtered = animeData.filter(anime =>
                    anime.title.toLowerCase().includes(filter)
                );
                renderGallery(filtered);
            });

            history.replaceState({ view: 'home' }, '', '#home');
            renderGallery();


            function filterPopularAnime() {
                const apiUrl = "https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=50";
                const myCards = document.querySelectorAll('.card');

                fetch(apiUrl)
                    .then(response => response.json())
                    .then(data => {
                        const topAnimeList = data.data;
                        const topAnimeIds = topAnimeList.map(anime => anime.mal_id);

                        console.log("Top IDs:", topAnimeIds);

                        myCards.forEach(card => {
                            const myCardId = parseInt(card.getAttribute('data-mal-id'));

                            if (myCardId && topAnimeIds.includes(myCardId)) {
                                card.style.display = "block"; 
                            } else {
                                card.style.display = "none";  
                            }
                        });
                    })
                    .catch(err => console.error("API Error:", err));
            }

            window.showDetails = function (id) {
                console.log("Clicked anime ID:", id);

                const anime = animeData.find(a => a.id === id);

                if (anime) {
                    navigateToDetail(anime);
                } else {
                    console.error("Error: Anime not found with ID:", id);
                }
            };


                function initHeroSlider() {
                    const bannerAnime = animeData.filter(a => a.banner);
                    const pool = bannerAnime.length > 0 ? bannerAnime : animeData;
                    const selectedAnime = [];
                    const usedIndices = new Set();
                    
                    while (selectedAnime.length < 4 && selectedAnime.length < pool.length) {
                        const randomIndex = Math.floor(Math.random() * pool.length);
                        if (!usedIndices.has(randomIndex)) {
                            usedIndices.add(randomIndex);
                            selectedAnime.push(pool[randomIndex]);
                        }
                    }

                    const sliderContainer = document.getElementById('heroSlider');
                    const heroFade = sliderContainer.querySelector('.hero-fade');
                    sliderContainer.innerHTML = ''; 
                    sliderContainer.appendChild(heroFade); 

                    selectedAnime.forEach((anime, index) => {
                        const slide = document.createElement('div');
                        slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
                        
                        const bgImage = anime.banner ? anime.banner : anime.image;
                        slide.style.backgroundImage = `url('${bgImage}')`;

                        slide.innerHTML = `
                            <div class="hero-content">
                                <h1>${anime.title}</h1>
                                <p class="hero-desc">${truncateText(anime.synopsis, 150)}</p>
                                <div class="hero-buttons">
                                    <button class="btn-primary" onclick="playHeroAnime('${anime.watchUrl}')">Watch Now</button>
                                    <button class="btn-secondary" onclick="showDetails(${anime.id})">Details</button>
                                </div>
                            </div>
                        `;
                        
                        sliderContainer.appendChild(slide);
                    });

                    let currentSlide = 0;
                    const slides = document.querySelectorAll('.hero-slide');
                    
                    setInterval(() => {
                        slides[currentSlide].classList.remove('active');
                        
                        currentSlide = (currentSlide + 1) % slides.length;
                        
                        slides[currentSlide].classList.add('active');
                    }, 6000); 
                }

                function truncateText(text, maxLength) {
                    if (text.length <= maxLength) return text;
                    return text.substr(0, maxLength) + '...';
                }

                function playHeroAnime(url) {
                    if(url) {
                        window.location.href = url;
                    } else {
                        alert("Stream not available");
                    }
                }

                initHeroSlider();