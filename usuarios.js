const SUPABASE_URL = "https://tztuukgwhsmtuhtinsod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vH8kgFdKWHCOIaQAhfZglQ_ybkjmNQO";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tablaBodyUsuarios = document.getElementById("tablaBodyUsuarios");

const modalUsuario = document.getElementById("modalUsuario");
const abrirModalUsuario = document.getElementById("abrirModalUsuario");
const cerrarModalUsuario = document.getElementById("cerrarModalUsuario");
const cancelarModalUsuario = document.getElementById("cancelarModalUsuario");

const formNuevoUsuario = document.getElementById("formNuevoUsuario");
const tituloModalUsuario = document.getElementById("tituloModalUsuario");
const guardarUsuarioBtn = document.getElementById("guardarUsuarioBtn");

const nombreUsuario = document.getElementById("nombreUsuario");
const emailUsuario = document.getElementById("emailUsuario");
const passwordUsuario = document.getElementById("passwordUsuario");
const rolUsuario = document.getElementById("rolUsuario");
const estadoUsuario = document.getElementById("estadoUsuario");

const sidebarUserNombre = document.getElementById("sidebarUserName");
const sidebarUserEmail = document.getElementById("sidebarUserEmail");
const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");

const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");
const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

let usuarioEnEdicion = null;
let usuarioLogueado = null;

function abrirModal() {
  if (modalUsuario) {
    modalUsuario.classList.add("active");
  }
}

function cerrarModal() {
  if (modalUsuario) {
    modalUsuario.classList.remove("active");
  }
  limpiarFormulario();
}

function limpiarFormulario() {
  if (formNuevoUsuario) formNuevoUsuario.reset();

  if (rolUsuario) rolUsuario.value = "Empleado";
  if (estadoUsuario) estadoUsuario.value = "Activo";

  if (tituloModalUsuario) tituloModalUsuario.textContent = "Nuevo Usuario";
  if (guardarUsuarioBtn) {
    guardarUsuarioBtn.textContent = "Guardar Usuario";
    guardarUsuarioBtn.disabled = false;
  }

  if (passwordUsuario) {
    passwordUsuario.value = "";
    passwordUsuario.disabled = false;
    passwordUsuario.placeholder = "••••••••";
  }

  usuarioEnEdicion = null;
}

function normalizarRol(rol) {
  if (rol === "Admin") return "Administrador";
  return rol;
}

function mostrarRol(rol) {
  const rolNormalizado = normalizarRol(rol);

  if (rolNormalizado === "Administrador") {
    return `<span class="badge rol admin">Administrador</span>`;
  }

  return `<span class="badge rol empleado">Empleado</span>`;
}

function mostrarEstado(estado) {
  if (estado === "Activo") {
    return `<span class="badge estado activo">Activo</span>`;
  }

  return `<span class="badge estado inactivo">Inactivo</span>`;
}

function cargarFooterUsuario(usuario) {
  if (sidebarUserNombre) {
    sidebarUserNombre.textContent = usuario?.nombre || "Usuario";
  }

  if (sidebarUserEmail) {
    sidebarUserEmail.textContent = usuario?.email || "email@correo.com";
  }

  if (sidebarUserAvatar) {
    sidebarUserAvatar.src = "build/avat.svg";
    sidebarUserAvatar.alt = usuario?.nombre || "Usuario";
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

async function cerrarSesion() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert(error.message || "No se pudo cerrar sesión.");
    return;
  }

  window.location.href = "../login.html";
}

async function obtenerSesionValida() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || "No se pudo obtener la sesión.");
  }

  let session = sessionData?.session;

  if (!session?.access_token) {
    const { data: refreshedData, error: refreshError } = await supabaseClient.auth.refreshSession();

    if (refreshError) {
      throw new Error(refreshError.message || "No se pudo refrescar la sesión.");
    }

    session = refreshedData?.session;
  }

  if (!session?.access_token) {
    throw new Error("No hay sesión activa. Volvé a iniciar sesión.");
  }

  return session;
}

async function llamarEdgeFunction(nombreFuncion, payload) {
  const session = await obtenerSesionValida();

  const functionUrl = `${SUPABASE_URL}/functions/v1/${nombreFuncion}`;

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      ...payload,
      access_token: session.access_token
    })
  });

  let resultado = null;

  try {
    resultado = await response.json();
  } catch (parseError) {
    console.warn(`No se pudo parsear la respuesta JSON de ${nombreFuncion}:`, parseError);
  }

  console.log(`STATUS ${nombreFuncion}:`, response.status);
  console.log(`RESPUESTA ${nombreFuncion}:`, resultado);

  if (!response.ok) {
    throw new Error(
      resultado?.error ||
      resultado?.message ||
      `Error ${response.status} en ${nombreFuncion}`
    );
  }

  return resultado;
}

async function verificarAccesoYConfigurarUI() {
  const { data: authData, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !authData?.user) {
    alert("No hay sesión activa. Volvé a iniciar sesión.");
    window.location.href = "../login.html";
    return false;
  }

  const authUserId = authData.user.id;

  const { data: usuario, error } = await supabaseClient
    .from("usuarios")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo usuario logueado:", error);
    alert(error.message || "No se pudo verificar el usuario logueado.");
    return false;
  }

  if (!usuario) {
    alert("Tu usuario no existe en la tabla de usuarios.");
    await supabaseClient.auth.signOut();
    window.location.href = "../login.html";
    return false;
  }

  if (usuario.estado !== "Activo") {
    alert("Tu usuario está inactivo.");
    await supabaseClient.auth.signOut();
    window.location.href = "../login.html";
    return false;
  }

  if (usuario.rol !== "Administrador") {
    alert("No tenés permisos para entrar a Configuración.");
    window.location.href = "../index.html";
    return false;
  }

  usuarioLogueado = usuario;
  console.log("Usuario logueado:", usuarioLogueado);

  cargarFooterUsuario(usuarioLogueado);

  if (abrirModalUsuario) {
    abrirModalUsuario.style.display = "";
  }

  return true;
}

function crearFilaUsuario(usuario) {
  const fila = document.createElement("div");
  fila.className = "fila";

  fila.innerHTML = `
    <div class="nombre">${usuario.nombre}</div>
    <div class="email">${usuario.email}</div>
    <div>${mostrarRol(usuario.rol)}</div>
    <div>${mostrarEstado(usuario.estado)}</div>
    <div class="acciones">
      <button class="icon-btn editar" title="Editar">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 20H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M16.5 3.5A2.12 2.12 0 1 1 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="icon-btn eliminar" title="Eliminar">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M3 6H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M8 6V4A1 1 0 0 1 9 3H15A1 1 0 0 1 16 4V6" stroke="currentColor" stroke-width="1.8"/>
          <path d="M19 6L18 20A1 1 0 0 1 17 21H7A1 1 0 0 1 6 20L5 6" stroke="currentColor" stroke-width="1.8"/>
        </svg>
      </button>
    </div>
  `;

  const btnEditar = fila.querySelector(".editar");
  const btnEliminar = fila.querySelector(".eliminar");

  btnEditar.addEventListener("click", () => {
    usuarioEnEdicion = usuario.id;

    if (tituloModalUsuario) tituloModalUsuario.textContent = "Editar Usuario";
    if (guardarUsuarioBtn) guardarUsuarioBtn.textContent = "Guardar Cambios";

    if (nombreUsuario) nombreUsuario.value = usuario.nombre;
    if (emailUsuario) emailUsuario.value = usuario.email;
    if (rolUsuario) rolUsuario.value = normalizarRol(usuario.rol);
    if (estadoUsuario) estadoUsuario.value = usuario.estado;

    if (passwordUsuario) {
      passwordUsuario.value = "";
      passwordUsuario.disabled = true;
      passwordUsuario.placeholder = "No se modifica desde aquí";
    }

    abrirModal();
  });

  btnEliminar.addEventListener("click", async () => {
    const confirmar = confirm(`¿Seguro que querés eliminar a "${usuario.nombre}"?`);
    if (!confirmar) return;

    try {
      await llamarEdgeFunction("admin-delete-user", {
        id: usuario.id
      });

      alert("Usuario eliminado correctamente.");
      await cargarUsuarios();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      alert(error.message || "No se pudo eliminar el usuario.");
    }
  });

  return fila;
}

async function cargarUsuarios() {
  const { data, error } = await supabaseClient
    .from("usuarios")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error cargando usuarios:", error);
    alert(error.message || "No se pudieron cargar los usuarios.");
    return;
  }

  if (tablaBodyUsuarios) {
    tablaBodyUsuarios.innerHTML = "";

    (data || []).forEach((usuario) => {
      tablaBodyUsuarios.appendChild(crearFilaUsuario(usuario));
    });
  }
}

if (abrirModalUsuario) {
  abrirModalUsuario.addEventListener("click", () => {
    limpiarFormulario();
    abrirModal();
  });
}

if (cerrarModalUsuario) {
  cerrarModalUsuario.addEventListener("click", cerrarModal);
}

if (cancelarModalUsuario) {
  cancelarModalUsuario.addEventListener("click", cerrarModal);
}

if (modalUsuario) {
  modalUsuario.addEventListener("click", (e) => {
    if (e.target === modalUsuario) {
      cerrarModal();
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", abrirModalLogout);
}

if (cancelLogoutBtn) {
  cancelLogoutBtn.addEventListener("click", cerrarModalLogout);
}

if (confirmLogoutBtn) {
  confirmLogoutBtn.addEventListener("click", cerrarSesion);
}

if (logoutModal) {
  logoutModal.addEventListener("click", (e) => {
    if (e.target === logoutModal) {
      cerrarModalLogout();
    }
  });
}

if (formNuevoUsuario) {
  formNuevoUsuario.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (guardarUsuarioBtn) {
      guardarUsuarioBtn.disabled = true;
      guardarUsuarioBtn.textContent = "Guardando...";
    }

    try {
      const nombre = nombreUsuario?.value.trim();
      const email = emailUsuario?.value.trim();
      const password = passwordUsuario?.value.trim();
      const rol = normalizarRol(rolUsuario?.value);
      const estado = estadoUsuario?.value;

      if (!nombre || !email || !rol || !estado) {
        alert("Completá los campos obligatorios.");
        return;
      }

      if (usuarioEnEdicion) {
        await llamarEdgeFunction("admin-update-user", {
          id: usuarioEnEdicion,
          nombre,
          email,
          rol,
          estado
        });

        alert("Usuario actualizado correctamente.");
        cerrarModal();
        await cargarUsuarios();
        return;
      }

      if (!password) {
        alert("La contraseña es obligatoria para crear un usuario.");
        return;
      }

      await llamarEdgeFunction("admin-create-user", {
        nombre,
        email,
        password,
        rol,
        estado
      });

      alert("Usuario creado correctamente.");
      cerrarModal();
      await cargarUsuarios();
    } catch (error) {
      console.error("Error general al guardar usuario:", error);
      alert(error?.message || "Ocurrió un error inesperado al guardar el usuario.");
    } finally {
      if (guardarUsuarioBtn) {
        guardarUsuarioBtn.disabled = false;
        guardarUsuarioBtn.textContent = usuarioEnEdicion ? "Guardar Cambios" : "Guardar Usuario";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const accesoOk = await verificarAccesoYConfigurarUI();
  if (!accesoOk) return;

  await cargarUsuarios();
});