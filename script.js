//home.html

let searchIcon = document.querySelector(".search-icon");
let searchInput = document.querySelector("#searchInput");

searchIcon.addEventListener("click", (e) => { //focuses the input when the icon is clicked
    searchInput.focus();
})


async function getTopAiringAnime() {//top airing anime
    const url = "https://kitsu.io/api/edge/anime?filter[status]=current&sort=-userCount&page[limit]=5";

    try {
        let response = await fetch(url);

        let result = await response.json();

        console.log(result);

        let carouselItems = document.querySelectorAll(".carousel-item");



        let animeList = result.data;
        // mainSection.style.backgroundImage = `url(${result.data[0].images.jpg.large_image_url})`;


        // animeList.forEach(element => {

        //     let animeImg = element.images.jpg.image_url;


        //     carouselItems.forEach(item => {
        //         const img = item.querySelector('img');

        //         img.src = animeImg;
        //     }

        //     );
        // });

        carouselItems.innerHTML = "";
        for (let i = 0; i < animeList.length; i++) {

            let animeImg = animeList[i].attributes.coverImage.original;

            carouselItems[i].innerHTML = `<img src=${animeImg}>`

        }



    }
    catch (err) {
        console.log("Error occured ", err)
    }
}

document.addEventListener("DOMContentLoaded", () => {
    getCurrentlyAiringAniList();
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
                        
                        <h2 class="fw-bold text-truncate display-3 mb-5" style="max-width: 60%;">${title}</h2>
                        <div class=" status-div ">
                                <span class="badge badge-meta me-2 bg-dark text-warning border border-secondary border-opacity-50">★ ${score}</span>
                                <span class="badge badge-meta me-2 bg-dark text-light border border-secondary border-opacity-50"><i class="bi bi-play-btn-fill me-1"></i>${totalEpisodes}</span>
                              <span class="badge badge-meta me-2 bg-dark text-info border border-secondary border-opacity-50">${releaseStatus}</span>
                            </div>
                         <p class="line-clamp" style="max-width: 50%;">${cleanDescription}</p>
                        <button class="btn text-white btn-lg fs-4 fw-bold"><i class="bi bi-info-circle pe-2"></i>Details</button>
                    </div>
                    </div>
                `;
                
            }
        });

    } catch (error) {
        console.error("Error fetching currently airing banners from AniList:", error);
    }
}

