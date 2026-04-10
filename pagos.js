const SUPABASE_URL = "https://tztuukgwhsmtuhtinsod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vH8kgFdKWHCOIaQAhfZglQ_ybkjmNQO";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================
   VARIABLES
========================================== */
const inputBuscar = document.getElementById("inputBuscar");

const selectEstadoFiltro = document.getElementById("filtroEstado");
const inputMontoFiltro = document.getElementById("filtroMonto");

const totalPrestadoEl = document.getElementById("totalPrestado");
const prestamosActivosEl = document.getElementById("prestamosActivos");
const cuotasAtrasadasEl = document.getElementById("cuotasAtrasadas");

const frecuenciaPagoInput = document.getElementById("frecuenciaPago");
const intervaloPagoInput = document.getElementById("intervaloPago");

const listaPagos = document.getElementById("listaPagos");
const modalCobrar = document.getElementById("modalCobrar");
const formCobrarPago = document.getElementById("formCobrarPago");

const btnAnteriorPagos = document.getElementById("btnAnteriorPagos");
const btnSiguientePagos = document.getElementById("btnSiguientePagos");

// Modal crear préstamo
const nombreClientePrestamo = document.getElementById("nombreClientePrestamo");
const montoPrestadoInput = document.getElementById("montoPrestado");
const interesPrestadoInput = document.getElementById("interesPrestado");
const cuotasPrestadoInput = document.getElementById("cuotasPrestado");
const fechaInicioInput = document.getElementById("fechaInicio");
const fechaFinInput = document.getElementById("fechaFin");
const totalDevolverDisplay = document.getElementById("totalDevolverDisplay");
const valorCuotaDisplay = document.getElementById("valorCuotaDisplay");

// Modal cobrar cuotas
const modalCobrarCuota = document.getElementById("modalCobrarCuota");
const cerrarModalCuota = document.getElementById("cerrarModalCuota");

const infoClienteModal = document.getElementById("infoClienteModal");
const modalMonto = document.getElementById("modalMonto");
const modalTotal = document.getElementById("modalTotal");
const modalCuota = document.getElementById("modalCuota");
const modalProgreso = document.getElementById("modalProgreso");
const barraProgreso = document.getElementById("barraProgreso");

const inputCuotasPagar = document.getElementById("inputCuotasPagar");
const totalPagarDisplay = document.getElementById("totalPagarDisplay");

const btnConfirmarPago = document.getElementById("btnConfirmarPago");
const btnPagoTotal = document.getElementById("btnPagoTotal");

let clienteSeleccionado = null;
let prestamoActual = null;


// Modal Detalles (Nuevos elementos)
const modalDetallePrestamo = document.getElementById("modal-detalle-prestamo");
const listaCuotasDetalle = document.getElementById("lista-cuotas-detalle");

// PAGINACIÓN
let clientesGlobal = [];
let clientesFiltrados = [];
let paginaActual = 1;
function filasPorPagina() {
    return window.matchMedia("(max-width: 768px)").matches ? 4 : 7;
}

// --- FUNCIÓN DE NOTIFICACIÓN NATIVA ---
function dispararNotificacion(nombre, apellido) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("⚠️ Cuota Vencida", {
            body: `Se ha detectado un atraso en el préstamo de ${nombre} ${apellido}.`,
            icon: "build/avat.svg" // Puedes cambiar esto por tu logo icono
        });
    }
}

function obtenerEstadoCliente(cliente) {
    const prestamo = cliente.prestamos?.slice(-1)[0] || null;
    if (!prestamo) return "sin_prestamo"; 

    const pagadas = prestamo.cuotas_pagadas || 0;
    const total = prestamo.cuotas;

    if (pagadas >= total) return "finalizado";

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    let fecha = new Date(prestamo.fecha_inicio + "T00:00:00");
    const avance = (pagadas + 1) * (prestamo.intervalo_pago || 1);

    if (prestamo.frecuencia_pago === "mes") {
        fecha.setMonth(fecha.getMonth() + avance);
    } else if (prestamo.frecuencia_pago === "semana") {
        fecha.setDate(fecha.getDate() + (7 * avance));
    } else {
        fecha.setDate(fecha.getDate() + avance);
    }
    fecha.setHours(0,0,0,0);

    return fecha < hoy ? "atrasado" : "al_dia"; 
}


document.getElementById("btnFiltroMobile")?.addEventListener("click", () => {
  document.querySelector(".filtros-container").classList.toggle("visible");
});

/* ==========================================
   INIT
========================================== */
document.addEventListener("DOMContentLoaded", async () => {
    // PEDIR PERMISO DE NOTIFICACIÓN
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    await actualizarEstadosAutomaticos(); 

    cargarListaParaCobrar();   
    configurarCalculos();      

    if (typeof cargarUsuarioLogueado === "function") cargarUsuarioLogueado(); 
});

inputBuscar.addEventListener("input", () => {
    const texto = inputBuscar.value.toLowerCase();

    clientesFiltrados = clientesGlobal.filter(cliente =>
        cliente.nombre.toLowerCase().includes(texto)
    );

    paginaActual = 1;
    renderPagos();
});
/* ==========================================
   CARGAR CLIENTES
========================================== */
async function cargarListaParaCobrar() {
    const { data, error } = await supabaseClient
        .from("clientes")
        .select("*, prestamos(*)")
        .order("id", { ascending: false });

    if (error) return console.error(error);

    clientesGlobal = data;
    clientesFiltrados = data;

    actualizarResumen();
    paginaActual = 1;
    renderPagos();

    const idParaAbrir = localStorage.getItem("abrir_prestamo_id");
    
    if (idParaAbrir) {
        const clienteEncontrado = clientesGlobal.find(c => c.id == idParaAbrir);
        if (clienteEncontrado) {
            prepararCobro(clienteEncontrado);
        }
        localStorage.removeItem("abrir_prestamo_id");
    }
}

/*-------------------------------------*/
function calcularEstadoPrestamo(prestamo) {
    const pagadas = prestamo.cuotas_pagadas || 0;
    const total = prestamo.cuotas;

    if (pagadas >= total) return "finalizado";

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let fechaVencimiento = new Date(prestamo.fecha_inicio + "T00:00:00");
    const frecuencia = prestamo.frecuencia_pago;
    const intervalo = prestamo.intervalo_pago || 1;

    const avance = (pagadas + 1) * intervalo;

    if (frecuencia === "mes") {
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + avance);
    } else if (frecuencia === "semana") {
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (7 * avance));
    } else { 
        fechaVencimiento.setDate(fechaVencimiento.getDate() + avance);
    }

    fechaVencimiento.setHours(0, 0, 0, 0);

    return fechaVencimiento < hoy ? "atrasado" : "al_dia";
}

async function actualizarEstadosAutomaticos() {
    // Traemos también la info del cliente para la notificación
    const { data: prestamos, error } = await supabaseClient
        .from("prestamos")
        .select("*, clientes(nombre, apellido)");

    if (error) {
        console.error("Error cargando préstamos:", error);
        return;
    }

    for (const prestamo of prestamos) {
        const nuevoEstado = calcularEstadoPrestamo(prestamo);

        if (prestamo.estado_pago !== nuevoEstado) {
            
            // 🔥 SI EL NUEVO ESTADO ES ATRASADO, AVISAR AL CELULAR
            if (nuevoEstado === "atrasado") {
                const nombre = prestamo.clientes?.nombre || "Un cliente";
                const apellido = prestamo.clientes?.apellido || "";
                dispararNotificacion(nombre, apellido);
            }

            // 1. ACTUALIZA PRÉSTAMO
            await supabaseClient
                .from("prestamos")
                .update({ estado_pago: nuevoEstado })
                .eq("id", prestamo.id);

            // 2. ACTUALIZA CLIENTE
            await supabaseClient
                .from("clientes")
                .update({ estado: nuevoEstado })
                .eq("id", prestamo.cliente_id);
        }
    }
}

/*-------------------------------------*/


function actualizarResumen() {
    let totalPrestado = 0;
    let activos = 0;
    let atrasados = 0;

    clientesGlobal.forEach(cliente => {
        const prestamo = cliente.prestamos?.slice(-1)[0] || null;
        if (!prestamo) return;

        const estado = obtenerEstadoCliente(cliente);

        const montoPrestado = prestamo.monto_prestado || 0;
        const pagadas = prestamo.cuotas_pagadas || 0;
        const totalCuotas = prestamo.cuotas || 0;

        const porcentajePagado = totalCuotas > 0 ? (pagadas / totalCuotas) : 0;
        const capitalRecuperado = montoPrestado * porcentajePagado;
        const capitalPendiente = montoPrestado - capitalRecuperado;

        if (estado !== "finalizado") {
            totalPrestado += Math.max(capitalPendiente, 0);
        }

        if (estado === "al_dia") activos++;
        if (estado === "atrasado") atrasados++;
    });

    animarNumero(totalPrestadoEl, totalPrestado, true);
    animarNumero(prestamosActivosEl, activos);
    animarNumero(cuotasAtrasadasEl, atrasados);
}

function animarNumero(elemento, valorFinal, esMoneda = false) {
    let inicio = 0;
    const duracion = 600; 
    const incremento = valorFinal / (duracion / 16);

    const contador = setInterval(() => {
        inicio += incremento;

        if (inicio >= valorFinal) {
            inicio = valorFinal;
            clearInterval(contador);
        }

        if (esMoneda) {
            elemento.textContent = `$ ${Math.floor(inicio).toLocaleString('es-AR')}`;
        } else {
            elemento.textContent = Math.floor(inicio);
        }

    }, 16);
}

/* ==========================================
   RENDER
========================================== */
function renderPagos() {
    
    listaPagos.innerHTML = "";

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    clientesGlobal.sort((a, b) => {
        const prestamoA = a.prestamos?.slice(-1)[0] || null;
        const prestamoB = b.prestamos?.slice(-1)[0] || null;

        const estadoA = prestamoA
            ? (prestamoA.cuotas_pagadas >= prestamoA.cuotas ? 2 : 1)
            : 0;

        const estadoB = prestamoB
            ? (prestamoB.cuotas_pagadas >= prestamoB.cuotas ? 2 : 1)
            : 0;

        return estadoA - estadoB;
    });

    const inicio = (paginaActual - 1) * filasPorPagina();
    const clientesPagina = clientesFiltrados.slice(inicio, inicio + filasPorPagina());
    const titulo = document.querySelector(".encabezado .info-izq h1");
    if (titulo) {
    const mostrados = Math.min(paginaActual * filasPorPagina(), clientesFiltrados.length);
    titulo.textContent = `Mostrando ${mostrados} de ${clientesFiltrados.length} préstamos`;
    }
    clientesPagina.forEach(cliente => {
        const prestamo = cliente.prestamos?.slice(-1)[0] || null;

        let cuotasTexto = "-";
        let estadoTexto = "Sin Prestamo";
        let estadoClase = "sinplan";
        let fechaVenceTexto = "-";

        if (prestamo) {
            const pagadas = prestamo.cuotas_pagadas || 0;
            const total = prestamo.cuotas;

            cuotasTexto = `(${pagadas}/${total})`;

            if (pagadas >= total) {
                estadoTexto = "Finalizado";
                estadoClase = "pagado";
            } else {
                let fecha = new Date(prestamo.fecha_inicio + "T00:00:00");
                const frecuencia = prestamo.frecuencia_pago;
                const intervalo = prestamo.intervalo_pago || 1;
                const avance = (pagadas + 1)* intervalo;

                if (frecuencia === "mes") fecha.setMonth(fecha.getMonth() + avance);
                else if (frecuencia === "semana") fecha.setDate(fecha.getDate() + (7 * avance));
                else if (frecuencia === "dia") fecha.setDate(fecha.getDate() + avance);

                fecha.setHours(0,0,0,0);
                fechaVenceTexto = fecha.toLocaleDateString('es-AR');
                const diffDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));

                if (diffDias < 0) {
                    estadoTexto = "Atrasado";
                    estadoClase = "atrasado";
                } else {
                    estadoTexto = "Al Dia";
                    estadoClase = "activo";
                }
            }
        }

        const item = document.createElement("div");
        item.className = "item-cliente";

        if (estadoClase === "pagado") item.classList.add("estado-finalizado");
        else if (estadoClase === "activo") item.classList.add("estado-al-dia");
        else if (estadoClase === "atrasado") item.classList.add("estado-atrasado");
        else if (estadoClase === "sinplan") item.classList.add("estado-sin_prestamo");

item.innerHTML = `
  <span class="nombre">${cliente.nombre}</span>
  <span>${cliente.apellido}</span>
  <span>${prestamo ? '$ ' + prestamo.monto_prestado.toLocaleString('es-AR') : '-'}</span>
  <span>${prestamo ? '$ ' + prestamo.total_devolver.toLocaleString('es-AR') : '-'}</span>
  <span>${cuotasTexto}</span>
  <span class="vence-desktop"> ${fechaVenceTexto}</span>  
  <span><span class="estado ${estadoClase}">${estadoTexto}</span></span>
  <span class="acciones desktop-btn"></span>

  <div class="card-header">
    <div class="card-nombre">
      <div class="avatar-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16" fill="#94a3b8"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z"/></svg>
      </div>
      <strong>${cliente.nombre} ${cliente.apellido}</strong>
    </div>
    <span class="estado ${estadoClase}">${estadoTexto}</span>
  </div>

  <div class="card-montos">
    <div class="monto-item">
      <small>PRESTADO</small>
      <strong>${prestamo ? '$ ' + prestamo.monto_prestado.toLocaleString('es-AR') : '-'}</strong>
    </div>
    <div class="monto-item">
      <small>A DEVOLVER</small>
      <strong>${prestamo ? '$ ' + prestamo.total_devolver.toLocaleString('es-AR') : '-'}</strong>
    </div>
  </div>

  <div class="card-cuotas">
    <div class="cuotas-fila">
      <span class="cuotas-label">Cuotas</span>
      <span class="cuotas-num">${prestamo ? (prestamo.cuotas_pagadas || 0) + ' de ' + prestamo.cuotas : '-'}</span>
    </div>
    <div class="barra-cuotas-wrap">
      <div class="barra-cuotas-fill" style="width: ${prestamo && prestamo.cuotas > 0 ? (prestamo.cuotas_pagadas / prestamo.cuotas * 100) : 0}%"></div>
    </div>
  </div>

  <div class="card-footer">
    <span class="vence-text">
       Vence: ${fechaVenceTexto}
    </span>
<button class="${prestamo && prestamo.cuotas_pagadas >= prestamo.cuotas ? 'btn-ver-detalle mobile-btn' : 'btn-cobrar mobile-btn'}">
  ${prestamo 
    ? (prestamo.cuotas_pagadas >= prestamo.cuotas ? 'Ver detalle' : 'Cobrar') 
    : 'Crear préstamo'}
</button>
  </div>
`;

const desktopBtn = document.createElement("button");
const esFinalizado = prestamo && prestamo.cuotas_pagadas >= prestamo.cuotas;

desktopBtn.className = esFinalizado ? "btn-ver-detalle" : "btn-cobrar";
desktopBtn.innerHTML = !prestamo ? 'Crear préstamo' : (esFinalizado ? '👁 Ver detalle' : 'Cobrar');

desktopBtn.addEventListener("click", () => {
    if (!prestamo) { prepararCobro(cliente); return; }
    if (esFinalizado) { abrirModalDetalle(cliente, prestamo); return; }
    abrirModalCobro(cliente, prestamo);
});
item.querySelector(".desktop-btn").appendChild(desktopBtn);

item.querySelectorAll(".mobile-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        if (!prestamo) { prepararCobro(cliente); return; }
        if (prestamo.cuotas_pagadas >= prestamo.cuotas) { abrirModalDetalle(cliente, prestamo); return; }
        abrirModalCobro(cliente, prestamo);
    });
});
listaPagos.appendChild(item);
    });
    actualizarBotones();
}

/* ==========================================
   MODAL COBRAR CUOTAS
========================================== */
function abrirModalCobro(cliente, prestamo) {
    prestamoActual = prestamo;
    infoClienteModal.textContent = `${cliente.nombre} ${cliente.apellido}`;
    modalMonto.textContent = `$ ${prestamo.monto_prestado.toLocaleString('es-AR')}`;
    modalTotal.textContent = `$ ${prestamo.total_devolver.toLocaleString('es-AR')}`;
    modalCuota.textContent = `$ ${prestamo.valor_cuota.toLocaleString('es-AR')}`;

    const pagadas = prestamo.cuotas_pagadas || 0;
    const total = prestamo.cuotas;
    modalProgreso.textContent = `${pagadas}/${total}`;
    barraProgreso.style.width = ((pagadas / total) * 100) + "%";
    inputCuotasPagar.value = 1;
    inputCuotasPagar.max = total - pagadas;
    actualizarTotalPagar();
    modalCobrarCuota.classList.remove("hidden");
}

document.getElementById('btnMenos')?.addEventListener('click', () => {
  const input = document.getElementById('inputCuotasPagar');
  if (parseInt(input.value) > 1) {
    input.value = parseInt(input.value) - 1;
    input.dispatchEvent(new Event('input'));
  }
});

document.getElementById('btnMas')?.addEventListener('click', () => {
  const input = document.getElementById('inputCuotasPagar');
  const max = parseInt(input.max) || Infinity;
  if (parseInt(input.value) < max) {
    input.value = parseInt(input.value) + 1;
    input.dispatchEvent(new Event('input'));
  }
});

function actualizarTotalPagar() {
    if (!prestamoActual) return;
    const cuotas = parseInt(inputCuotasPagar.value) || 0;
    const total = cuotas * prestamoActual.valor_cuota;
    totalPagarDisplay.value = `$ ${total.toLocaleString('es-AR')}`;
}

inputCuotasPagar.addEventListener("input", actualizarTotalPagar);

btnPagoTotal?.addEventListener("click", () => {
    const restantes = prestamoActual.cuotas - (prestamoActual.cuotas_pagadas || 0);
    inputCuotasPagar.value = restantes;
    actualizarTotalPagar();
});

btnConfirmarPago?.addEventListener("click", async () => {
    const pagar = parseInt(inputCuotasPagar.value);
    const nuevasCuotasPagadas = (prestamoActual.cuotas_pagadas || 0) + pagar;
    const prestamoSimulado = { ...prestamoActual, cuotas_pagadas: nuevasCuotasPagadas };
    const nuevoEstado = calcularEstadoPrestamo(prestamoSimulado);

    await supabaseClient.from("prestamos").update({ cuotas_pagadas: nuevasCuotasPagadas, estado_pago: nuevoEstado }).eq("id", prestamoActual.id);
    await supabaseClient.from("clientes").update({ estado: nuevoEstado }).eq("id", prestamoActual.cliente_id);

    alert("Pago realizado 💸");
    modalCobrarCuota.classList.add("hidden"); 
    await cargarListaParaCobrar();
});


/* ==========================================
   PAGINACIÓN
========================================== */
btnSiguientePagos?.addEventListener("click", () => {
    if (paginaActual * filasPorPagina() < clientesFiltrados.length) {
        paginaActual++;
        renderPagos();
    }
});
btnAnteriorPagos?.addEventListener("click", () => {
    if (paginaActual > 1) {
        paginaActual--;
        renderPagos();
    }
});
function actualizarBotones() {
    if (btnAnteriorPagos) btnAnteriorPagos.disabled = paginaActual === 1;
    if (btnSiguientePagos) btnSiguientePagos.disabled = paginaActual * filasPorPagina() >= clientesFiltrados.length;
}

/* ==========================================
   MODAL CREAR PRÉSTAMO
========================================== */
function prepararCobro(cliente) {
    clienteSeleccionado = cliente;
    nombreClientePrestamo.value = `${cliente.nombre} ${cliente.apellido}`;
    fechaInicioInput.value = new Date().toISOString().split('T')[0];
    modalCobrar.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function configurarCalculos() {
    const inputs = [montoPrestadoInput, interesPrestadoInput, cuotasPrestadoInput, fechaInicioInput, frecuenciaPagoInput, intervaloPagoInput];
    inputs.forEach(input => {
        input?.addEventListener("input", () => {
            const monto = parseFloat(montoPrestadoInput.value) || 0;
            const interes = parseFloat(interesPrestadoInput.value) || 0;
            const cuotas = parseInt(cuotasPrestadoInput.value) || 0;
            const frecuencia = frecuenciaPagoInput.value;
            const intervalo = parseInt(intervaloPagoInput.value) || 1;
            const total = monto + (monto * (interes / 100));
            const valorCuota = cuotas > 0 ? total / cuotas : 0;

            totalDevolverDisplay.textContent = `$ ${total.toLocaleString('es-AR')}`;
            valorCuotaDisplay.textContent = `$ ${valorCuota.toLocaleString('es-AR')}`;

            if (fechaInicioInput.value && cuotas > 0) {
                let fecha = new Date(fechaInicioInput.value + "T00:00:00");
                let totalPeriodos = cuotas * intervalo;
                if (frecuencia === "mes") fecha.setMonth(fecha.getMonth() + totalPeriodos);
                else if (frecuencia === "semana") fecha.setDate(fecha.getDate() + (7 * totalPeriodos));
                else if (frecuencia === "dia") fecha.setDate(fecha.getDate() + totalPeriodos);
                fechaFinInput.value = fecha.toISOString().split('T')[0];
            }
        });
    });
}

formCobrarPago?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!clienteSeleccionado) return alert("Seleccioná un cliente");

    const totalNum = parseFloat(totalDevolverDisplay.textContent.replace(/[$. ]/g, '') || 0);
    const cuotaNum = parseFloat(valorCuotaDisplay.textContent.replace(/[$. ]/g, '') || 0);

    const prestamoTemporal = {
        fecha_inicio: fechaInicioInput.value,
        cuotas: parseInt(cuotasPrestadoInput.value),
        cuotas_pagadas: 0,
        frecuencia_pago: frecuenciaPagoInput.value,
        intervalo_pago: parseInt(intervaloPagoInput.value)
    };
    const estadoInicial = calcularEstadoPrestamo(prestamoTemporal);

    await supabaseClient.from('prestamos').insert([{
            cliente_id: clienteSeleccionado.id,
            monto_prestado: parseFloat(montoPrestadoInput.value),
            interes_porcentaje: parseFloat(interesPrestadoInput.value),
            cuotas: prestamoTemporal.cuotas,
            frecuencia_pago: prestamoTemporal.frecuencia_pago,
            intervalo_pago: prestamoTemporal.intervalo_pago,
            fecha_inicio: prestamoTemporal.fecha_inicio,
            fecha_fin: fechaFinInput.value,
            total_devolver: totalNum,
            valor_cuota: cuotaNum,
            cuotas_pagadas: 0,
            estado_pago: estadoInicial
    }]);

    await supabaseClient.from("clientes").update({ estado: estadoInicial }).eq("id", clienteSeleccionado.id);
    modalCobrar.classList.add("hidden"); 
    formCobrarPago.reset();
    await cargarListaParaCobrar();
});

function aplicarFiltros() {
    const estado = selectEstadoFiltro.value;
    const montoMin = parseFloat(inputMontoFiltro.value) || 0;
    const textoBusqueda = inputBuscar.value.toLowerCase();

    clientesFiltrados = clientesGlobal.filter(cliente => {
        const coincideBusqueda = `${cliente.nombre} ${cliente.apellido}`.toLowerCase().includes(textoBusqueda);
        if (!coincideBusqueda) return false;
        const prestamo = cliente.prestamos?.slice(-1)[0] || null;
        if (montoMin > 0 && (!prestamo || prestamo.monto_prestado < montoMin)) return false;
        if (estado !== "todos" && obtenerEstadoCliente(cliente) !== estado) return false;
        return true;
    });
    paginaActual = 1;
    renderPagos();
}

inputBuscar.addEventListener("input", aplicarFiltros);
selectEstadoFiltro.addEventListener("change", aplicarFiltros);
inputMontoFiltro.addEventListener("input", aplicarFiltros);

document.getElementById("cerrarModalCobrar")?.addEventListener("click", () => {
    modalCobrar.classList.add("hidden");
    document.body.style.overflow = "auto";
});

document.getElementById("cancelarModalCobrar")?.addEventListener("click", () => {
    modalCobrar.classList.add("hidden");
    document.body.style.overflow = "auto";
});

cerrarModalCuota?.addEventListener("click", () => modalCobrarCuota.classList.add("hidden"));

// ====== HAMBURGUESA ======
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

hamburgerBtn?.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
});

const closeSidebar = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
};

sidebarCloseBtn?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// Stepper buttons
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.stepper-btn-p');
  if (!btn) return;
  const input = document.getElementById(btn.dataset.target);
  if (!input) return;
  const min = parseFloat(input.min) || 0;
  let val = parseFloat(input.value) || 0;
  input.value = (btn.dataset.action === 'plus') ? val + 1 : Math.max(min, val - 1);
  input.dispatchEvent(new Event('input'));
});

let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    paginaActual = 1;
    renderPagos();
});

function abrirModalDetalle(cliente, prestamo) {
    modalCobrarCuota.classList.add("hidden");
    modalCobrar.classList.add("hidden");
    document.getElementById("det-cliente-nombre").textContent = `${cliente.nombre} ${cliente.apellido}`;
    document.getElementById("det-monto-prestado").textContent = `$${prestamo.monto_prestado.toLocaleString('es-AR')}`;
    document.getElementById("det-total-devolver").textContent = `$${prestamo.total_devolver.toLocaleString('es-AR')}`;
    
    listaCuotasDetalle.innerHTML = "";
    let fechaAux = new Date(prestamo.fecha_inicio + "T00:00:00");
    const intervalo = prestamo.intervalo_pago || 1;
    for (let i = 1; i <= prestamo.cuotas; i++) {
        const isPagada = i <= (prestamo.cuotas_pagadas || 0);
        const div = document.createElement("div");
        div.className = "det-cuota-item";
        div.innerHTML = `<strong>Cuota ${i}</strong> - ${fechaAux.toLocaleDateString('es-AR')} - ${isPagada ? 'PAGADA' : 'PENDIENTE'}`;
        listaCuotasDetalle.appendChild(div);
        if (prestamo.frecuencia_pago === "mes") fechaAux.setMonth(fechaAux.getMonth() + intervalo);
        else if (prestamo.frecuencia_pago === "semana") fechaAux.setDate(fechaAux.getDate() + (7 * intervalo));
        else fechaAux.setDate(fechaAux.getDate() + intervalo);
    }
    modalDetallePrestamo.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

document.getElementById("close-detalle")?.addEventListener("click", () => {
    modalDetallePrestamo.classList.add("hidden");
    document.body.style.overflow = "auto";
});

document.getElementById("btn-cerrar-detalle")?.addEventListener("click", () => {
    modalDetallePrestamo.classList.add("hidden");
    document.body.style.overflow = "auto";
});

