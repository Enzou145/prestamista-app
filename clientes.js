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
let estadoFiltroActual = "todos";

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

    function crearBadgeEstado(estado) {
    // Tomamos el valor de la BD o por defecto sin_prestamo
    const valor = estado ? estado.toString().toLowerCase() : "sin_prestamo";
    
    // El texto que verá el usuario (ej: "AL DIA")
    const textoMostrar = valor.replace("_", " ").toUpperCase();
    
    // La clase CSS será igual al valor (al_dia, atrasado, etc.)
    return `<span class="estado ${valor}">${textoMostrar}</span>`;
}


function actualizarPaginacion() {
    // 1. Detectar el tamaño de página (algunos usan PAGE_SIZE, otros clientesPorPagina)
    const limit = (typeof PAGE_SIZE !== 'undefined') ? PAGE_SIZE : (typeof clientesPorPagina !== 'undefined' ? clientesPorPagina : 7);
    
    // 2. Calcular total de páginas
    const totalPaginas = Math.ceil(totalClientes / limit) || 1;
    
    // 3. Actualizar el texto "1 / 3"
    const infoPagina = document.getElementById("infoPagina");
    if (infoPagina) {
        infoPagina.textContent = `${paginaActual} / ${totalPaginas}`;
    }

    // 4. Actualizar el texto "Mostrando X-Y de Z"
    const contador = document.getElementById("contadorClientes");
    if (contador) {
        const inicio = totalClientes === 0 ? 0 : ((paginaActual - 1) * limit) + 1;
        const fin = Math.min(paginaActual * limit, totalClientes);
        
        if (totalClientes === 0) {
            contador.textContent = "Mostrando 0 de 0 clientes";
        } else {
            contador.textContent = `Mostrando ${inicio}-${fin} de ${totalClientes} clientes`;
        }
    }

    // 5. Habilitar/Deshabilitar botones
    const btnAnt = document.getElementById("btnAnterior");
    const btnSig = document.getElementById("btnSiguiente");
    if (btnAnt) btnAnt.disabled = paginaActual === 1;
    if (btnSig) btnSig.disabled = paginaActual >= totalPaginas;


}

function abrirModal(modal) {
    if (!modal) return;
    modal.classList.add("active");
    document.body.classList.add("modal-open");
}

function cerrarModal(modal) {
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
}

function crearFilaCliente(cliente) {

    const fila = document.createElement("div");

    // Normalizamos el estado para usarlo como clase (ej: "al_dia", "atrasado")
    const estadoClase = cliente.estado ? cliente.estado.toString().toLowerCase() : "sin_prestamo";
        
    // Agregamos la clase base y la clase de borde específica
    fila.className = `fila-cliente border-status-${estadoClase}`;
    
    const esMobile = window.innerWidth <= 768;

    if (esMobile) {
        const direccion = [cliente.ciudad, cliente.barrio, cliente.calle, cliente.nro_calle].filter(Boolean).join(', ') || "-";

        fila.innerHTML = `
            <div class="card-header-mobile">
                <div class="card-avatar">
                    <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="card-info-principal">
                    <span class="card-nombre-mobile">${cliente.nombre} ${cliente.apellido}</span>
                </div>
                <div class="card-header-right">
                    ${crearBadgeEstado(cliente.estado)}
                    <div class="card-chevron">
                        <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                </div>
            </div>
            <div class="detalle-colapsable">
                <!-- ... resto del código igual ... -->
                <div class="detalle-inner">
                    <div class="detalle-grid">
                        <div class="detalle-item">
                            <span class="detalle-label"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>DNI</span>
                            <span class="detalle-valor">${cliente.dni || "-"}</span>
                        </div>
                        <div class="detalle-item">
                            <span class="detalle-label"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Teléfono</span>
                            <span class="detalle-valor">${cliente.telefono || "-"}</span>
                        </div>
                        <div class="detalle-item full-width">
                            <span class="detalle-label"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Dirección</span>
                            <span class="detalle-valor">${direccion}</span>
                        </div>
                        <div class="detalle-item full-width">
                            <span class="detalle-label"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Ocupación</span>
                            <span class="detalle-valor">${cliente.ocupacion || "-"}</span>
                        </div>
                    </div>
                    <div class="acciones-expandidas">
                        <button class="accion-editar">Editar</button>
                        <button class="accion-eliminar">Eliminar</button>
                    </div>
                </div>
            </div>
        `;
        
        fila.querySelector('.card-header-mobile').addEventListener('click', () => {
            // 1. Verificamos si la fila actual ya está expandida
            const estaExpandido = fila.classList.contains('expandido');

            // 2. Buscamos cualquier otra fila que tenga la clase 'expandido' y se la quitamos
            document.querySelectorAll('.fila-cliente.expandido').forEach(f => {
                f.classList.remove('expandido');
            });

            // 3. Si la fila que tocamos NO estaba abierta, la abrimos
            // Si ya estaba abierta, se quedará cerrada por el paso anterior
            if (!estaExpandido) {
                fila.classList.add('expandido');
            }
        });

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

    // Eventos editar/eliminar (funcionan para ambas versiones)
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
        //editarEstadoCliente.value = cliente.estado || "Activo";
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

let lastWidthClientes = window.innerWidth;

window.addEventListener("resize", () => {
    // Si el ancho no cambió (ej: solo cambió el alto por el scroll), no hagas nada
    if (window.innerWidth === lastWidthClientes) return;
    
    // Si el ancho realmente cambió, actualizamos y renderizamos
    lastWidthClientes = window.innerWidth;
    paginaActual = 1; 
    renderClientes(); 
});

async function cargarClientes() {
    // 1. Consultas a Supabase
    let queryCount = supabaseClient.from("clientes").select("*", { count: "exact", head: true });
    let queryData = supabaseClient.from("clientes").select("*").order("id", { ascending: false })
        .range(paginaActual * PAGE_SIZE, (paginaActual * PAGE_SIZE) + PAGE_SIZE - 1);

    if (filtroActual.trim() !== "") {
        const filterStr = `nombre.ilike.%${filtroActual}%,apellido.ilike.%${filtroActual}%,dni.ilike.%${filtroActual}%`;
        queryCount = queryCount.or(filterStr);
        queryData = queryData.or(filterStr);
    }

    // --- AGREGA ESTO AQUÍ ---
    if (typeof estadoFiltroActual !== 'undefined' && estadoFiltroActual !== "todos") {
        queryCount = queryCount.eq("estado", estadoFiltroActual);
        queryData = queryData.eq("estado", estadoFiltroActual);
    }
    // ------------------------

    const [{ count, error: errorCount }, { data, error: errorData }] = await Promise.all([queryCount, queryData]);

    if (errorCount || errorData) {
        mostrarToast("Error al cargar datos", "error");
        return;
    }

    totalClientes = count || 0;
    const clientesCargados = data || [];
    
    // 2. Renderizar la lista
    listaClientes.innerHTML = "";
    if (clientesCargados.length > 0) {
        clientesCargados.forEach(cliente => {
            listaClientes.appendChild(crearFilaCliente(cliente));
        });
    } else {
        listaClientes.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px;">No hay resultados.</p>`;
    }

    // 3. ACTUALIZAR INTERFAZ
    actualizarInterfazPaginacion(clientesCargados.length);
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
        estado: "sin_prestamo",
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

        // ❌ NO TOCAR EL ESTADO DESDE CLIENTES
        // estado eliminado
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

/* =========================================
   BUSCADOR Y PAGINACIÓN (CORREGIDO)
   ========================================= */

// 1. Buscador (Resetea a la página 1)
buscadorClientes.addEventListener("input", () => {
    filtroActual = buscadorClientes.value.trim();
    paginaActual = 0;
    cargarClientes();
});

// 2. Función Unificada para actualizar la interfaz
function actualizarInterfazPaginacion(cantidadEnPagina) {
    const totalPaginas = Math.ceil(totalClientes / PAGE_SIZE) || 1;

    const infoPagina = document.getElementById("infoPagina");
    if (infoPagina) {
        infoPagina.textContent = `${paginaActual + 1} / ${totalPaginas}`;
    }

    if (contadorClientes) {
        if (totalClientes === 0) {
            contadorClientes.textContent = "Mostrando 0 de 0 clientes";
        } else {
            // 🔥 CLAVE: calcular acumulado
            const mostrados = Math.min((paginaActual + 1) * PAGE_SIZE, totalClientes);

            contadorClientes.textContent = `Mostrando ${mostrados} de ${totalClientes} clientes`;
        }
    }

    btnAnterior.disabled = (paginaActual === 0);
    btnSiguiente.disabled = (paginaActual + 1 >= totalPaginas);
}

// 3. Carga Inicial y Configuración de Botones
document.addEventListener("DOMContentLoaded", () => {
    cargarUsuarioLogueado();
    cargarClientes();

    // --- LÓGICA DE FILTROS ---
    
    // Botón principal de Filtros (Abre/Cierra el panel)
    const btnAbrirFiltros = document.getElementById('btn-abrir-filtros');
    if (btnAbrirFiltros) {
        btnAbrirFiltros.onclick = () => {
            const panel = document.getElementById('contenedor-filtros-pills');
            panel.classList.toggle('d-none-mobile');
        };
    }

    // Botones redondos (Pills)
    document.querySelectorAll('.pill-filter').forEach(boton => {
        boton.onclick = () => {
            // Estética: Quitamos active de todos y ponemos al actual
            document.querySelectorAll('.pill-filter').forEach(b => b.classList.remove('active'));
            boton.classList.add('active');

            // Lógica: Filtramos y reseteamos a la página 1
            estadoFiltroActual = boton.getAttribute('data-estado');
            paginaActual = 0; 
            cargarClientes();
        };
    });

    // --- CONFIGURACIÓN DE CLICS PAGINACIÓN ---
    btnAnterior.onclick = (e) => {
        e.preventDefault();
        if (paginaActual > 0) {
            paginaActual--;
            cargarClientes();
        }
    };

    btnSiguiente.onclick = (e) => {
        e.preventDefault();
        const totalPaginas = Math.ceil(totalClientes / PAGE_SIZE);
        if (paginaActual + 1 < totalPaginas) {
            paginaActual++;
            cargarClientes();
        }
    };
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

document.getElementById('sidebarCloseBtn')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
});