// db.js
const sqlite3 = require("sqlite3").verbose();

// Conexión a un archivo SQLite llamado database.db en la raíz del backend
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("❌ Error al conectar a SQLite:", err.message);
  } else {
    console.log("✅ Conectado a la base de datos SQLite");
  }
});

// Crear tabla 'recetas' si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS recetas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    ingredientes TEXT,
    pasos TEXT,
    categoria TEXT
  )
`, (err) => {
  if (err) {
    console.error("❌ Error al crear la tabla:", err.message);
  } else {
    console.log("✅ Tabla 'recetas' lista");
  }
});

module.exports = db;
