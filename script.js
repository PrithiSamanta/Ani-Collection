//home.html


let searchIcon = document.querySelector(".search-icon");

let searchInput = document.querySelector("#searchInput");

let searchBtn = document.querySelector("#search-btn");

if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
        const query = searchInput.value.trim();

        const params = new URLSearchParams();
            params.append("q", query); // This converts spaces to "+"
            
            // Redirect using the builder's string output
            window.location.href = `search.html?${params.toString()}`;

    });
}

if (searchInput) {
    searchInput.addEventListener("keypress",(event)=>{
    if(event.key === "Enter"){
        const query = searchInput.value.trim();
        const params = new URLSearchParams();
            params.append("q", query); // This converts spaces to "+"
            
            // Redirect using the builder's string output
            window.location.href = `search.html?${params.toString()}`;
    }
});
}

if (searchIcon) {
    searchIcon.addEventListener("click", () => {
        searchInput.focus();
    });
}


document.addEventListener("DOMContentLoaded", () => {
    const isHomePage = document.querySelector(".top-airing") || document.querySelector(".top-rated");

    if (isHomePage) {
        spawnLoadingPlaceholders();
        getCurrentlyAiringAniList(); // AniList GraphQL Carousel
        getTopRatedAnimes();         // Jikan Section 1
        getAllTimeClassics();        // Jikan Section 2
        getUpcomingAnimes();         // Jikan Section 3
    }
});

async function getCurrentlyAiringAniList() {
    // 1. GraphQL Query: Filters for currently airing (RELEASING), 
    // sorts by popularity, and requests the native wide bannerImage
    const query = `
    query {
      Page(page: 1, perPage: 20) { 
        media(status: RELEASING, sort: POPULARITY_DESC, type: ANIME) {
        idMal
        type
        episodes
        status
        averageScore
          title {
            english
            romaji
          }
          bannerImage
          description
        }
        
      }
    }`;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query: query })
        });

        const result = await response.json();
        const rawAnimeList = result.data.Page.media;
        console.log(result)
        // 2. Filter out any rare show that might be missing a banner 
        // to guarantee all 5 carousel slots look perfect
        const cleanBannersList = rawAnimeList.filter(anime => anime.bannerImage !== null);

        const carouselItems = document.querySelectorAll('.carousel-item');



        // 3. Map our perfect landscape anime to your HTML slides
        carouselItems.forEach((item, index) => {
            const anilistAnime = cleanBannersList[index];



            if (anilistAnime) {
                const title = anilistAnime.title.english || anilistAnime.title.romaji;
                const banner = anilistAnime.bannerImage;
                const malId = anilistAnime.idMal;

                const score = anilistAnime.averageScore ? (anilistAnime.averageScore / 10).toFixed(1) : "N/A";
                const totalEpisodes = anilistAnime.episodes ? `${anilistAnime.episodes} Episodes` : "Episodes: TBA";
                const releaseStatus = anilistAnime.status;

                // Strip out HTML tags (like <br>, <i>) from the description string
                const cleanDescription = anilistAnime.description
                    ? anilistAnime.description.replace(/<\/?[^>]+(>|$)/g, "")
                    : "No description available for this currently airing title.";

                //add text dynamically
                item.innerHTML = `
                <div class="carousel-binder" mal-id ="${malId}">
                    <img src="${banner}" class="d-block w-100 carousel-banner-img" alt="${title} Banner">
                    <div class="carousel-caption d-flex flex-column justify-content-center align-items-start text-start px-4 py-3 rounded">
                        
                        <h2 class="fw-bold text-truncate display-4 mb-5" style="max-width: 60%;">${title}</h2>
                        <div class=" status-div ">
                                <span class="badge badge-meta me-2 bg-dark text-warning border border-secondary border-opacity-50">★ ${score}</span>
                                <span class="badge badge-meta me-2 bg-dark text-light border border-secondary border-opacity-50"><i class="bi bi-play-btn-fill me-1"></i>${totalEpisodes}</span>
                              <span class="badge badge-meta me-2 bg-dark text-info border border-secondary border-opacity-50">${releaseStatus}</span>
                            </div>
                         <p class="line-clamp" style="max-width: 50%;">${cleanDescription}</p>
                        <button class="btn text-white btn-lg fs-4 fw-bold my-btn" mal-id="${malId}" id="view-details"><i class="bi bi-info-circle pe-2"></i>View Details</button>
                    </div>
                    </div>
                `;

            }
        });

    } catch (error) {
        console.error("Error fetching currently airing banners from AniList:", error);
    }
}



// Helper utility to generate placeholder items dynamically
function spawnLoadingPlaceholders() {
    // Find every container on your page that needs a loading state
    const targets = document.querySelectorAll(".loading-skeleton");

    // This is the clean template for a single animated skeleton component
    const skeletonTemplate = `
        <div class="anime-card position-relative placeholder-glow" aria-hidden="true">
            <div class="img-wrapper bg-dark placeholder" style="aspect-ratio: 2/3; width: 100%;"></div>
            <div class="card-body pt-2 px-0">
                <h5 class="placeholder col-10 bg-secondary rounded"></h5>
                <p class="placeholder col-6 bg-secondary small rounded mb-0"></p>
            </div>
        </div>
    `;

    targets.forEach(container => {
        // Clear out anything inside the wrapper first
        container.innerHTML = "";

        // Spawn exactly 6 skeleton columns side-by-side to perfectly fill the horizontal screen space
        for (let i = 0; i < 7; i++) {
            container.insertAdjacentHTML("beforeend", skeletonTemplate);
        }
    });
}

//trending now animes

async function getTopRatedAnimes() {
    try {
        const url = "https://api.jikan.moe/v4/top/anime?limit=10";

        getAnimeCards(url, "#top-container")
    }
    catch (err) {
        console.log("Can't get top trending animes", err)
    }
}


//ALL TIME classic animes


async function getAllTimeClassics() {
    try {
        const url = "https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=8";

        getAnimeCards(url, "#classic-container")

    }
    catch (err) {
        console.log("Can't get top trending animes", err)
    }
}

//upcoming animes

async function getUpcomingAnimes() {
    try {
        const url = "https://api.jikan.moe/v4/top/anime?filter=upcoming&limit=9";

        getAnimeCards(url, "#upcoming-container");
    }
    catch (err) {
        console.log("Can't get top trending animes", err)
    }
}


async function getAnimeCards(url, selectContainer) {
    try {

        const response = await fetch(url);

        if (response.status === 429) {
            // Pause execution for 2 seconds to let the API breathe
            await new Promise(resolve => setTimeout(resolve, 2000)); //I DONT UNDERSTAND
            // Run the function again automatically
            return getAnimeCards(url, selectContainer);
        }

        const result = await response.json();

        const anime = result.data;

        // const uniqueAnime = [...new Set(anime.mal_id)];
        const seenIds = new Set();
        const uniqueAnime = anime.filter(anime => !seenIds.has(anime.mal_id) && seenIds.add(anime.mal_id)); //I DON'T UNDERSTAND this is for unique animelist


        const animeContainer = document.querySelector(selectContainer);


        animeContainer.innerHTML = "";
        uniqueAnime.forEach((e) => {
            const animeCard = document.createElement("div");

            const animePoster = e.images.webp.large_image_url;
            const animeTitle = e.title_english || e.titles;
            const score = e.score ? e.score : "NA";
            const animeEpisodes = e.episodes ? `${e.episodes} eps|` : "";
            const animeGenre = e.genres[0].name;
            const animeType = e.type || "TV";

            animeCard.setAttribute("mal-id", e.mal_id)
            animeCard.innerHTML = `
                <div class="img-wrapper rounded-3"><img src="${animePoster}" alt="${animeTitle}" class="rounded-3"></div>
                <h5 class="text-white text-truncate pt-2">${animeTitle}</h5>
                <p class="text-secondary">${animeEpisodes}${animeGenre}|${animeType}</p>
                <span class=" badge text-warning bg-dark rounded-pill position-absolute top-0 m-2"><i class="bi bi-star-fill pe-1"></i>${score}</span>
            `;
            animeCard.classList.add("anime-card", "position-relative");
            animeContainer.append(animeCard);
        })
    }
    catch (err) {
        console.log("Can't get top trending animes", err)
    }
}


//section scroll
function scrollSection(sectionSelector, direction) {

    const section = document.querySelector(sectionSelector);
    if (!section) return;

    const scrollAmt = direction === "left" ? -300 : 300;
    section.scrollBy({
        left: scrollAmt,
        behavior: 'smooth'
    });
}

let leftScroll = document.querySelectorAll(".left-scroll");

leftScroll.forEach(button => {
    button.addEventListener("click", () => {
        const targetSection = button.getAttribute("data-target");
        scrollSection(targetSection, "left")
    })
})

document.querySelectorAll(".right-scroll").forEach(button => {
    button.addEventListener("click", (e) => {
        const targetContainer = button.getAttribute("data-target");
        scrollSection(targetContainer, 'right');
    });
});



//mouse over anime details

// 1. Listen globally on the body element so dynamic items are caught perfectly
// document.body.addEventListener("mouseover", async (event) => {
//     // Look up the DOM tree to see if the user hovered over an anime card
//     const animeCard = event.target.closest(".anime-card");

//     // If they didn't hover over a card, ignore it and stop
//     if (!animeCard) return;

//     // Grab the ID attribute securely using dataset tools
//     const malId = animeCard.getAttribute("mal-id");
//     if (!malId) return;

//     // Avoid making multiple duplicate boxes if one is already open on this card
//     if (animeCard.querySelector(".details-div")) return;

//     // Create the loading structural box wrapper
//     let detailDiv = document.createElement("div");
//     detailDiv.classList.add("details-div");
//     detailDiv.innerHTML = `<p class="text-secondary small p-2 m-0">Loading info...</p>`;
//     animeCard.append(detailDiv);

//     try {
//         // FIX: Added 'await' here so the compiler pauses for your API result!
//         const animeDetails = await getAnimeById(malId);
//         if (!animeDetails) return;

//         console.log("Fetched Hover Details:", animeDetails);

//         const animeTitleEng = animeDetails.title_english || animeDetails.title || "Unknown";
//         const animeTitle = animeDetails.title_japanese || "";
//         const animeDesp = animeDetails.synopsis ? animeDetails.synopsis : "No summary provided.";

//         // Inject the rich text templates securely
//         detailDiv.innerHTML = `
//             <h6 class="text-warning fw-bold mb-1 text-truncate">${animeTitleEng}</h6>
//             <small class="text-muted d-block mb-2">${animeTitle}</small>
//             <p class="small text-light line-clamp-3 mb-0" style="font-size: 11px;">${animeDesp}</p>
//         `;
//     }
//     catch (err) {
//         console.log("Can't render hover details state layout:", err);
//         detailDiv.remove(); // Clean up if things hit a rate-limiting wall
//     }
// });

// // 2. Clean up and remove the hover box when the mouse leaves the card element area
// document.body.addEventListener("mouseout", (event) => {
//     const animeCard = event.target.closest(".anime-card");
//     if (!animeCard) return;

//     const details = animeCard.querySelector(".details-div");
//     if (details) {
//         details.remove();
//     }
// });


// async function getAnimeById(id) {
//     try {
//         // FIX: Converted to a dynamic Template Literal using variables backticks
//         const url = `https://api.jikan.moe/v4/anime/${id}`;
//         const response = await fetch(url);

//         if (response.status === 429) {
//             console.warn("Hover API Rate limited! Waiting 1 second...");
//             await new Promise(resolve => setTimeout(resolve, 1000));
//             return getAnimeById(id); // Retry safely
//         }

//         const result = await response.json();
//         return result.data;  
//     } catch(err) {
//         console.log("Error: Can't get anime by id parameters:", err);
//         return null;
//     }
// }

document.body.addEventListener(("click"), async (event) => {
    try {
        const animeCard = event.target.closest(".anime-card");
        const viewDetails = event.target.closest("#view-details");

        // if (!animeCard || !viewDetails) return;

        if (animeCard) {
            window.location.href = `details.html?mal_id=${animeCard.getAttribute("mal-id")}`;
            console.log(animeCard)
        }
        else if (viewDetails) {
            window.location.href = `details.html?mal_id=${viewDetails.getAttribute("mal-id")}`;
        }
        else {
            return;
        }
    }
    catch (err) {
        console.log("Can't get details", err);
    }
})

