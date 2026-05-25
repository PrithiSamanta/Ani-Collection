
const searchParams = new URLSearchParams(window.location.search);

const malId = searchParams.get("mal_id");


document.addEventListener("DOMContentLoaded", () => {
    getAnimeDetails(malId);
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
        const animeScore = anime.score || "";
        const animeScoredBy = anime.scored_by || "";
        const animeRating = animeScore && animeScoredBy ? `<span class="badge fs-6 text-bg-warning px-2"><i class="bi bi-star-fill"></i> ${animeScore} <span style="font-size:14px">(${animeScoredBy})</span></span>` : "";
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

        const textCont = document.querySelector("#text-details")

        textCont.innerHTML = `
            <h2 class="mb-3 pe-3 text-white">${animeTitleEng}</h2>
        <p class="py-2 d-flex gap-3"> ${animeRating}
            <span class="badge fs-6 text-bg-warning px-2">${animeType}</span><span class="badge fs-6 text-bg-warning px-2">${animeStatus}</span><span class="badge fs-6 text-bg-warning p-1">${animeSeason}</span>
            <span class="badge fs-6 border border-secondary fw-normal text-">${animeEpisodes} episodes</span>
        </p>
        <div class="synopsis-container">
    <p class="pt-2 text-light m-0" id="read-more">${animeDesp}</p>
    
    <a id="read-more-btn" class="text-danger fw-bold d-block  mb-4 link-danger link-offset-2 link-underline-opacity-50 link-underline-opacity-100-hover" style="cursor: pointer;">Read More</a>
</div>
        <p class="d-flex gap-2">${animeGenre}</p>
        <p class="d-flex gap-2">${animeStudio}</p>
        <a class="btn add-to-list text-white fw-bold" role="button" aria-disabled="true"><i class="bi bi-plus-lg  pe-2 fw-bold"></i>Add to list</a>

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
    }
    catch (err) {
        console.log("Error getting anime details", err)
    }
}


//search anime

const searchInput = document.querySelector("#searchInput");

searchInput.addEventListener("keypress",(event)=>{
    if(event.key === "Enter"){
        window.location.href = `search.html?q=${searchInput.value}`;
    }
});