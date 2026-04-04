const SUPABASE_URL = "https://tztuukgwhsmtuhtinsod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vH8kgFdKWHCOIaQAhfZglQ_ybkjmNQO";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");
const sidebarUserName = document.getElementById("sidebarUserName");
const sidebarUserEmail = document.getElementById("sidebarUserEmail");
const logoutBtn = document.getElementById("logoutBtn");

const logoutModal = document.getElementById("logoutModal");
const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");
const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

async function cargarUsuarioLogueado() {
    try {
        const { data, error } = await supabaseClient.auth.getUser();

        if (error || !data?.user) {
            window.location.href = "login.html";
            return;
        }

        const user = data.user;

        let nombre =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.nombre ||
            user.email?.split("@")[0] ||
            "Usuario";

        let email = user.email || "Sin email";

        let avatar =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            "build/avat.svg";

        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("nombre, email, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Error al cargar el perfil:", profileError);
        }

        if (profile) {
            if (profile.nombre && profile.nombre.trim() !== "") {
                nombre = profile.nombre;
            }

            if (profile.email && profile.email.trim() !== "") {
                email = profile.email;
            }

            if (profile.avatar_url && profile.avatar_url.trim() !== "") {
                avatar = profile.avatar_url;
            }
        }

        if (sidebarUserName) sidebarUserName.textContent = nombre;
        if (sidebarUserEmail) sidebarUserEmail.textContent = email;

        if (sidebarUserAvatar) {
            sidebarUserAvatar.src = avatar;
            sidebarUserAvatar.onerror = () => {
                sidebarUserAvatar.src = "build/avat.svg";
            };
        }
    } catch (err) {
        console.error("Error en cargarUsuarioLogueado:", err);
    }
}

function abrirModalLogout() {
    if (logoutModal) {
        logoutModal.classList.add("active");
    }
}

function cerrarModalLogout() {
    if (logoutModal) {
        logoutModal.classList.remove("active");
    }
}

async function confirmarCerrarSesion() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Error al cerrar sesión:", error);
            alert("No se pudo cerrar sesión.");
            return;
        }

        window.location.href = "login.html";
    } catch (err) {
        console.error("Error inesperado al cerrar sesión:", err);
        alert("Ocurrió un error al cerrar sesión.");
    }
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", abrirModalLogout);
}

if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener("click", cerrarModalLogout);
}

if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", confirmarCerrarSesion);
}

if (logoutModal) {
    logoutModal.addEventListener("click", (e) => {
        if (e.target === logoutModal) {
            cerrarModalLogout();
        }
    });
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        cerrarModalLogout();
    }
});

cargarUsuarioLogueado();