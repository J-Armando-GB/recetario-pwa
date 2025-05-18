// indexeddb.js

import { openDB } from 'https://unpkg.com/idb?module';

const dbPromise = openDB('recetario-db', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('recetas')) {
      db.createObjectStore('recetas', { keyPath: 'id', autoIncrement: true });
    }
    if (!db.objectStoreNames.contains('accionesPendientes')) {
      db.createObjectStore('accionesPendientes', { keyPath: 'uid' });
    }
  },
});

// Guardar receta local y registrar acción pendiente
export async function guardarRecetaLocal(receta) {
  const db = await dbPromise;
  const uid = crypto.randomUUID();
  receta.uid = uid;

  await db.put('recetas', receta);
  await db.put('accionesPendientes', { uid, tipo: 'crear', receta });

  return uid;
}

// Editar receta local y registrar acción pendiente
export async function editarRecetaLocal(id, nuevosDatos) {
  const db = await dbPromise;
  const receta = await db.get('recetas', Number(id));
  const actualizada = { ...receta, ...nuevosDatos };
  await db.put('recetas', actualizada);

  const uid = crypto.randomUUID();
  await db.put('accionesPendientes', { uid, tipo: 'editar', id: Number(id), nuevosDatos });
}

// Eliminar receta local y registrar acción pendiente
export async function eliminarRecetaLocal(id) {
  const db = await dbPromise;
  await db.delete('recetas', Number(id));

  const uid = crypto.randomUUID();
  await db.put('accionesPendientes', { uid, tipo: 'eliminar', id: Number(id) });
}

// Obtener todas las recetas locales
export async function obtenerRecetasLocales() {
  const db = await dbPromise;
  return await db.getAll('recetas');
}

// Obtener acciones pendientes
export async function obtenerAccionesPendientes() {
  const db = await dbPromise;
  return await db.getAll('accionesPendientes');
}

// Eliminar acción sincronizada
export async function eliminarAccionPendiente(uid) {
  const db = await dbPromise;
  return await db.delete('accionesPendientes', uid);
}


export async function guardarRecetasDesdeBackend(recetas) {
  const db = await dbPromise;
  const tx = db.transaction('recetas', 'readwrite');
  const store = tx.objectStore('recetas');

  // Limpiar primero para evitar duplicados
  await store.clear();

  // Insertar recetas del backend
  for (const receta of recetas) {
    await store.put(receta);
  }

  await tx.done;
}
