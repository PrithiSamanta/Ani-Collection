document.addEventListener("DOMContentLoaded", async () => {
    // 1. Navbar Search Bar Handling
    setupNavbarSearch();

    // 2. Auth State Check
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error || !user) {
            showRestrictedUI();
            return;
        }
        await initProfile(user);
    } catch (err) {
        console.error("Auth initialization failed:", err);
        showRestrictedUI();
    }
});

function setupNavbarSearch() {
    const handleSearch = (q) => {
        if (!q) return;
        const params = new URLSearchParams();
        params.append("q", q);
        window.location.href = `search.html?${params.toString()}`;
    };

    const searchInput = document.querySelector("#searchInput");
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleSearch(searchInput.value.trim());
        });
    }

    const searchInputSm = document.querySelector("#searchInput-sm");
    if (searchInputSm) {
        searchInputSm.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleSearch(searchInputSm.value.trim());
        });
    }
}

function showRestrictedUI() {
    document.querySelector("#profile-loading").classList.add("d-none");
    document.querySelector("#profile-restricted").classList.remove("d-none");
    document.querySelector("#profile-dashboard").classList.add("d-none");
}

let activeWatchlist = [];
let currentUser = null;
let currentFilterStatus = "All";

async function initProfile(user) {
    currentUser = user;

    // Display basic info
    const displayName = user.user_metadata?.username || "Otaku Name";
    const avatarUrl = user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

    document.querySelector("#user-avatar").src = avatarUrl;
    document.querySelector("#user-name").textContent = displayName;
    document.querySelector("#user-email").textContent = user.email;

    // Setup Edit Profile fields
    document.querySelector("#editUsername").value = displayName;
    document.querySelector("#avatar-preview").src = avatarUrl;

    // Load Watchlist Data
    await refreshWatchlist();

    // Bind Edit Profile Form
    setupProfileForm();

    // Bind Watchlist Filters and Sorting
    setupWatchlistControls();

    // Hide loading show dashboard
    document.querySelector("#profile-loading").classList.add("d-none");
    document.querySelector("#profile-dashboard").classList.remove("d-none");
}

async function refreshWatchlist() {
    try {
        // Fetch a fresh batch of data straight from Supabase
        activeWatchlist = await window.getWatchlistData(currentUser.id);

        // Sort initially by updated_at descending
        sortWatchlist();

        // Compute stats
        computeStats();

        // Render list onto the screen grid
        renderWatchlist();
    } catch (err) {
        console.error("Failed to refresh watchlist from Supabase:", err);
        alert("Could not load your watchlist: " + err.message);
    }
}

function computeStats() {
    const total = activeWatchlist.length;
    const episodes = activeWatchlist.reduce((sum, item) => sum + (item.episodes_watched || 0), 0);

    // Avg Score
    const ratedItems = activeWatchlist.filter(item => item.score > 0);
    const avgScore = ratedItems.length > 0
        ? (ratedItems.reduce((sum, item) => sum + item.score, 0) / ratedItems.length).toFixed(1)
        : "N/A";

    // Watch Time: ~24 minutes per episode, convert to hours or days
    const watchTimeMins = episodes * 24;
    let watchTimeText = "0h";
    if (watchTimeMins > 0) {
        const hours = watchTimeMins / 60;
        if (hours >= 24) {
            watchTimeText = `${(hours / 24).toFixed(1)}d`;
        } else {
            watchTimeText = `${hours.toFixed(1)}h`;
        }
    }

    // Rank / Title based on Watched count
    const completedCount = activeWatchlist.filter(item => item.status === "Watched").length;
    let rankText = "Level 1: Novice Watcher";
    if (completedCount >= 30) {
        rankText = "Level 5: Legendary Hokage";
    } else if (completedCount >= 15) {
        rankText = "Level 4: Anime Champion";
    } else if (completedCount >= 7) {
        rankText = "Level 3: Seasoned Otaku";
    } else if (completedCount >= 2) {
        rankText = "Level 2: Casual Enjoyer";
    }

    // Inject stats
    document.querySelector("#stat-total").textContent = total;
    document.querySelector("#stat-episodes").textContent = episodes;
    document.querySelector("#stat-avg-score").textContent = avgScore;
    document.querySelector("#stat-watchtime").textContent = watchTimeText;
    document.querySelector("#user-rank").textContent = rankText;

    // Inject tab counts
    document.querySelector("#count-all").textContent = total;
    document.querySelector("#count-watching").textContent = activeWatchlist.filter(i => i.status === "Watching").length;
    document.querySelector("#count-watched").textContent = completedCount;
    document.querySelector("#count-plan").textContent = activeWatchlist.filter(i => i.status === "Plan to Watch").length;
    document.querySelector("#count-dropped").textContent = activeWatchlist.filter(i => i.status === "Dropped").length;
}

function renderWatchlist() {
    const container = document.querySelector("#watchlist-container");
    const emptyState = document.querySelector("#watchlist-empty");
    container.innerHTML = "";

    const searchQuery = document.querySelector("#watchlist-search").value.toLowerCase().trim();

    // Filter items
    const filteredList = activeWatchlist.filter(item => {
        const matchesStatus = currentFilterStatus === "All" || item.status === currentFilterStatus;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery);
        return matchesStatus && matchesSearch;
    });

    if (filteredList.length === 0) {
        emptyState.classList.remove("d-none");
        container.classList.add("d-none");
        return;
    }

    emptyState.classList.add("d-none");
    container.classList.remove("d-none");

    // 🌟 STEP 1: Create a highly responsive, overflow-protected Bootstrap row wrapper!
    const gridRow = document.createElement("div");
    gridRow.className = "row g-3 row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 w-100 m-0";

    filteredList.forEach(item => {
        // 🌟 STEP 2: Wrap every separate anime entry inside a standardized Bootstrap grid column
        const colWrapper = document.createElement("div");
        colWrapper.className = "col p-1";

        const scoreBadge = item.score ? `<span class="watchlist-card-score"><i class="bi bi-star-fill text-warning"></i> ${item.score}</span>` : "";

        let statusDotClass = "status-watching-dot";
        if (item.status === "Watched") statusDotClass = "status-watched-dot";
        else if (item.status === "Plan to Watch") statusDotClass = "status-plan-dot";
        else if (item.status === "Dropped") statusDotClass = "status-dropped-dot";

        const totalEps = parseInt(item.total_episodes) || 0;
        const watchedEps = parseInt(item.episodes_watched) || 0;
        const progressPct = totalEps > 0 ? Math.min(100, (watchedEps / totalEps) * 100) : 0;
        const progressText = totalEps > 0 ? `${watchedEps} / ${totalEps} eps` : `${watchedEps} eps`;

        // 🌟 STEP 3: Embed your component elements inside the protective column box
        colWrapper.innerHTML = `
            <div class="watchlist-card h-100" data-mal-id="${item.mal_id}">
                <div class="watchlist-card-img-wrapper">
                    ${scoreBadge}
                    <img src="${item.image_url}" alt="${item.title}" class="img-fluid w-100" style="aspect-ratio: 2/3; object-fit: cover;">
                    <div class="watchlist-card-overlay">
                        <a href="details.html?mal_id=${item.mal_id}" class="btn btn-sm btn-outline-warning px-2 py-1 fw-bold small">
                            <i class="bi bi-info-circle-fill me-1"></i>Details
                        </a>
                        <button class="btn btn-sm px-2 py-1 fw-bold small btn-quick-inc ${item.status === 'Watched' ? 'btn-secondary disabled text-muted' : 'btn-light'}" 
                            onclick="${item.status !== 'Watched' ? `quickIncrementEpisode(${item.mal_id})` : 'void(0)'}"
                            ${item.status === 'Watched' ? 'disabled title="Already completed"' : ''}>
                            <i class="bi bi-plus-circle-fill me-1"></i>+1 Ep
                        </button>
                        <button class="btn btn-sm btn-outline-light px-2 py-1 fw-bold small" onclick="openEditWatchlistModal(${item.mal_id})">
                            <i class="bi bi-pencil-fill me-1"></i>Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger px-2 py-1 fw-bold small" onclick="deleteWatchlistItemClick(${item.mal_id})">
                            <i class="bi bi-trash-fill me-1"></i>Del
                        </button>
                    </div>
                </div>
                <div class="watchlist-card-body p-2">
                    <h6 class="watchlist-card-title text-truncate m-0 small" title="${item.title}" style="max-width: 100%; display: block;">${item.title}</h6>
                    <div class="d-flex align-items-center justify-content-between mt-2 flex-wrap gap-1">
                        <span class="small text-secondary" style="font-size: 11px;">
                            <span class="status-indicator ${statusDotClass}"></span>${item.status}
                        </span>
                        <span class="small text-secondary fw-semibold" style="font-size: 11px;">${progressText}</span>
                    </div>
                    <div class="progress-container mt-2">
                        <div class="custom-progress" style="height: 4px;">
                            <div class="custom-progress-bar" style="width: ${progressPct}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        // Append the column inside your row engine deck line
        gridRow.appendChild(colWrapper);
    });

    // 🌟 STEP 4: Mount the single, unified protective row into your parent viewport element box!
    container.appendChild(gridRow);
}

//click watchlsit on mobile devices
document.getElementById("watchlist-container").addEventListener("click", (e) => {
    if (window.innerWidth > 768) return;

    const clickedCard = e.target.closest(".watchlist-card");
    if (!clickedCard) return;

    // Locate the exact overlay element tied structurally inside this single card container block
    const targetOverlay = clickedCard.querySelector(".watchlist-card-overlay");
    if (!targetOverlay) return;

    // Let button events pass through cleanly
    if (e.target.closest("button") || e.target.closest("a")) return;

    e.preventDefault();

    // Check if this specific overlay is currently active
    const isCurrentlyVisible = targetOverlay.classList.contains("d-flex");

    // Hide all other active card overlays across the entire grid
    document.querySelectorAll(".watchlist-card-overlay.d-flex").forEach(overlay => {
        overlay.classList.remove("d-flex");
    });

    // Toggle the targeted overlay
    if (!isCurrentlyVisible) {
        targetOverlay.classList.add("d-flex");
    }
});

function sortWatchlist() {
    const sortBy = document.querySelector("#watchlist-sort").value;
    if (sortBy === "title") {
        activeWatchlist.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "score") {
        activeWatchlist.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else { // default: updated
        activeWatchlist.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }
}

function setupWatchlistControls() {
    // Tab filtering
    const tabButtons = document.querySelectorAll("#watchlistTabs button");
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilterStatus = btn.getAttribute("data-status");
            renderWatchlist();
        });
    });

    // Real-time Title Search
    document.querySelector("#watchlist-search").addEventListener("input", renderWatchlist);

    // Sorting Dropdown
    const sortSelect = document.querySelector("#watchlist-sort");
    sortSelect.addEventListener("change", () => {
        sortWatchlist();
        renderWatchlist();
    });

    // Edit entry form submission
    const editWatchlistForm = document.querySelector("#editWatchlistForm");
    editWatchlistForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const malId = parseInt(document.querySelector("#editItemMalId").value);
        const status = document.querySelector("#editStatusSelect").value;
        const scoreVal = document.querySelector("#editRateInput").value;
        const epWatchedVal = parseInt(document.querySelector("#editEpWatchedInput").value) || 0;

        const score = scoreVal ? parseInt(scoreVal) : null;

        const currentItem = activeWatchlist.find(i => i.mal_id === malId);
        if (!currentItem) return;

        const updatedItem = {
            ...currentItem,
            status,
            score,
            episodes_watched: epWatchedVal
        };

        try {
            await window.saveWatchlistItem(currentUser.id, updatedItem);

            // Close modal
            const editModalEl = document.getElementById("editWatchlistModal");
            const modalInstance = bootstrap.Modal.getInstance(editModalEl);
            if (modalInstance) modalInstance.hide();

            alert("Entry updated successfully!");
            await refreshWatchlist();
        } catch (err) {
            console.error("Error updating watchlist entry:", err);
            alert("Update failed: " + err.message);
        }
    });
}

function setupProfileForm() {
    const editProfileForm = document.querySelector("#editProfileForm");
    const editUsernameInput = document.querySelector("#editUsername");
    const avatarPreviewImg = document.querySelector("#avatar-preview");
    const randomizeBtn = document.querySelector("#randomizeUsername");

    const updatePreview = () => {
        const seed = editUsernameInput.value.trim() || currentUser.email;
        avatarPreviewImg.src = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
    };

    // Live update preview as user types username
    editUsernameInput.addEventListener("input", updatePreview);

    // Random username generator
    randomizeBtn.addEventListener("click", () => {
        const randomNames = [
            "Goku", "Luffy", "Zoro", "Naruto", "Sasuke", "Kakashi", "Deku", "Gojo", "Sukuna",
            "Tanjiro", "Nezuko", "Saitama", "Levi", "Eren", "Mikasa", "Alucard", "Saber",
            "Killua", "Gon", "Hisoka", "Kurosaki", "Ichigo", "Vegeta", "Sanji", "Nami",
            "Light", "L_Lawliet", "Edward", "Alphonse", "Mustang", "Kaneki", "Rimuru",
            "Anya", "Loid", "Yor", "Denji", "Makima", "Power", "Aizen", "Rukia",
            "Bakugo", "Todoroki", "Kurapika", "Chollo", "Yusuke", "Hiei", "Dio",
            "Jotaro", "Guts", "Griffith", "Mob", "Reigen"
        ];
        const randomSuffixes = ["Senpai", "Sensei", "Sama", "Kun", "San", "Chan", "Otaku", "Hokage", "Pirate", "Hunter", "Shinigami", "Titan", "Ninja", "Demon", "Vampire", "Dragon", "Angel", "Wizard", "Warrior", "Mage", "Cyberpunk", "Legend", "Master", "King", "Queen"];

        const randName = randomNames[Math.floor(Math.random() * randomNames.length)];
        const randSuffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
        const useNumber = Math.random() > 0.4;

        let newUsername = `${randName}_${randSuffix}`;
        if (useNumber) {
            newUsername += Math.floor(Math.random() * 99 + 1);
        }

        editUsernameInput.value = newUsername;
        updatePreview();
    });

    editProfileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = editUsernameInput.value.trim();
        const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${username}`;

        try {
            const { data, error } = await supabaseClient.auth.updateUser({
                data: {
                    username: username,
                    avatar_url: avatarUrl
                }
            });

            if (error) throw error;

            // Hide Modal
            const profileModalEl = document.getElementById("editProfileModal");
            const modalInstance = bootstrap.Modal.getInstance(profileModalEl);
            if (modalInstance) modalInstance.hide();

            alert("Profile updated successfully!");
            window.location.reload();
        } catch (err) {
            console.error("Failed to update profile:", err);
            alert("Profile update failed: " + err.message);
        }
    });
}

// Global functions exposed to window for inline onclick attributes
window.quickIncrementEpisode = async function (malId) {
    const item = activeWatchlist.find(i => i.mal_id === malId);
    if (!item) return;

    const totalEps = parseInt(item.total_episodes) || 0;
    let nextWatched = (parseInt(item.episodes_watched) || 0) + 1;

    // Clamp to total episodes if known
    if (totalEps > 0 && nextWatched > totalEps) {
        alert("You have already reached the maximum episodes count!");
        return;
    }

    // Automatically transition to Watched if maxed out 
    let nextStatus = item.status;
    if (totalEps > 0 && nextWatched === totalEps) {
        nextStatus = "Watched";
    }

    const updatedItem = {
        ...item,
        episodes_watched: nextWatched,
        status: nextStatus
    };

    try {
        await window.saveWatchlistItem(currentUser.id, updatedItem);
        await refreshWatchlist();
    } catch (err) {
        console.error("Failed to increment progress:", err);
    }
};

window.openEditWatchlistModal = function (malId) {
    const item = activeWatchlist.find(i => i.mal_id === malId);
    if (!item) return;

    document.querySelector("#edit-modal-anime-title").textContent = item.title;
    document.querySelector("#editItemMalId").value = item.mal_id;
    document.querySelector("#editStatusSelect").value = item.status;
    document.querySelector("#editRateInput").value = item.score || "";
    document.querySelector("#editEpWatchedInput").value = item.episodes_watched || 0;

    // Set episode limit based on the current anime's total episode count
    const epInput = document.querySelector("#editEpWatchedInput");
    if (epInput && item.total_episodes) {
        const totalEps = item.total_episodes;
        if (totalEps > 0) {
            epInput.max = totalEps;
            epInput.placeholder = `0 - ${totalEps}`;
        } else {
            epInput.removeAttribute("max");
            epInput.placeholder = "0";
        }
        epInput.value = "";
    }

    const editModalEl = document.getElementById("editWatchlistModal");
    const modalInstance = new bootstrap.Modal(editModalEl);
    modalInstance.show();
};

window.deleteWatchlistItemClick = async function (malId) {
    const item = activeWatchlist.find(i => i.mal_id === malId);
    if (!item) return;

    const confirmDelete = confirm(`Are you sure you want to remove "${item.title}" from your watchlist?`);
    if (!confirmDelete) return;

    try {
        await window.deleteWatchlistItem(currentUser.id, malId);
        alert("Removed from watchlist.");
        await refreshWatchlist();
    } catch (err) {
        console.error("Failed to delete entry:", err);
        alert("Failed to delete entry: " + err.message);
    }
};
