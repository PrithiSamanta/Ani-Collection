// Initialize the Supabase Client Engine connection
const SUPABASE_URL = "https://rciojixucqjvfartarbh.supabase.co";
const SUPABASE_KEY = "sb_publishable_gzp4BWt8LIjpMFKEYuDSng_VOyCbGw3";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Ensure your supabase client is running at the top of the file!
// const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", () => {

    // --- 1. SIGN UP LOGIC ---
    const signUpForm = document.querySelector("#signUpForm");
    if (signUpForm) {
        signUpForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.querySelector("#signUpEmail").value.trim();
            const password = document.querySelector("#signUpPassword").value.trim();
            const confirmPassword = document.querySelector("#confirmPassword").value.trim();

            const oldMsg = document.querySelector(".password-error-msg");
            if (oldMsg) oldMsg.remove();

            if (password !== confirmPassword) {
                const msg = document.createElement("p");
                msg.className = "password-error-msg text-danger small mt-2"; // Tidy styling classes
                msg.innerHTML = "Confirm password should be the same as password";

                // Append the error message text under the confirm password box layout
                confirmPassword.parentElement.append(msg);
                return; // STOP execution right here! Do not call Supabase.
            }

            // 6. If passwords match, proceed safely to register!
            await signUp(email, password);
        });

    }

    // --- 2. SIGN IN LOGIC ---
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

async function signUp(email, password) {

    // Call Supabase's native sign up engine
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        alert(`Sign Up Failed: ${error.message}`);
    } else {
        alert("Account created successfully! Welcome aboard.");
        window.location.reload(); // Refresh to update user interface state
    }
}