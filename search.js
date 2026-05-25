"use strict";

let searchIcon = document.querySelector(".search-icon");
let searchInput = document.querySelector("#searchInput");
let searchInputSm = document.querySelector("#searchInput-sm");

searchIcon.addEventListener("click", (e) => { //focuses the input when the icon is clicked
    searchInput.focus();
})

searchInput.addEventListener("keypress",(event)=>{
    if(event.key === "Enter"){
        const query = searchInput.value.trim();
        const params = new URLSearchParams();
            params.append("q", query); // This converts spaces to "+"
            
            // Redirect using the builder's string output
            window.location.href = `search.html?${params.toString()}`;
    }
});
searchInputSm.addEventListener("keypress",(event)=>{//for smaller devices
    if(event.key === "Enter"){
        const query = searchInputSm.value.trim();
        const params = new URLSearchParams();
            params.append("q", query); // This converts spaces to "+"
            
            // Redirect using the builder's string output
            window.location.href = `search.html?${params.toString()}`;
    }
});

const searchParams = new URLSearchParams(window.location.search);

const q = searchParams.get("q");

document.addEventListener("DOMContentLoaded", () => {
    searchAnime(q);
})

async function searchAnime(q) {
    try {
        if(q===null){
            return;
        }
        const url = `https://api.jikan.moe/v4/anime?q=${q}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            searchAnime(q);
        }
        // const anime = result.data;

        let anime = result.data.filter(anime => { 
            return anime.type === "TV" || anime.type === "Movie" || anime.type === "OVA" ||anime.type==="Special" || anime.type==="ONA";
        });//filters and only shows watchble like tv movie ova


        // anime.sort((a,b)=>b.members - a.members);
        
        console.log(anime);
        const gridContainer = document.querySelector(".grid-container");

        const searchHead = document.querySelector("h2");
        searchHead.textContent = `Search results for : ${q}`
        gridContainer.innerHTML = "";
        anime.forEach((e) => {
            const animeCard = document.createElement("div");

            const animePoster = e.images.webp.large_image_url;
            const animeTitle = e.title_english || e.title;
            const score = e.score ? e.score : "NA";
            const animeEpisodes = e.episodes ? `${e.episodes} eps|` : "";
            const animeGenre = e.genres.length > 0 ? e.genres[0].name : "";
            const animeType = e.type || "TV";

            animeCard.setAttribute("mal-id", e.mal_id)
            animeCard.innerHTML = `
            <a href="details.html?mal_id=${e.mal_id}" class="text-decoration-none anime-card-link">
                <div class="img-wrapper rounded-3"><img src="${animePoster}" alt="${animeTitle}" class="rounded-3"></div>
                <h5 class="text-white text-truncate pt-2">${animeTitle}</h5>
                <p class="text-secondary">${animeEpisodes}${animeGenre}|${animeType}</p>
                <span class=" badge text-warning bg-dark rounded-pill position-absolute top-0 m-2"><i class="bi bi-star-fill pe-1"></i>${score}</span>
                </a>
            `;
            animeCard.classList.add("anime-card", "position-relative");
            gridContainer.append(animeCard);
        })

    }
    catch (err) {
        console.log("Searching failed", err);
    }
}