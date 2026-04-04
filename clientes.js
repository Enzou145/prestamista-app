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
        let nombre = user.user_metadata?.nombre || user.email?.split("@")[0] || "Usuario";
        let email = user.email || "Sin email";
        let avatar = user.user_metadata?.avatar_url || "build/avat.svg";

        const { data: profile } = await supabaseClient
            .from("profiles")
            .select("nombre, email, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

        if (profile) {
            nombre = profile.nombre || nombre;
            email = profile.email || email;
            avatar = profile.avatar_url || avatar;
        }

        if (sidebarUserName) sidebarUserName.textContent = nombre;
        if (sidebarUserEmail) sidebarUserEmail.textContent = email;
        if (sidebarUserAvatar) sidebarUserAvatar.src = avatar;

    } catch (err) {
        console.error("Error en cargarUsuarioLogueado:", err);
    }
}

// LOGOUT LOGIC
if (logoutBtn) logoutBtn.addEventListener("click", () => logoutModal.classList.add("active"));
if (cancelLogoutBtn) cancelLogoutBtn.addEventListener("click", () => logoutModal.classList.remove("active"));
if (confirmLogoutBtn) confirmLogoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
});

/* =========================
   LÓGICA DE CLIENTES
========================= */
const PAGE_SIZE = 7;
let paginaActual = 0;
let totalClientes = 0;
let filtroActual = "";
let clienteEnEdicion = null;
let clienteAEliminar = null;

// Elementos del DOM
const listaClientes = document.getElementById("listaClientes");
const contadorClientes = document.getElementById("contadorClientes");
const buscadorClientes = document.getElementById("buscadorClientes");
const btnAnterior = document.getElementById("btnAnterior");
const btnSiguiente = document.getElementById("btnSiguiente");
const toast = document.getElementById("toast");

// Modales
const modalNuevoCliente = document.getElementById("modalNuevoCliente");
const modalEditarCliente = document.getElementById("modalEditarCliente");
const modalEliminarCliente = document.getElementById("modalEliminarCliente");

// Botones Abrir/Cerrar
const abrirModalNuevo = document.getElementById("abrirModalNuevo");
const cerrarNuevoCliente = document.getElementById("cerrarNuevoCliente");
const cancelarNuevoCliente = document.getElementById("cancelarNuevoCliente");
const cerrarEditarCliente = document.getElementById("cerrarEditarCliente");
const cancelarEditarCliente = document.getElementById("cancelarEditarCliente");
const cerrarEliminarCliente = document.getElementById("cerrarEliminarCliente");
const cancelarEliminarCliente = document.getElementById("cancelarEliminarCliente");
const confirmarEliminarCliente = document.getElementById("confirmarEliminarCliente");

// Formularios e Inputs (CORREGIDOS)
const formNuevoCliente = document.getElementById("formNuevoCliente");
const nuevoNombreCliente = document.getElementById("nuevoNombreCliente");
const nuevoApellidoCliente = document.getElementById("nuevoApellidoCliente");
const nuevoDniCliente = document.getElementById("nuevoDniCliente"); // ID Corregido
const nuevoTelCliente = document.getElementById("nuevoTelefonoCliente"); // ID Corregido
const nuevoCiudad = document.getElementById("nuevoCiudadCliente");
const nuevoBarrio = document.getElementById("nuevoBarrioCliente");
const nuevoCalle = document.getElementById("nuevoCalleCliente");
const nuevoNro = document.getElementById("nuevoNroCliente");
const nuevoOcupacionCliente = document.getElementById("nuevoOcupacionCliente");
const nuevoEstadoCliente = document.getElementById("nuevoEstadoCliente");

// Campos Nuevos
const nuevoSenaCliente = document.getElementById("nuevoSenaCliente");
const nuevoMontoCliente = document.getElementById("nuevoMontoCliente");

const formEditarCliente = document.getElementById("formEditarCliente");
const editarNombreCliente = document.getElementById("editarNombreCliente");
const editarApellidoCliente = document.getElementById("editarApellidoCliente");
const editarTelefonoCliente = document.getElementById("editarTelefonoCliente");
const editarEmailCliente = document.getElementById("editarEmailCliente"); 
const editarEstadoCliente = document.getElementById("editarEstadoCliente");

const editarDniCliente = document.getElementById("editarDniCliente");
const editarCiudadCliente = document.getElementById("editarCiudadCliente");
const editarBarrioCliente = document.getElementById("editarBarrioCliente");
const editarCalleCliente = document.getElementById("editarCalleCliente");
const editarNroCliente = document.getElementById("editarNroCliente");
const editarOcupacionCliente = document.getElementById("editarOcupacionCliente");

// NUEVOS
const editarSenaCliente = document.getElementById("editarSenaCliente");
const editarMontoCliente = document.getElementById("editarMontoCliente");

function mostrarToast(mensaje, tipo = "success") {
    toast.textContent = mensaje;
    toast.className = `toast show ${tipo}`;
    setTimeout(() => { toast.className = "toast"; }, 2500);
}

/* === REEMPLAZA ESTA FUNCIÓN === */
function crearBadgeEstado(estado) {
    // Si el estado es null o undefined, le asignamos "Inactivo" por defecto
    const valorEstado = estado ? estado.toString() : "Inactivo";
    
    let clase = "inactivo"; 
    if (valorEstado.toLowerCase() === "activo") clase = "activo";
    if (valorEstado.toLowerCase() === "sin prestamo") clase = "pendiente";

    return `<span class="estado ${clase}">${valorEstado.toUpperCase()}</span>`;
}

function actualizarContador(mostrados, total) {
    const hasta = Math.min((paginaActual + 1) * PAGE_SIZE, total);
    contadorClientes.textContent = `Mostrando ${hasta} de ${total} clientes`;
}

function abrirModal(modal) { modal.classList.add("active"); }
function cerrarModal(modal) { modal.classList.remove("active"); }


function crearFilaCliente(cliente) {
    const fila = document.createElement("div");
    fila.className = "fila-cliente";

    const esMobile = window.innerWidth <= 768;

    if (esMobile) {
        fila.innerHTML = `
            <span class="nombre">
                ${cliente.nombre} ${cliente.apellido}
                ${crearBadgeEstado(cliente.estado)}
            </span>
            <span data-label="DNI">${cliente.dni || "-"}</span>
            <span data-label="Teléfono">${cliente.telefono || "-"}</span>
            <span data-label="Ocupación">${cliente.ocupacion || "-"}</span>
            <span class="acciones">
                <button class="accion-editar" title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" width="16"><path d="M12 20H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.5 3.5A2.12 2.12 0 1 1 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
                    Editar
                </button>
                <button class="accion-eliminar" title="Eliminar">
                    <svg viewBox="0 0 24 24" fill="none" width="16"><path d="M3 6H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 6V4A1 1 0 0 1 9 3H15A1 1 0 0 1 16 4V6" stroke="currentColor" stroke-width="1.8"/><path d="M19 6L18 20A1 1 0 0 1 17 21H7A1 1 0 0 1 6 20L5 6" stroke="currentColor" stroke-width="1.8"/></svg>
                    Eliminar
                </button>
            </span>
        `;
    } else {
        fila.innerHTML = `
            <span class="nombre">${cliente.nombre}</span>
            <span>${cliente.apellido}</span>
            <span>${cliente.dni || "-"}</span>
            <span>${cliente.telefono || "-"}</span>
            <span>${cliente.ocupacion || "-"}</span>
            <span>${crearBadgeEstado(cliente.estado)}</span>
            <span class="acciones">
                <button class="accion-editar" title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" width="20"><path d="M12 20H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.5 3.5A2.12 2.12 0 1 1 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
                </button>
                <button class="accion-eliminar" title="Eliminar">
                    <svg viewBox="0 0 24 24" fill="none" width="20"><path d="M3 6H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 6V4A1 1 0 0 1 9 3H15A1 1 0 0 1 16 4V6" stroke="currentColor" stroke-width="1.8"/><path d="M19 6L18 20A1 1 0 0 1 17 21H7A1 1 0 0 1 6 20L5 6" stroke="currentColor" stroke-width="1.8"/></svg>
                </button>
            </span>
        `;
    }

    // ── EVENTOS (sin cambios, funcionan igual en ambas versiones) ──

    fila.querySelector(".accion-editar").addEventListener("click", () => {
        clienteEnEdicion = cliente;
        editarNombreCliente.value = cliente.nombre || "";
        editarApellidoCliente.value = cliente.apellido || "";
        editarDniCliente.value = cliente.dni || "";
        editarTelefonoCliente.value = cliente.telefono || "";
        editarCiudadCliente.value = cliente.ciudad || "";
        editarBarrioCliente.value = cliente.barrio || "";
        editarCalleCliente.value = cliente.calle || "";
        editarNroCliente.value = cliente.nro_calle || "";
        editarOcupacionCliente.value = cliente.ocupacion || "";
        editarEstadoCliente.value = cliente.estado || "Activo";
        editarSenaCliente.value = cliente.sena || "";
        editarMontoCliente.value = cliente.monto_inicial || 0;
        abrirModal(modalEditarCliente);
    });

    fila.querySelector(".accion-eliminar").addEventListener("click", () => {
        clienteAEliminar = cliente;
        const previewContainer = document.getElementById("filaEliminarPreview");
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="grid-datos">
                    <div class="dato-item"><strong>Nombre</strong> <span>${cliente.nombre} ${cliente.apellido}</span></div>
                    <div class="dato-item"><strong>DNI</strong> <span>${cliente.dni || "N/A"}</span></div>
                    <div class="dato-item"><strong>Teléfono</strong> <span>${cliente.telefono || "N/A"}</span></div>
                    <div class="dato-item"><strong>Ocupación</strong> <span>${cliente.ocupacion || "N/A"}</span></div>
                    <div class="dato-item"><strong>Ciudad</strong> <span>${cliente.ciudad || "-"}</span></div>
                    <div class="dato-item"><strong>Monto</strong> <span>$${cliente.monto_inicial || "0"}</span></div>
                </div>
            `;
        }
        confirmarEliminarCliente.textContent = "Eliminar Registro";
        confirmarEliminarCliente.classList.remove("segunda-confirmacion");
        abrirModal(modalEliminarCliente);
    });

    return fila;
}
window.addEventListener("resize", () => cargarClientes());

async function cargarClientes() {
    let queryCount = supabaseClient.from("clientes").select("*", { count: "exact", head: true });
    let queryData = supabaseClient.from("clientes").select("*").order("id", { ascending: false })
        .range(paginaActual * PAGE_SIZE, paginaActual * PAGE_SIZE + PAGE_SIZE - 1);

    if (filtroActual.trim() !== "") {
        const filterStr = `nombre.ilike.%${filtroActual}%,apellido.ilike.%${filtroActual}%,dni.ilike.%${filtroActual}%`;
        queryCount = queryCount.or(filterStr);
        queryData = queryData.or(filterStr);
    }

    const [{ count, error: errorCount }, { data, error: errorData }] = await Promise.all([queryCount, queryData]);

    if (errorCount || errorData) {
        mostrarToast("Error al cargar datos", "error");
        return;
    }

    totalClientes = count || 0;
    listaClientes.innerHTML = "";
    (data || []).forEach(cliente => listaClientes.appendChild(crearFilaCliente(cliente)));

    actualizarContador((data || []).length, totalClientes);
    btnAnterior.disabled = paginaActual === 0;
    btnSiguiente.disabled = (paginaActual + 1) * PAGE_SIZE >= totalClientes;
}

// EVENTOS FORMULARIOS
formNuevoCliente.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nuevoCliente = {
        nombre: nuevoNombreCliente.value.trim(),
        apellido: nuevoApellidoCliente.value.trim(),
        dni: nuevoDniCliente.value.trim(),
        telefono: nuevoTelCliente.value.trim(),
        ciudad: nuevoCiudad.value.trim(),
        barrio: nuevoBarrio.value.trim(),
        calle: nuevoCalle.value.trim(),
        nro_calle: nuevoNro.value.trim(),
        ocupacion: nuevoOcupacionCliente.value.trim(),
        estado: nuevoEstadoCliente.value.trim(),
        // NUEVOS CAMPOS
        sena: nuevoSenaCliente.value.trim(),
        monto_inicial: parseFloat(nuevoMontoCliente.value) || 0
    };

    const { error } = await supabaseClient.from("clientes").insert(nuevoCliente);

    if (error) {
        console.error(error);
        mostrarToast("Error al guardar: " + error.message, "error");
    } else {
        cerrarModal(modalNuevoCliente);
        formNuevoCliente.reset();
        paginaActual = 0;
        await cargarClientes();
        mostrarToast("Cliente registrado con éxito");
    }
});

formEditarCliente.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!clienteEnEdicion) return;

    const datosActualizados = {
        nombre: editarNombreCliente.value.trim(),
        apellido: editarApellidoCliente.value.trim(),
        dni: editarDniCliente.value.trim(),
        telefono: editarTelefonoCliente.value.trim(),

        ciudad: editarCiudadCliente.value.trim(),
        barrio: editarBarrioCliente.value.trim(),
        calle: editarCalleCliente.value.trim(),
        nro_calle: editarNroCliente.value.trim(),

        ocupacion: editarOcupacionCliente.value.trim(),

        // NUEVOS
        sena: editarSenaCliente.value.trim(),
        monto_inicial: parseFloat(editarMontoCliente.value) || 0,

        estado: editarEstadoCliente.value
    };

    const { error } = await supabaseClient
        .from("clientes")
        .update(datosActualizados)
        .eq("id", clienteEnEdicion.id);

    if (error) {
        console.error(error);
        mostrarToast("Error al actualizar", "error");
    } else {
        cerrarModal(modalEditarCliente);
        await cargarClientes();
        mostrarToast("Cambios guardados");
    }
});

/* =========================================
   LÓGICA DE DOBLE CONFIRMACIÓN PARA ELIMINAR
   ========================================= */
confirmarEliminarCliente.onclick = async () => {
    if (!clienteAEliminar) return;

    // PASO 1: Primera vez que hace clic
    if (!confirmarEliminarCliente.classList.contains("segunda-confirmacion")) {
        
        // Cambiamos el aspecto del botón
        confirmarEliminarCliente.textContent = "⚠️ ¿ESTÁS SEGURO? CLIC DE NUEVO";
        confirmarEliminarCliente.style.backgroundColor = "#7f1d1d"; // Rojo oscuro
        confirmarEliminarCliente.classList.add("segunda-confirmacion");
        
        mostrarToast("Confirme una vez más para eliminar", "error");
        return; // Detenemos la ejecución aquí (No elimina todavía)
    }

    // PASO 2: Si ya tiene la clase, es el segundo clic -> ELIMINAR
    try {
        const { error } = await supabaseClient
            .from("clientes")
            .delete()
            .eq("id", clienteAEliminar.id);

        if (error) {
            // Si da el error 23503 que vimos antes
            if (error.code === "23503") {
                mostrarToast("No se puede eliminar: tiene préstamos activos", "error");
            } else {
                mostrarToast("Error al eliminar", "error");
            }
            console.error(error);
        } else {
            cerrarModal(modalEliminarCliente);
            await cargarClientes();
            mostrarToast("Cliente eliminado permanentemente");
        }
    } catch (err) {
        console.error("Error inesperado:", err);
    } finally {
        // Siempre reseteamos el botón al terminar
        reseteatBotonEliminar();
    }
};

// Función para devolver el botón a su estado normal
function reseteatBotonEliminar() {
    confirmarEliminarCliente.textContent = "Eliminar";
    confirmarEliminarCliente.style.backgroundColor = ""; // Vuelve al CSS original
    confirmarEliminarCliente.classList.remove("segunda-confirmacion");
}

// BUSCADOR Y PAGINACIÓN
buscadorClientes.addEventListener("input", () => {
    filtroActual = buscadorClientes.value.trim();
    paginaActual = 0;
    cargarClientes();
});

btnAnterior.addEventListener("click", () => { if (paginaActual > 0) { paginaActual--; cargarClientes(); } });
btnSiguiente.addEventListener("click", () => { if ((paginaActual+1) * PAGE_SIZE < totalClientes) { paginaActual++; cargarClientes(); } });

// CONFIGURACIÓN DE MODALES (Cerrar)
abrirModalNuevo.addEventListener("click", () => abrirModal(modalNuevoCliente));
[cerrarNuevoCliente, cancelarNuevoCliente].forEach(b => b.addEventListener("click", () => cerrarModal(modalNuevoCliente)));
[cerrarEditarCliente, cancelarEditarCliente].forEach(b => b.addEventListener("click", () => cerrarModal(modalEditarCliente)));
[cerrarEliminarCliente, cancelarEliminarCliente].forEach(b => b.addEventListener("click", () => cerrarModal(modalEliminarCliente)));
// Busca donde tienes los eventos de cerrar el modal eliminar
[cerrarEliminarCliente, cancelarEliminarCliente].forEach(b => {
    b.addEventListener("click", () => {
        cerrarModal(modalEliminarCliente);
        reseteatBotonEliminar(); // <--- AGREGA ESTO AQUÍ
    });
});

window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) cerrarModal(e.target);
});

document.addEventListener("DOMContentLoaded", () => {
    cargarUsuarioLogueado();
    cargarClientes();
});

// ====== HAMBURGUESA / SIDEBAR MOBILE ======
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("active");
        sidebarOverlay.classList.toggle("active");
    });

    sidebarOverlay.addEventListener("click", () => {
        sidebar.classList.remove("active");
        sidebarOverlay.classList.remove("active");
    });
}