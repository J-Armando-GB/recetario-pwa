// app.js (modo módulo)
import {
  guardarRecetaLocal,
  editarRecetaLocal,
  eliminarRecetaLocal,
  obtenerRecetasLocales,
  obtenerAccionesPendientes,
  eliminarAccionPendiente,
  guardarRecetasDesdeBackend
} from './indexeddb.js';

let recetasCargadas = []; // Se llenará con todas las recetas desde backend o IndexedDB

document.addEventListener("DOMContentLoaded", async () => {
  await cargarRecetas();
  registrarEventos();
  monitorearConexion();
  document.getElementById("buscador").addEventListener("input", filtrarYMostrarRecetas);
  document.getElementById("filtro-categoria").addEventListener("change", filtrarYMostrarRecetas);


  if (navigator.onLine) sincronizarRecetasPendientes();
});


// =====================
// CARGAR Y MOSTRAR RECETAS
// =====================
async function cargarRecetas() {
  
    let recetas = [];

  if (navigator.onLine) {
    try {
      const res = await fetch("http://localhost:3000/recetas");
      recetas = await res.json();

      // Guardar en IndexedDB para modo offline
      await guardarRecetasDesdeBackend(recetas);
    } catch (error) {
      console.warn("No se pudo cargar desde API, usando IndexedDB");
      recetas = await obtenerRecetasLocales();
    }
  } else {
    recetas = await obtenerRecetasLocales();
  }

  recetasCargadas = recetas;
  actualizarOpcionesCategoria();  // 👈 actualiza filtro
  filtrarYMostrarRecetas();


}


function mostrarRecetas(recetas) {
  const contenedor = document.getElementById("contenedor-recetas");
  contenedor.innerHTML = "";

  recetas.forEach((receta) => {
    const div = document.createElement("div");
    div.className = "col-md-4";

    div.innerHTML = `
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">${receta.nombre}</h5>
          <h6 class="card-subtitle mb-2 text-muted">${receta.categoria}</h6>
          <p><strong>Ingredientes:</strong><br>${receta.ingredientes}</p>
          <p><strong>Pasos:</strong><br>${receta.pasos}</p>
        </div>
        <div class="card-footer d-flex justify-content-between">
          <button class="btn btn-sm btn-outline-primary btn-editar" data-id="${receta.id}">Editar</button>
          <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${receta.id}">Eliminar</button>
        </div>
      </div>
    `;

    contenedor.appendChild(div);
  });

  document.querySelectorAll(".btn-eliminar").forEach(btn =>
    btn.addEventListener("click", eliminarReceta)
  );

  document.querySelectorAll(".btn-editar").forEach(btn =>
    btn.addEventListener("click", prepararEdicion)
  );
}

// =====================
// FILTRAR Y MOSTRAR RECETAS
// =====================
function filtrarYMostrarRecetas() {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const categoria = document.getElementById("filtro-categoria").value;

  let filtradas = recetasCargadas;

  // Filtro por texto
  if (texto) {
    filtradas = filtradas.filter(receta =>
      receta.nombre.toLowerCase().includes(texto) ||
      receta.ingredientes.toLowerCase().includes(texto)
    );
  }

  // Filtro por categoría
  if (categoria) {
    filtradas = filtradas.filter(receta => receta.categoria === categoria);
  }

  mostrarRecetas(filtradas);
}

// =====================
// ACTUALIZAR OPCIONES DE CATEGORÍA
// =====================
function actualizarOpcionesCategoria() {
  const select = document.getElementById("filtro-categoria");

  // Obtenemos las categorías únicas
  const categoriasUnicas = [...new Set(recetasCargadas.map(r => r.categoria).filter(Boolean))];

  // Limpiamos todas excepto la opción "Todas"
  select.innerHTML = `<option value="">Todas las categorías</option>`;

  categoriasUnicas.forEach(categoria => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    select.appendChild(option);
  });
}


// =====================
// EVENTOS DEL FORMULARIO
// =====================
function registrarEventos() {
  const form = document.getElementById("form-receta");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const datos = {
      nombre: form.nombre.value,
      ingredientes: form.ingredientes.value,
      pasos: form.pasos.value,
      categoria: form.categoria.value,
    };

    const editandoId = form.dataset.editando;

    if (editandoId) {
      if (navigator.onLine) {
        await actualizarReceta(editandoId, form);
      } else {
        await editarRecetaLocal(Number(editandoId), datos);
        mostrarNotificacion("Receta editada localmente", "warning");
        await cargarRecetas();
      }
      delete form.dataset.editando;
    } else {
      if (navigator.onLine) {
        await enviarReceta(form);
      } else {
        await guardarRecetaLocal(datos);
        mostrarNotificacion("Receta guardada localmente", "warning");
        await cargarRecetas();
      }
    }

    form.reset();
    bootstrap.Modal.getInstance(document.getElementById("modalReceta")).hide();
  });
}

// =====================
// CRUD ONLINE
// =====================
async function enviarReceta(form) {
  const datos = {
    nombre: form.nombre.value,
    ingredientes: form.ingredientes.value,
    pasos: form.pasos.value,
    categoria: form.categoria.value,
  };

  try {
    const res = await fetch("http://localhost:3000/recetas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    if (res.ok) {
      mostrarNotificacion("Receta creada", "success");
      await cargarRecetas();
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function actualizarReceta(id, form) {
  const datos = {
    nombre: form.nombre.value,
    ingredientes: form.ingredientes.value,
    pasos: form.pasos.value,
    categoria: form.categoria.value,
  };

  try {
    const res = await fetch(`http://localhost:3000/recetas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    if (res.ok) {
      mostrarNotificacion("Receta actualizada", "success");
      await cargarRecetas();
    }
  } catch (error) {
    console.error("Error al editar receta:", error);
  }
}

// =====================
// ELIMINAR
// =====================
async function eliminarReceta(e) {
  const id = e.target.dataset.id;

  if (!confirm("¿Estás seguro de eliminar esta receta?")) return;

  if (navigator.onLine) {
    try {
      const res = await fetch(`http://localhost:3000/recetas/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        mostrarNotificacion("Receta eliminada", "danger");
        await cargarRecetas();
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  } else {
    await eliminarRecetaLocal(Number(id));
    mostrarNotificacion("Receta eliminada localmente", "warning");
    await cargarRecetas();
  }
}

// =====================
// SINCRONIZACIÓN
// =====================
async function sincronizarRecetasPendientes() {
  const acciones = await obtenerAccionesPendientes();

  for (const accion of acciones) {
    try {
      if (accion.tipo === "crear") {
        await fetch("http://localhost:3000/recetas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(accion.receta),
        });
      }

      if (accion.tipo === "editar") {
        await fetch(`http://localhost:3000/recetas/${accion.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(accion.nuevosDatos),
        });
      }

      if (accion.tipo === "eliminar") {
        await fetch(`http://localhost:3000/recetas/${accion.id}`, {
          method: "DELETE",
        });
      }

      await eliminarAccionPendiente(accion.uid);
    } catch (error) {
      console.warn("No se pudo sincronizar acción:", accion, error);
    }
  }

  await cargarRecetas();
  mostrarNotificacion("Cambios sincronizados", "success");
}

// =====================
// DETECCIÓN DE CONEXIÓN
// =====================
function monitorearConexion() {
  const onlineStatus = document.getElementById('onlineStatus');
  const offlineStatus = document.getElementById('offlineStatus');

  window.addEventListener('online', async () => {
    onlineStatus.classList.remove('d-none');
    offlineStatus.classList.add('d-none');
    await sincronizarRecetasPendientes();
    setTimeout(() => onlineStatus.classList.add('d-none'), 3000);
  });

  window.addEventListener('offline', () => {
    onlineStatus.classList.add('d-none');
    offlineStatus.classList.remove('d-none');
  });

  if (navigator.onLine) {
    onlineStatus.classList.remove('d-none');
  } else {
    offlineStatus.classList.remove('d-none');
  }
}

// =====================
// MODAL: PREPARAR EDICIÓN
// =====================
function prepararEdicion(e) {
  const id = e.target.dataset.id;
  const tarjeta = e.target.closest(".card");
  const nombre = tarjeta.querySelector(".card-title").textContent;
  const categoria = tarjeta.querySelector(".card-subtitle").textContent;
  const ingredientes = tarjeta.querySelectorAll("p")[0].innerText.replace("Ingredientes:\n", "");
  const pasos = tarjeta.querySelectorAll("p")[1].innerText.replace("Pasos:\n", "");

  const form = document.getElementById("form-receta");
  form.nombre.value = nombre;
  form.categoria.value = categoria;
  form.ingredientes.value = ingredientes;
  form.pasos.value = pasos;

  form.dataset.editando = id;

  const modal = new bootstrap.Modal(document.getElementById("modalReceta"));
  modal.show();
}

// =====================
// TOASTS
// =====================
function mostrarNotificacion(mensaje, tipo = 'info') {
  const toastContainer = document.createElement('div');
  toastContainer.innerHTML = `
    <div class="toast align-items-center text-white bg-${tipo} border-0 show" role="alert">
      <div class="d-flex">
        <div class="toast-body">${mensaje}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;

  document.body.appendChild(toastContainer);
  setTimeout(() => toastContainer.remove(), 5000);
}


// Activar/desactivar modo oscuro y guardar preferencia
document.addEventListener("DOMContentLoaded", () => {
  const btnToggle = document.getElementById("toggle-dark");
  const cuerpo = document.body;

  // Verifica si hay preferencia guardada
  const dark = localStorage.getItem("modoOscuro") === "true";
  if (dark) cuerpo.classList.add("dark-mode");

  btnToggle.addEventListener("click", () => {
    cuerpo.classList.toggle("dark-mode");
    const activo = cuerpo.classList.contains("dark-mode");
    localStorage.setItem("modoOscuro", activo);
    btnToggle.textContent = activo ? "☀️ Modo claro" : "🌙 Modo oscuro";
  });

  // Actualiza texto del botón al cargar
  btnToggle.textContent = cuerpo.classList.contains("dark-mode")
    ? "☀️ Modo claro"
    : "🌙 Modo oscuro";
});

