// Initialize the Supabase Client Engine connection
const SUPABASE_URL = "https://rciojixucqjvfartarbh.supabase.co";
const SUPABASE_KEY = "sb_publishable_gzp4BWt8LIjpMFKEYuDSng_VOyCbGw3";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async (e) => {

    await managerNavBarState();


    // ---  SIGN UP LOGIC ---
    const signUpForm = document.querySelector("#signUpForm");
    if (signUpForm) {
        signUpForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const username = document.querySelector("#signUpUsername").value.trim();
            const email = document.querySelector("#signUpEmail").value.trim();
            const password = document.querySelector("#signUpPassword").value.trim();
            const confirmPassword = document.querySelector("#confirmPassword").value.trim();

            const oldMsg = document.querySelector(".password-error-msg");
            if (oldMsg) oldMsg.remove();

            if (password !== confirmPassword) {
                const msg = document.createElement("p");
                msg.className = "password-error-msg text-danger small mt-2";
                msg.innerHTML = "Confirm password should be the same as password";

                // Append the error message text under the confirm password box layout
                document.querySelector("#confirmPassword").parentElement.append(msg);
                return; // STOP execution right here! Do not call Supabase.
            }

            // If passwords match, proceed safely to register!
            await signUp(email, password, username);
        });

    }

    // --- SIGN IN LOGIC ---
    const signInForm = document.querySelector("#signInForm");
    if (signInForm) {
        signInForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.querySelector("#signInEmail").value.trim();
            const password = document.querySelector("#signInPassword").value;

            // Call Supabase's native sign in engine
            await signIn(email, password);
        });
    }


    const addToListBtn = document.querySelector("#addToListBtn");
    if (addToListBtn) {
        addToListBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation()

            // const { data: { user }, error } = await supabaseClient.auth.getUser();

            // if (!user) {
            //     alert("You must be signed in to add anime to watchlist");
            //     // const signInModal = new bootstrap.Modal(document.getElementById('signInModal'));
            //     // signInModal.show();
            //     return;
            // }

            // const animeTitle = document.querySelector("#text-details h2").textContent;
            // document.querySelector("#anime-title-modal").textContent = animeTitle;

            // const addToListModal = new bootstrap.Modal(document.getElementById('addToListModal'));
            // addToListModal.show();
            // console.log("hello")
            // try {
            //     // Fetch the user session safely
            //     const { data: { user }, error } = await supabaseClient.auth.getUser();

            //     if (error) {
            //         console.error("Supabase returned an authentication error:", error.message);
            //     }


            //     if (!user) {
            //         alert("You must be signed in to add anime to watchlist");
            //         return;
            //     }

            //     // If user exists, your layout title changes next
            //     const animeTitle = document.querySelector("#text-details h2").textContent;
            //     document.querySelector("#anime-title-modal").textContent = animeTitle;

            //     const addToListModal = new window.bootstrap.Modal(document.getElementById('addToListModal'));
            //     addToListModal.show();

            // } catch (crashError) {
            //     //  If Supabase fails or your variables are misconfigured, this will capture it!
            //     console.error("The script crashed mid-execution. Reason:", crashError);
            //     alert("Something went wrong behind the scenes while verifying your session.");
            // }
        });
    }


});


async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert(`Login Failed: ${error.message}`);
    } else {
        alert("Welcome back!");
        window.location.reload();
    }
}

async function signUp(email, password, username) {


    const automaticAvatarUrl = `https://api.dicebear.com/7.x/initials/svg`;

    // Call Supabase's native sign up engine
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {

            data: {
                username: username,
                avatar_url: automaticAvatarUrl
            }
        }
    });

    if (error) {
        alert(`Sign Up Failed: ${error.message}`);
    } else {
        alert("Account created successfully! Welcome aboard.");
        window.location.reload(); // Refresh to update user interface state
    }
}

async function managerNavBarState() {
    const authContainer = document.querySelector("#nav-auth-container");

    if (!authContainer) return;

    const { data: { user }, error } = await supabaseClient.auth.getUser();//asks supabase if user is logged in

    if (user) {
        const displayName = user.user_metadata?.username || "User";
        const avatarImg = user.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=Anime";

        authContainer.innerHTML = `
        <div class="dropdown">
                <a href="#" class="d-block link-body-emphasis text-decoration-none dropdown-toggle no-caret" data-bs-toggle="dropdown" aria-expanded="false">
                    <img src="${avatarImg}" alt="${displayName}" width="38" height="38" class="rounded-circle border border-danger">
                </a>
                <ul class="dropdown-menu dropdown-menu-end bg-dark border-secondary text-white shadow" style="min-width: 200px;">
                    
                    <li><a class="dropdown-item text-white" href="profile.html"><i class="bi bi-person-circle pe-2"></i>My Profile</a></li>
                    <li><hr class="dropdown-divider border-secondary"></li>
                    <li><button id="logoutBtn" class="dropdown-item text-danger"><i class="bi bi-box-arrow-right pe-2"></i>Logout</button></li>
                </ul>
            </div>  
        `;
        const logoutBtn = document.querySelector("#logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", async () => {
                const { error } = await supabaseClient.auth.signOut();
                if (error) {
                    alert(`Logout failed: ${error.message}`);
                } else {
                    alert("Logged out successfully!");
                    window.location.href = "home.html"; // Safely kick them back to home
                }
            });
        }
    }
}



//add to list

// this function directly to the window so the HTML can always see it
window.handleWatchlistButtonClick = async function(event) {
    event.preventDefault();


    try {
        // 2. Talk to Supabase
        const { data: { user }, error } = await supabaseClient.auth.getUser();

        if (error) {
            console.error("Supabase Session Error:", error.message);
        }

        // 3. Check authentication status
        if (!user) {
            alert("You must be signed in to add anime to your watchlist!");
            
            const signInModalElement = document.getElementById('signInModal');
            const signInModal = new window.bootstrap.Modal(signInModalElement);
            signInModal.show();
            return;
        }

        // 4. If logged in, grab title and open configuration layout
        const animeTitle = document.querySelector("#text-details h2").textContent;
        document.querySelector("#anime-title-modal").textContent = `Anime Name : ${animeTitle}`;

        // Set episode limit based on the current anime's total episode count
        const epInput = document.querySelector("#epWatchedInput");
        if (epInput && window.currentAnime) {
            const totalEps = window.currentAnime.total_episodes;
            if (totalEps > 0) {
                epInput.max = totalEps;
                epInput.placeholder = `0 - ${totalEps}`;
            } else {
                epInput.removeAttribute("max");
                epInput.placeholder = "0";
            }
            epInput.value = "";
        }

        const addToListModalElement = document.getElementById('addToListModal');
        const addToListModal = new bootstrap.Modal(addToListModalElement);
        addToListModal.show();

    } catch (crashError) {
        console.error("Critical execution crash:", crashError);
        alert("The authentication thread crashed. Check console.");
    }
};


/**
 * Fetch data straight from the cloud.
 * Returns an empty array if the user has no items yet.
 */
window.getWatchlistData = async function(userId) {
    const { data, error } = await supabaseClient
        .from('user_anime_list')
        .select('*')
        .eq('user_id', userId);
        
    if (error) {
        console.error("[Supabase Fetch Error]:", error.message, error.details);
        throw new Error(`Failed to fetch watchlist: ${error.message}`);
    }
    
    return data || [];
};

/**
 * Pure Upsert: Inserts a new anime or updates an existing entry if user_id+mal_id matches.
 */
window.saveWatchlistItem = async function(userId, item) {
    const payload = {
        user_id: userId,
        mal_id: parseInt(item.mal_id), // Force integer matching
        title: item.title,
        image_url: item.image_url,
        status: item.status,
        score: item.score ? parseInt(item.score) : null,
        episodes_watched: parseInt(item.episodes_watched) || 0,
        total_episodes: parseInt(item.total_episodes) || 0,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
        .from('user_anime_list')
        .upsert(payload, { onConflict: 'user_id,mal_id' });

    if (error) {
        console.error("❌ [Supabase Save Error]:", error.message, error.details);
        throw new Error(`Failed to save watchlist item: ${error.message}`);
    }
    
    console.log("[Supabase Sync]: Watchlist saved successfully!");
    return { success: true };
};

/**
 * Pure Delete: Removes the entry permanently from your cloud database table row.
 */
window.deleteWatchlistItem = async function(userId, malId) {
    const { error } = await supabaseClient
        .from('user_anime_list')
        .delete()
        .eq('user_id', userId)
        .eq('mal_id', parseInt(malId));

    if (error) {
        console.error(" [Supabase Delete Error]:", error.message, error.details);
        throw new Error(`Failed to delete watchlist item: ${error.message}`);
    }

    console.log(" [Supabase Sync]: Watchlist item deleted successfully!");
    return { success: true };
};


//navbar color change after scroll

window.addEventListener('scroll', () => {
  const nav = document.querySelector(".navbar");
  
  // Change color after scrolling 200px
  if (window.scrollY > 200) {
    nav.classList.add("bg-black")
  } else {
    nav.classList.remove("bg-black");
  }
});