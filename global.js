// Initialize the Supabase Client Engine connection
const SUPABASE_URL = "https://rciojixucqjvfartarbh.supabase.co";
const SUPABASE_KEY = "sb_publishable_gzp4BWt8LIjpMFKEYuDSng_VOyCbGw3";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Ensure your supabase client is running at the top of the file!
// const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async(e) => {

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
            await signUp(email, password,username);
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

async function signUp(email, password,username) {


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

    if(!authContainer) return;

    const { data: { user }, error } = await supabaseClient.auth.getUser();//asks supabase if user is logged in

    if(user){
        const displayName = user.user_metadata?.username || "User";
        const avatarImg = user.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=Anime";

        authContainer.innerHTML=`
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