
const searchParams = new URLSearchParams(window.location.search);

const malId = searchParams.get("mal_id");
let currentAnime = null;
window.currentAnime = null; // expose globally for use in global.js

// Request queue for rate limiting
class RequestQueue {
    constructor(delayMs = 1000) {
        this.queue = [];
        this.isProcessing = false;
        this.delayMs = delayMs;
    }

    async add(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const { fn, resolve, reject } = this.queue.shift();
            try {
                const result = await fn();
                resolve(result);
            } catch (err) {
                reject(err);
            }
            
            // Wait before processing next request
            if (this.queue.length > 0) {
                await new Promise(r => setTimeout(r, this.delayMs));
            }
        }

        this.isProcessing = false;
    }
}

const requestQueue = new RequestQueue(500); // 1 second between requests


document.addEventListener("DOMContentLoaded", () => {
    getAnimeDetails(malId);

    const addToListForm = document.querySelector("#addToListForm");
    if (addToListForm) {
        addToListForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!currentAnime) {
                alert("Anime details are still loading. Please wait.");
                return;
            }

            const status = document.querySelector("#statusSelect").value;
            const scoreVal = document.querySelector("#rateInput").value;
            const epWatchedVal = document.querySelector("#epWatchedInput").value;

            const score = scoreVal ? parseInt(scoreVal) : null;
            const episodes_watched = epWatchedVal ? parseInt(epWatchedVal) : 0;

            try {
                const { data: { user }, error } = await supabaseClient.auth.getUser();
                if (error || !user) {
                    alert("You must be logged in to save anime to your watchlist.");
                    return;
                }

                const item = {
                    mal_id: currentAnime.mal_id,
                    title: currentAnime.title,
                    image_url: currentAnime.image_url,
                    status: status,
                    score: score,
                    episodes_watched: episodes_watched,
                    total_episodes: currentAnime.total_episodes
                };

                await window.saveWatchlistItem(user.id, item);

                // Hide Modal
                const addToListModalElement = document.getElementById('addToListModal');
                const modalInstance = bootstrap.Modal.getInstance(addToListModalElement);
                if (modalInstance) {
                    modalInstance.hide();
                }

                alert("Watchlist updated successfully!");
            } catch (err) {
                console.error("Error updating watchlist:", err);
                alert("Failed to update watchlist: " + err.message);
            }
        });
    }
})

async function getAnimeDetails(malId) {
    try {

        const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}/full`);
        const result = await response.json();

        if (result.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return getAnimeDetails(malId);
        }

        const anime = result.data;

        document.title=`${anime.title}`;
        const animeTitleEng = anime.title_english || anime.title;
        const animeImg = anime.images.webp.large_image_url || anime.images.webp.image_url;
        const animeDesp = anime.synopsis;
        const animeType = anime.type;
        const animeEpisodes = anime.episodes || "TBA";
        const animeStatus = anime.status;

        currentAnime = {
            mal_id: anime.mal_id,
            title: animeTitleEng,
            image_url: animeImg,
            total_episodes: anime.episodes || 0
        };
        window.currentAnime = currentAnime; // keep global reference in sync
        const animeScore = anime.score || "";
        const animeScoredBy = anime.scored_by || "";
        const animeRating = animeScore && animeScoredBy ? `<span class="badge border border-secondary fs-6 text-bg-dark px-2"><i class="bi bi-star-fill text-warning"></i> ${animeScore} <span style="font-size:14px">(${animeScoredBy})</span></span>` : "";
        const animeSeason = anime.season && anime.year ? `${anime.season} ${anime.year}` : "";
        const animeGenre = anime.genres.map((genre) => {
            return `<span class="badge border border-secondary">${genre.name}</span>`
        }).join("");
        const animeStudio = anime.studios.map((studio) => {
            return `<span class="badge border border-secondary">${studio.name}</span>`
        }).join("");

        const imgDetails = document.querySelector("#image-details");

        imgDetails.innerHTML = `
            <img src="${animeImg}" alt="${animeTitleEng}" class="rounded-3">
        `;
        
        // Populate info card
        const infoCard = document.querySelector("#image-info-card");
        document.querySelector("#info-source").textContent = anime.source || "-";
        document.querySelector("#info-rating").textContent = anime.rating || "-";
        document.querySelector("#info-duration").textContent = anime.duration || "-";
        document.querySelector("#info-rank").textContent = anime.rank ? `#${anime.rank}` : "-";
        document.querySelector("#info-popularity").textContent = anime.popularity ? `#${anime.popularity}` : "-";
        document.querySelector("#info-members").textContent = anime.members ? anime.members.toLocaleString() : "-";
        
        // Add genre badges to info card
        const genreContainer = document.querySelector("#info-genre");
        genreContainer.innerHTML = anime.genres.map((genre) => {
            return `<span style="color: var(--accent-color); font-weight: 600;">${genre.name}</span>`
        }).join("");
        
        // Add studio badges to info card
        const studioContainer = document.querySelector("#info-studio");
        studioContainer.innerHTML = anime.studios.map((studio) => {
            return `<span style="color: var(--accent-color); font-weight: 600;">${studio.name}</span>`
        }).join("");
        
        // Add streaming platforms
        const platformsList = document.querySelector("#platforms-list");
        if (anime.streaming && anime.streaming.length > 0) {
            platformsList.innerHTML = anime.streaming.map((stream) => {
                return `<a href="${stream.url}" target="_blank" rel="noopener noreferrer" class="platform-btn">
                    <span>${stream.name}</span>
                    <i class="bi bi-box-arrow-up-right ms-1"></i>
                </a>`
            }).join("");
        } else {
            platformsList.innerHTML = '<span class="text-secondary small">Not available</span>';
        }
        
        infoCard.classList.remove("d-none");

        const textCont = document.querySelector("#text-details")
        
        let trailerHTML = "";
        if (anime.trailer && (anime.trailer.youtube_id || anime.trailer.embed_url)) {
            let trailerSrc = anime.trailer.youtube_id 
                ? `https://www.youtube.com/embed/${anime.trailer.youtube_id}`
                : anime.trailer.embed_url;
            
            trailerHTML = `
                <div class="trailer-container mt-2">
                    <h3 class="text-white mb-4">Trailer</h3>
                    <div class="ratio ratio-16x9 rounded-3 overflow-hidden">
                        <iframe class="rounded-3" src="${trailerSrc}" allowfullscreen="" title="Anime Trailer"></iframe>
                    </div>
                </div>
            `;
        }

        textCont.innerHTML = `
            <h2 class="mb-3 pe-3 text-white">${animeTitleEng}</h2>
        <p class="py-2 d-flex gap-3 flex-wrap align-items-center rating-row"> ${animeRating}
            <span class="badge fs-6 text-bg-dark border border-secondary px-2">${animeType}</span><span class="badge fs-6 text-bg-dark border border-secondary ">${animeStatus}</span><span class="badge fs-6 text-bg-dark border border-secondary">${animeSeason}</span>
            <span class="badge fs-6 text-bg-dark border border-secondary">${animeEpisodes} episodes</span>
        </p>
        <div class="synopsis-container mb-4">
    <p class="pt-2 text-light m-0" id="read-more">${animeDesp}</p>
    
    <a id="read-more-btn" class="text-danger fw-bold d-block mt-2 link-danger link-offset-2 link-underline-opacity-50 link-underline-opacity-100-hover" style="cursor: pointer;">Read More</a>
</div>
        <button class="my-btn add-to-list text-white fw-bold btn btn-lg mb-4" role="button"  id="addToListBtn" onclick="handleWatchlistButtonClick(event)" aria-disabled="true"><i class="bi bi-plus-lg  pe-2 fw-bold"></i>Add to list</button>

        ${trailerHTML}
        
        <div id="anime-relations-container"></div>
        <div id="similar-animes-container"></div>
        `;

        // Array.from(textCont.children).forEach(e => {
        //     e.classList.remove("placeholder");
        // });;
        imgDetails.classList.remove("placeholder", "bg-secondary");
        document.querySelector("#details-wrapper").classList.remove("placeholder-glow");

        let readMoreBtn = document.querySelector("#read-more-btn");
        let readMorePara = document.querySelector("#read-more");
        readMoreBtn.addEventListener("click", (e) => {
            if (readMorePara.classList.contains("expanded")) {
                readMorePara.classList.remove("expanded");
                readMoreBtn.textContent = "Read More";
            }
            else {
                readMorePara.classList.add("expanded");
                readMoreBtn.textContent = "Read Less";
            }
        });

        // Fetch and render anime relations
        try {
            const relationsRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/relations`);
            const relationsData = await relationsRes.json();
            
            if (relationsData.data && relationsData.data.length > 0) {
                const relationsContainer = document.querySelector("#anime-relations-container");
                
                // Collect all anime entries first
                const allRelations = [];
                relationsData.data.forEach(relation => {
                    const relationType = relation.relation;
                    const entries = relation.entry;
                    
                    if (Array.isArray(entries)) {
                        entries.forEach(entry => {
                            if (entry.type === "anime") {
                                allRelations.push({ entry, relationType });
                            }
                        });
                    }
                });
                
                // Only render if there are anime relations
                if (allRelations.length > 0) {
                    // Build HTML
                    let relationsHTML = `
                        <div class="anime-relations mt-5">
                            <h3 class="text-white mb-4">Related Anime</h3>
                            <div class="relations-list">
                    `;
                    
                    allRelations.forEach(({ entry, relationType }) => {
                        relationsHTML += `
                            <a href="details.html?mal_id=${entry.mal_id}" class="relation-item" id="relation-${entry.mal_id}">
                                <div class="relation-image-wrapper"></div>
                                <span class="relation-type">${relationType}</span>
                                <span class="relation-title">
                                    ${entry.name}
                                </span>
                            </a>
                        `;
                    });
                    
                    relationsHTML += `
                            </div>
                        </div>
                    `;
                    
                    relationsContainer.innerHTML = relationsHTML;
                    
                    // Fetch images with rate limiting
                    for (let i = 0; i < allRelations.length; i++) {
                        const { entry } = allRelations[i];
                        
                        requestQueue.add(async () => {
                            try {
                                const imageRes = await fetch(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
                                const imageData = await imageRes.json();
                                
                                if (imageData.status === 429) {
                                    // Rate limited, wait and retry
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    const retryRes = await fetch(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
                                    const retryData = await retryRes.json();
                                    const imageUrl = retryData.data?.images?.jpg?.image_url || '';
                                    
                                    const imageWrapper = document.querySelector(`#relation-${entry.mal_id} .relation-image-wrapper`);
                                    if (imageWrapper && imageUrl) {
                                        const imgHTML = `<img src="${imageUrl}" alt="${entry.name}" class="relation-image">`;
                                        imageWrapper.insertAdjacentHTML('afterbegin', imgHTML);
                                    }
                                } else {
                                    const imageUrl = imageData.data?.images?.webp?.image_url || '';
                                    const imageWrapper = document.querySelector(`#relation-${entry.mal_id} .relation-image-wrapper`);
                                    
                                    if (imageWrapper && imageUrl) {
                                        const imgHTML = `<img src="${imageUrl}" alt="${entry.name}" class="relation-image">`;
                                        imageWrapper.insertAdjacentHTML('afterbegin', imgHTML);
                                    }
                                }
                            } catch (err) {
                                console.error('Error fetching relation anime image:', err);
                            }
                        });
                    }
                }
            }
        } catch (err) {
            console.log("Error fetching anime relations", err);
        }

        // Fetch and render similar animes
        try {
            const recommendationsRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/recommendations`);
            const recommendationsData = await recommendationsRes.json();
            
            if (recommendationsData.data && recommendationsData.data.length > 0) {
                const similarContainer = document.querySelector("#similar-animes-container");
                
                let similarHTML = `
                    <div class="similar-animes mt-5">
                        <h3 class="text-white mb-4">Similar Animes</h3>
                        <div class="similar-list">
                `;
                
                // Show first 4 recommendations
                const recommendations = recommendationsData.data.slice(0, 5);
                
                for (const rec of recommendations) {
                    const anime = rec.entry;
                    
                    similarHTML += `
                        <a href="details.html?mal_id=${anime.mal_id}" class="similar-item" id="similar-${anime.mal_id}">
                            <div class="similar-image-wrapper"></div>
                            <span class="similar-title">
                                ${anime.title}
                            </span>
                        </a>
                    `;
                }
                
                similarHTML += `
                        </div>
                    </div>
                `;
                
                similarContainer.innerHTML = similarHTML;
                
                // Fetch images asynchronously with rate limiting
                for (let i = 0; i < recommendations.length; i++) {
                    const rec = recommendations[i];
                    const anime = rec.entry;
                    
                    requestQueue.add(async () => {
                        try {
                            const imageRes = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}`);
                            const imageData = await imageRes.json();
                            
                            if (imageData.status === 429) {
                                // Rate limited, wait and retry
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                const retryRes = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}`);
                                const retryData = await retryRes.json();
                                const imageUrl = retryData.data?.images?.jpg?.image_url || '';
                                
                                const imageWrapper = document.querySelector(`#similar-${anime.mal_id} .similar-image-wrapper`);
                                if (imageWrapper && imageUrl) {
                                    const imgHTML = `<img src="${imageUrl}" alt="${anime.title}" class="similar-image">`;
                                    imageWrapper.insertAdjacentHTML('afterbegin', imgHTML);
                                }
                            } else {
                                const imageUrl = imageData.data?.images?.jpg?.image_url || '';
                                const imageWrapper = document.querySelector(`#similar-${anime.mal_id} .similar-image-wrapper`);
                                
                                if (imageWrapper && imageUrl) {
                                    const imgHTML = `<img src="${imageUrl}" alt="${anime.title}" class="similar-image">`;
                                    imageWrapper.insertAdjacentHTML('afterbegin', imgHTML);
                                }
                            }
                        } catch (err) {
                            console.error('Error fetching similar anime image:', err);
                        }
                    });
                }
            }
        } catch (err) {
            console.log("Error fetching similar animes", err);
        }
    }
    catch (err) {
        console.log("Error getting anime details", err)
    }
}


//search anime

const searchInput = document.querySelector("#searchInput");

searchInput.addEventListener("keypress",(event)=>{
    if(event.key === "Enter"){
        const query = searchInput.value.trim();
        // if (q==="") return;
            
        const params = new URLSearchParams();
            params.append("q", query); // This converts spaces to "+"
            
            //Redirect using the builder's string output
            window.location.href = `search.html?${params.toString()}`;
    }
});;


