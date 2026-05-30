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
    activeWatchlist = await window.getWatchlistData(currentUser.id);
    
    // Sort initially by updated_at descending
    sortWatchlist();
    
    // Compute stats
    computeStats();
    
    // Render list
    renderWatchlist();
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

    filteredList.forEach(item => {
        const card = document.createElement("div");
        card.className = "watchlist-card";
        card.setAttribute("data-mal-id", item.mal_id);

        const scoreBadge = item.score ? `<span class="watchlist-card-score"><i class="bi bi-star-fill text-warning"></i> ${item.score}</span>` : "";
        
        let statusDotClass = "status-watching-dot";
        if (item.status === "Watched") statusDotClass = "status-watched-dot";
        else if (item.status === "Plan to Watch") statusDotClass = "status-plan-dot";
        else if (item.status === "Dropped") statusDotClass = "status-dropped-dot";

        // Progress bar calculation
        const totalEps = parseInt(item.total_episodes) || 0;
        const watchedEps = parseInt(item.episodes_watched) || 0;
        const progressPct = totalEps > 0 ? Math.min(100, (watchedEps / totalEps) * 100) : 0;
        const progressText = totalEps > 0 ? `${watchedEps} / ${totalEps} eps` : `${watchedEps} eps`;

        card.innerHTML = `
            <div class="watchlist-card-img-wrapper">
                ${scoreBadge}
                <img src="${item.image_url}" alt="${item.title}">
                <div class="watchlist-card-overlay">
                    <a href="details.html?mal_id=${item.mal_id}" class="btn btn-sm btn-outline-warning px-3 py-1 fw-bold">
                        <i class="bi bi-info-circle-fill me-1"></i>View Details
                    </a>
                    <button class="btn btn-sm px-3 py-1 fw-bold btn-quick-inc ${item.status === 'Watched' ? 'btn-secondary disabled text-muted' : 'btn-light'}" 
                        onclick="${item.status !== 'Watched' ? `quickIncrementEpisode(${item.mal_id})` : 'void(0)'}"
                        ${item.status === 'Watched' ? 'disabled title="Already completed"' : ''}>
                        <i class="bi bi-plus-circle-fill me-1"></i>+1 Ep
                    </button>
                    <button class="btn btn-sm btn-outline-light px-3 py-1 fw-bold" onclick="openEditWatchlistModal(${item.mal_id})">
                        <i class="bi bi-pencil-fill me-1"></i>Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger px-3 py-1 fw-bold" onclick="deleteWatchlistItemClick(${item.mal_id})">
                        <i class="bi bi-trash-fill me-1"></i>Delete
                    </button>
                </div>
            </div>
            <div class="watchlist-card-body">
                <h6 class="watchlist-card-title text-truncate m-0" title="${item.title}">${item.title}</h6>
                <div class="d-flex align-items-center justify-content-between mt-2">
                    <span class="small text-secondary">
                        <span class="status-indicator ${statusDotClass}"></span>${item.status}
                    </span>
                    <span class="small text-secondary fw-semibold">${progressText}</span>
                </div>
                <div class="progress-container">
                    <div class="custom-progress">
                        <div class="custom-progress-bar" style="width: ${progressPct}%"></div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

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
        const randomNames = ["Goku", "Luffy", "Zoro", "Naruto", "Sasuke", "Kakashi", "Deku", "Gojo", "Sukuna", "Tanjiro", "Nezuko", "Saitama", "Levi", "Eren", "Mikasa", "Alucard", "Saber", "Killua", "Gon", "Hisoka", "Kurosaki", "Ichigo", "Vegeta", "Sanji", "Nami"];
        const randomSuffixes = ["Senpai", "Sensei", "Sama", "Kun", "San", "Chan", "Otaku", "Hokage", "Pirate", "Hunter", "Shinigami", "Titan"];
        
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
window.quickIncrementEpisode = async function(malId) {
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

window.openEditWatchlistModal = function(malId) {
    const item = activeWatchlist.find(i => i.mal_id === malId);
    if (!item) return;

    document.querySelector("#edit-modal-anime-title").textContent = item.title;
    document.querySelector("#editItemMalId").value = item.mal_id;
    document.querySelector("#editStatusSelect").value = item.status;
    document.querySelector("#editRateInput").value = item.score || "";
    document.querySelector("#editEpWatchedInput").value = item.episodes_watched || 0;

    const editModalEl = document.getElementById("editWatchlistModal");
    const modalInstance = new bootstrap.Modal(editModalEl);
    modalInstance.show();
};

window.deleteWatchlistItemClick = async function(malId) {
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
