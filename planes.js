const SUPABASE_URL = "https://tztuukgwhsmtuhtinsod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vH8kgFdKWHCOIaQAhfZglQ_ybkjmNQO";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   SIDEBAR USUARIO + LOGOUT
========================= */

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

/* =========================
   TU CÓDIGO ORIGINAL
========================= */

console.log("URL Supabase:", SUPABASE_URL);

const buscadorPlanes = document.getElementById("buscadorPlanes");

const modalNuevo = document.getElementById("modalNuevo");
const modalEditar = document.getElementById("modalEditar");

const abrirNuevoPlan = document.getElementById("abrirNuevoPlan");
const cerrarNuevo = document.getElementById("cerrarNuevo");
const cancelarNuevo = document.getElementById("cancelarNuevo");

const cerrarEditar = document.getElementById("cerrarEditar");
const cancelarEditar = document.getElementById("cancelarEditar");

const formNuevoPlan = document.getElementById("formNuevoPlan");
const formEditarPlan = document.getElementById("formEditarPlan");

const tbodyPlanes = document.getElementById("tbodyPlanes");
const contadorPlanes = document.getElementById("contadorPlanes");

const nuevoNombre = document.getElementById("nuevoNombre");
const nuevoDuracion = document.getElementById("nuevoDuracion");
const nuevoPrecio = document.getElementById("nuevoPrecio");
const nuevoEstado = document.getElementById("nuevoEstado");

const editarNombre = document.getElementById("editarNombre");
const editarDuracion = document.getElementById("editarDuracion");
const editarPrecio = document.getElementById("editarPrecio");
const editarEstado = document.getElementById("editarEstado");

let idEnEdicion = null;

function formatearPrecio(precio) {
    return Number(precio).toLocaleString("es-AR");
}

function crearBadgeEstado(estado) {
    const claseEstado = estado === "Activo" ? "activo" : "inactivo";
    const textoEstado = estado === "Activo" ? "ACTIVO" : "INACTIVO";
    return `<span class="estado ${claseEstado}">${textoEstado}</span>`;
}

function actualizarContadorPlanes() {
    const total = tbodyPlanes.querySelectorAll("tr").length;
    contadorPlanes.textContent = `Mostrando ${total} de ${total} planes`;
}

function limpiarFormularioNuevo() {
    nuevoNombre.value = "";
    nuevoDuracion.value = "";
    nuevoPrecio.value = "";
    nuevoEstado.value = "Activo";
}

function cerrarModalNuevo() {
    modalNuevo.classList.remove("active");
    limpiarFormularioNuevo();
}

function cerrarModalEditar() {
    modalEditar.classList.remove("active");
    idEnEdicion = null;
}

function crearFilaPlan(plan) {
    const tr = document.createElement("tr");
    tr.dataset.id = plan.id;

    tr.innerHTML = `
        <td>${plan.nombre}</td>
        <td>${plan.duracion_dias} días</td>
        <td>$ ${formatearPrecio(plan.precio)}</td>
        <td>${crearBadgeEstado(plan.estado)}</td>
        <td class="acciones">
            <button class="icon-btn btn-editar" title="Editar">
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 20H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <path d="M16.5 3.5A2.12 2.12 0 1 1 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
            </button>
            <button class="icon-btn btn-eliminar" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M3 6H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <path d="M8 6V4A1 1 0 0 1 9 3H15A1 1 0 0 1 16 4V6" stroke="currentColor" stroke-width="1.8"/>
                    <path d="M19 6L18 20A1 1 0 0 1 17 21H7A1 1 0 0 1 6 20L5 6" stroke="currentColor" stroke-width="1.8"/>
                </svg>
            </button>
        </td>
    `;

    const botonEditar = tr.querySelector(".btn-editar");
    const botonEliminar = tr.querySelector(".btn-eliminar");

    botonEditar.addEventListener("click", () => {
        idEnEdicion = plan.id;
        editarNombre.value = plan.nombre;
        editarDuracion.value = plan.duracion_dias;
        editarPrecio.value = plan.precio;
        editarEstado.value = plan.estado;
        modalEditar.classList.add("active");
    });

    botonEliminar.addEventListener("click", async () => {
        const confirmar = confirm(`¿Seguro que querés eliminar el plan "${plan.nombre}"?`);
        if (!confirmar) return;

        const { error } = await supabaseClient
            .from("planes")
            .delete()
            .eq("id", plan.id);

        if (error) {
            console.error(error);
            alert("Error al eliminar el plan.");
            return;
        }

        await cargarPlanes();
    });

    return tr;
}

abrirNuevoPlan.addEventListener("click", () => {
    limpiarFormularioNuevo();
    modalNuevo.classList.add("active");
});

cerrarNuevo.addEventListener("click", cerrarModalNuevo);
cancelarNuevo.addEventListener("click", cerrarModalNuevo);

cerrarEditar.addEventListener("click", cerrarModalEditar);
cancelarEditar.addEventListener("click", cerrarModalEditar);

[modalNuevo, modalEditar].forEach((modal) => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("active");
        }
    });
});

formNuevoPlan.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = nuevoNombre.value.trim();
    const duracion = parseInt(nuevoDuracion.value, 10);
    const precio = parseFloat(nuevoPrecio.value);
    const estado = nuevoEstado.value;

    if (!nombre || !duracion || !precio || !estado) {
        alert("Completá todos los campos.");
        return;
    }

    const { error } = await supabaseClient
        .from("planes")
        .insert({
            nombre,
            duracion_dias: duracion,
            precio,
            estado
        });

    if (error) {
        console.error("Error al crear plan:", error);
        alert("No se pudo guardar el plan.");
        return;
    }

    cerrarModalNuevo();
    await cargarPlanes();
});

formEditarPlan.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!idEnEdicion) return;

    const nombre = editarNombre.value.trim();
    const duracion = parseInt(editarDuracion.value, 10);
    const precio = parseFloat(editarPrecio.value);
    const estado = editarEstado.value;

    if (!nombre || !duracion || !precio || !estado) {
        alert("Completá todos los campos.");
        return;
    }

    const { error } = await supabaseClient
        .from("planes")
        .update({
            nombre,
            duracion_dias: duracion,
            precio,
            estado
        })
        .eq("id", idEnEdicion);

    if (error) {
        console.error("Error al editar plan:", error);
        alert("No se pudo actualizar el plan.");
        return;
    }

    cerrarModalEditar();
    await cargarPlanes();
});

buscadorPlanes.addEventListener("input", () => {
    cargarPlanes(buscadorPlanes.value);
});

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
    cargarUsuarioLogueado(); // 👈 agregado
    cargarPlanes();
});

async function cargarPlanes(filtro = "") {
    let query = supabaseClient
        .from("planes")
        .select("*")
        .order("id", { ascending: true });

    if (filtro.trim() !== "") {
        query = query.ilike("nombre", `%${filtro.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error cargando planes:", error);
        alert("No se pudieron cargar los planes.");
        return;
    }

    tbodyPlanes.innerHTML = "";

    data.forEach((plan) => {
        tbodyPlanes.appendChild(crearFilaPlan(plan));
    });

    actualizarContadorPlanes();
}