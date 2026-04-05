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

// PAGINACIÓN
let clientesGlobal = [];
let clientesFiltrados = [];
let paginaActual = 1;
function filasPorPagina() {
    return window.matchMedia("(max-width: 768px)").matches ? 4 : 7;
}



function obtenerEstadoCliente(cliente) {
    const prestamo = cliente.prestamos?.slice(-1)[0] || null;
    if (!prestamo) return "sin_prestamo"; // Cambiado: minúscula y guion bajo

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

    return fecha < hoy ? "atrasado" : "al_dia"; // Cambiado: minúsculas y guion bajo
}


document.getElementById("btnFiltroMobile")?.addEventListener("click", () => {
  document.querySelector(".filtros-container").classList.toggle("visible");
});

/* ==========================================
   INIT
========================================== */
document.addEventListener("DOMContentLoaded", async () => {
    await actualizarEstadosAutomaticos(); // 🔥 primero actualiza estados

    cargarListaParaCobrar();   // lo que ya tenías
    configurarCalculos();      // lo que ya tenías

    cargarUsuarioLogueado();   // opcional si lo usás en esta vista
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

    actualizarResumen(); // 🔥 ESTA LÍNEA NUEVA

    paginaActual = 1;
    renderPagos();


}

/*-------------------------------------*/
function calcularEstadoPrestamo(prestamo) {
    const pagadas = prestamo.cuotas_pagadas || 0;
    const total = prestamo.cuotas;

    // 1. Verificar si ya terminó
    if (pagadas >= total) return "finalizado";

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // 2. Fecha de inicio (asegurando formato ISO)
    let fechaVencimiento = new Date(prestamo.fecha_inicio + "T00:00:00");
    const frecuencia = prestamo.frecuencia_pago;
    const intervalo = prestamo.intervalo_pago || 1;

    // 3. Calculamos cuándo vence la PRÓXIMA cuota (la que aún no se pagó)
    // Si pagadas es 0, nos da la fecha de la 1er cuota.
    const avance = (pagadas + 1) * intervalo;

    if (frecuencia === "mes") {
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + avance);
    } else if (frecuencia === "semana") {
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (7 * avance));
    } else { // "dia"
        fechaVencimiento.setDate(fechaVencimiento.getDate() + avance);
    }

    fechaVencimiento.setHours(0, 0, 0, 0);

    // 4. Si la fecha de vencimiento de la cuota pendiente es anterior a HOY, está atrasado
    return fechaVencimiento < hoy ? "atrasado" : "al_dia";
}

async function actualizarEstadosAutomaticos() {
    const { data: prestamos, error } = await supabaseClient
        .from("prestamos")
        .select("*");

    if (error) {
        console.error("Error cargando préstamos:", error);
        return;
    }

    for (const prestamo of prestamos) {
        const nuevoEstado = calcularEstadoPrestamo(prestamo);

        if (prestamo.estado_pago !== nuevoEstado) {

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
        const totalDevolver = prestamo.total_devolver || 0;
        const pagadas = prestamo.cuotas_pagadas || 0;
        const totalCuotas = prestamo.cuotas || 0;

        // 🔥 calcular cuánto del capital ya recuperaste
        const porcentajePagado = totalCuotas > 0 ? (pagadas / totalCuotas) : 0;
        const capitalRecuperado = montoPrestado * porcentajePagado;

        const capitalPendiente = montoPrestado - capitalRecuperado;

        // ❌ NO contar finalizados
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
    const duracion = 600; // ms
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

    // 🔥 ORDENAR: sin plan (0) → activo (1) → finalizado (2)
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
        let estadoTexto = "Sin plan";
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

                // 🔥 CALCULAR VENCIMIENTO
                let fecha = new Date(prestamo.fecha_inicio + "T00:00:00");

                const frecuencia = prestamo.frecuencia_pago;
                const intervalo = prestamo.intervalo_pago || 1;

                const avance = (pagadas + 1)* intervalo;

                if (frecuencia === "mes") {
                    fecha.setMonth(fecha.getMonth() + avance);
                } else if (frecuencia === "semana") {
                    fecha.setDate(fecha.getDate() + (7 * avance));
                } else if (frecuencia === "dia") {
                    fecha.setDate(fecha.getDate() + avance);
                }

                fecha.setHours(0,0,0,0);

                fechaVenceTexto = fecha.toLocaleDateString('es-AR');

                // 🔥 DIFERENCIA DE DÍAS
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

        // 🔥 AGREGAR CLASE SEGÚN ESTADO
        if (estadoClase === "pagado") item.classList.add("estado-finalizado");
        else if (estadoClase === "activo") item.classList.add("estado-al-dia");
        else if (estadoClase === "atrasado") item.classList.add("estado-atrasado");

item.innerHTML = `
  <!-- DESKTOP: columnas del grid -->
  <span class="nombre">${cliente.nombre}</span>
  <span>${cliente.apellido}</span>
  <span>${prestamo ? '$ ' + prestamo.monto_prestado.toLocaleString('es-AR') : '-'}</span>
  <span>${prestamo ? '$ ' + prestamo.total_devolver.toLocaleString('es-AR') : '-'}</span>
  <span>${cuotasTexto}</span>
  <span class="vence-desktop"> ${fechaVenceTexto}
  </span>  <span><span class="estado ${estadoClase}">${estadoTexto}</span></span>
  <span class="acciones desktop-btn"></span>

  <!-- MOBILE: tarjeta -->
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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="13" height="13" fill="#64748b"><path d="M152 24c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40L64 64C28.7 64 0 92.7 0 128l0 16 0 48L0 448c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-256 0-48 0-16c0-35.3-28.7-64-64-64l-40 0 0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40L152 64l0-40zM48 192l352 0 0 256c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256z"/></svg>
      Vence: ${fechaVenceTexto}
    </span>
<button class="${prestamo && prestamo.cuotas_pagadas >= prestamo.cuotas ? 'btn-ver-detalle mobile-btn' : 'btn-cobrar mobile-btn'}">
  ${prestamo 
    ? (prestamo.cuotas_pagadas >= prestamo.cuotas 
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="14" height="14" fill="currentColor"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 92.9-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.8-35.7-46.1-87.7-92.9-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1-288 0zm144-64a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg> Ver detalle' 
      : 'Cobrar') 
    : 'Crear préstamo'}
</button>
  </div>
`;
// Botón desktop
const desktopBtn = document.createElement("button");
const esFinalizado = prestamo && prestamo.cuotas_pagadas >= prestamo.cuotas;

desktopBtn.className = esFinalizado ? "btn-ver-detalle" : "btn-cobrar";
desktopBtn.innerHTML = !prestamo 
    ? 'Crear préstamo' 
    : (esFinalizado ? '👁 Ver detalle' : 'Cobrar');

desktopBtn.addEventListener("click", () => {
    if (!prestamo) { prepararCobro(cliente); return; }
    if (esFinalizado) {
        abrirModalCobro(cliente, prestamo); // o tu función para ver detalles
        return;
    }
    abrirModalCobro(cliente, prestamo);
});

item.querySelector(".desktop-btn").appendChild(desktopBtn);

// Botón mobile (card-footer)
item.querySelectorAll(".mobile-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        if (!prestamo) { prepararCobro(cliente); return; }
        if (prestamo.cuotas_pagadas >= prestamo.cuotas) {
            abrirModalCobro(cliente, prestamo); // ver detalles en modo lectura
            return;
        }
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

    modalCobrarCuota.classList.add("active");
}

/* ==========================================
   CALCULAR TOTAL DINÁMICO
========================================== */
function actualizarTotalPagar() {
    if (!prestamoActual) return;

    const cuotas = parseInt(inputCuotasPagar.value) || 0;
    const total = cuotas * prestamoActual.valor_cuota;

    totalPagarDisplay.value = `$ ${total.toLocaleString('es-AR')}`;
}

inputCuotasPagar.addEventListener("input", actualizarTotalPagar);

/* ==========================================
   PAGAR TODO
========================================== */
btnPagoTotal.addEventListener("click", () => {
    const restantes = prestamoActual.cuotas - (prestamoActual.cuotas_pagadas || 0);
    inputCuotasPagar.value = restantes;
    actualizarTotalPagar();
});

/* ==========================================
   CONFIRMAR PAGO
========================================== */
btnConfirmarPago.addEventListener("click", async () => {
    const pagar = parseInt(inputCuotasPagar.value);
    const nuevasCuotasPagadas = (prestamoActual.cuotas_pagadas || 0) + pagar;

    // --- LÓGICA DE ESTADO REAL ---
    // Creamos un objeto temporal con las cuotas ya sumadas para calcular el estado
    const prestamoSimulado = { 
        ...prestamoActual, 
        cuotas_pagadas: nuevasCuotasPagadas 
    };
    
    // Calculamos si con este pago queda al día, sigue atrasado o finalizó
    const nuevoEstado = calcularEstadoPrestamo(prestamoSimulado);
    // ----------------------------

    // 1. ACTUALIZAR PRÉSTAMO
    const { error } = await supabaseClient
        .from("prestamos")
        .update({ 
            cuotas_pagadas: nuevasCuotasPagadas,
            estado_pago: nuevoEstado
        })
        .eq("id", prestamoActual.id);

    if (error) {
        console.error(error);
        return alert("Error al registrar pago");
    }

    // 2. ACTUALIZAR CLIENTE (Sincronizado)
    await supabaseClient
        .from("clientes")
        .update({ estado: nuevoEstado })
        .eq("id", prestamoActual.cliente_id);

    // 3. Feedback
    let mensaje = "Pago realizado 💸";
    if (nuevoEstado === "finalizado") mensaje = "¡Préstamo Finalizado! 🏆";
    if (nuevoEstado === "atrasado") mensaje = "Pago parcial recibido. El cliente sigue ATRASADO.";
    
    alert(mensaje);

    // 4. Cerrar modal y recargar
    modalCobrarCuota.classList.remove("active");
    await cargarListaParaCobrar();
});


/* ==========================================
   PAGINACIÓN
========================================== */
btnSiguientePagos.addEventListener("click", () => {
    if (paginaActual * filasPorPagina() < clientesFiltrados.length) {
        paginaActual++;
        renderPagos();
    }
});

btnAnteriorPagos.addEventListener("click", () => {
    if (paginaActual > 1) {
        paginaActual--;
        renderPagos();
    }
});

function actualizarBotones() {
    btnAnteriorPagos.disabled = paginaActual === 1;
    btnSiguientePagos.disabled = paginaActual * filasPorPagina() >= clientesFiltrados.length;
}

/* ==========================================
   MODAL CREAR PRÉSTAMO
========================================== */
function prepararCobro(cliente) {
    clienteSeleccionado = cliente;

    nombreClientePrestamo.value = `${cliente.nombre} ${cliente.apellido}`;
    fechaInicioInput.value = new Date().toISOString().split('T')[0];

    modalCobrar.style.display = "flex";
}

/* ==========================================
   CÁLCULOS
========================================== */
function configurarCalculos() {
    const inputs = [
        montoPrestadoInput,
        interesPrestadoInput,
        cuotasPrestadoInput,
        fechaInicioInput,
        frecuenciaPagoInput,
        intervaloPagoInput
    ];

    inputs.forEach(input => {
        input.addEventListener("input", () => {

            const monto = parseFloat(montoPrestadoInput.value) || 0;
            const interes = parseFloat(interesPrestadoInput.value) || 0;
            const cuotas = parseInt(cuotasPrestadoInput.value) || 0;

            const frecuencia = frecuenciaPagoInput.value;
            const intervalo = parseInt(intervaloPagoInput.value) || 1;

            // 💰 Cálculos financieros
            const total = monto + (monto * (interes / 100));
            const valorCuota = cuotas > 0 ? total / cuotas : 0;

            totalDevolverDisplay.textContent = `$ ${total.toLocaleString('es-AR')}`;
            valorCuotaDisplay.textContent = `$ ${valorCuota.toLocaleString('es-AR')}`;

            // 📅 Cálculo de fecha fin dinámico
            if (fechaInicioInput.value && cuotas > 0) {
                let fecha = new Date(fechaInicioInput.value + "T00:00:00");

                let totalPeriodos = cuotas * intervalo;

                if (frecuencia === "mes") {
                    fecha.setMonth(fecha.getMonth() + totalPeriodos);
                } else if (frecuencia === "semana") {
                    fecha.setDate(fecha.getDate() + (7 * totalPeriodos));
                } else if (frecuencia === "dia") {
                    fecha.setDate(fecha.getDate() + totalPeriodos);
                }

                fechaFinInput.value = fecha.toISOString().split('T')[0];
            }
        });
    });
}

/* ==========================================
   GUARDAR PRÉSTAMO
========================================== */
formCobrarPago.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!clienteSeleccionado) return alert("Seleccioná un cliente");

    const totalNum = parseFloat(totalDevolverDisplay.textContent.replace(/[$. ]/g, '') || 0);
    const cuotaNum = parseFloat(valorCuotaDisplay.textContent.replace(/[$. ]/g, '') || 0);

    // --- AQUÍ ESTÁ EL CAMBIO CLAVE ---
    // Creamos un objeto temporal para calcular el estado real inicial
    const prestamoTemporal = {
        fecha_inicio: fechaInicioInput.value,
        cuotas: parseInt(cuotasPrestadoInput.value),
        cuotas_pagadas: 0,
        frecuencia_pago: frecuenciaPagoInput.value,
        intervalo_pago: parseInt(intervaloPagoInput.value)
    };

    const estadoInicial = calcularEstadoPrestamo(prestamoTemporal);
    // ---------------------------------

    // 1. Insertar préstamo con el estado calculado
    const { data: dataPrestamo, error: errorPrestamo } = await supabaseClient
        .from('prestamos')
        .insert([{
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
            estado_pago: estadoInicial // <-- Ya no es 'al_dia' fijo
        }])
        .select();

    if (errorPrestamo) return console.error(errorPrestamo);

    // 2. Actualizar cliente con el mismo estado calculado
    await supabaseClient
        .from("clientes")
        .update({ estado: estadoInicial }) // <-- Ya no es 'al_dia' fijo
        .eq("id", clienteSeleccionado.id);

    alert("¡Préstamo otorgado!");
    modalCobrar.style.display = "none";
    formCobrarPago.reset();
    await cargarListaParaCobrar();
});

function aplicarFiltros() {
    const estado = selectEstadoFiltro.value;
    const montoMin = parseFloat(inputMontoFiltro.value) || 0;
    const textoBusqueda = inputBuscar.value.toLowerCase();

    clientesFiltrados = clientesGlobal.filter(cliente => {

        // 🔍 BUSCADOR
        const coincideBusqueda =
            `${cliente.nombre} ${cliente.apellido}`
                .toLowerCase()
                .includes(textoBusqueda);

        if (!coincideBusqueda) return false;

        const prestamo = cliente.prestamos?.slice(-1)[0] || null;

        // 💰 FILTRO MONTO
        if (montoMin > 0) {
            if (!prestamo) return false;
            if (prestamo.monto_prestado < montoMin) return false;
        }

        // 🎯 FILTRO ESTADO
        if (estado !== "todos") {
            const estadoCliente = obtenerEstadoCliente(cliente);
            if (estadoCliente !== estado) return false;
        }

        return true;
    });

    paginaActual = 1;
    renderPagos();
}

inputBuscar.addEventListener("input", aplicarFiltros);
selectEstadoFiltro.addEventListener("change", aplicarFiltros);
inputMontoFiltro.addEventListener("input", aplicarFiltros);


/* ==========================================
   CERRAR MODALES
========================================== */
document.getElementById("cerrarModalCobrar").onclick = () => modalCobrar.style.display = "none";
document.getElementById("cancelarModalCobrar").onclick = () => modalCobrar.style.display = "none";

cerrarModalCuota.onclick = () => modalCobrarCuota.classList.remove("active");

// ====== HAMBURGUESA ======
const hamburgerBtn = document.getElementById("hamburgerBtn");
const sidebar = document.querySelector(".sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

hamburgerBtn?.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    sidebarOverlay.classList.toggle("open");
});

sidebarOverlay?.addEventListener("click", () => {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
});

window.addEventListener("resize", () => {
    paginaActual = 1;
    renderPagos();
});

async function sincronizarEstadoCliente(clienteId) {
    // Traer el último préstamo de ese cliente
    const { data, error } = await supabaseClient
        .from("prestamos")
        .select("estado_pago")
        .eq("cliente_id", clienteId)
        .order("id", { ascending: false })
        .limit(1)
        .single();

    if (error || !data) return;

    let nuevoEstado = "sin_prestamo";

    // Corregir los valores para que coincidan con la restricción SQL
    if (data.estado_pago === "al_dia") nuevoEstado = "al_dia"; 
    if (data.estado_pago === "atrasado") nuevoEstado = "atrasado";
    if (data.estado_pago === "finalizado") nuevoEstado = "finalizado";
    await supabaseClient
        .from("clientes")
        .update({ estado: nuevoEstado })
        .eq("id", clienteId);
}