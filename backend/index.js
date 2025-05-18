const express = require("express");
const cors = require("cors");
const db = require("./db"); // <<-- Importamos conexión

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("¡Servidor backend funcionando!");
});

// Obtener todas las recetas
app.get("/recetas", (req, res) => {
  db.all("SELECT * FROM recetas", (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener recetas:", err.message);
      res.status(500).json({ error: "Error al obtener recetas" });
    } else {
      res.json(rows); // Devuelve todas las recetas en formato JSON
    }
  });
});

// Agregar nueva receta
app.post("/recetas", (req, res) => {
  const { nombre, ingredientes, pasos, categoria } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  const query = `
    INSERT INTO recetas (nombre, ingredientes, pasos, categoria)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [nombre, ingredientes, pasos, categoria], function (err) {
    if (err) {
      console.error("❌ Error al insertar receta:", err.message);
      res.status(500).json({ error: "Error al insertar receta" });
    } else {
      res.status(201).json({
        mensaje: "Receta agregada exitosamente",
        id: this.lastID,
      });
    }
  });
});

// Editar una receta existente
app.put("/recetas/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, ingredientes, pasos, categoria } = req.body;

  const query = `
    UPDATE recetas
    SET nombre = ?, ingredientes = ?, pasos = ?, categoria = ?
    WHERE id = ?
  `;

  db.run(query, [nombre, ingredientes, pasos, categoria, id], function (err) {
    if (err) {
      console.error("❌ Error al editar receta:", err.message);
      res.status(500).json({ error: "Error al editar receta" });
    } else {
      res.json({ mensaje: "Receta actualizada correctamente" });
    }
  });
});


// Eliminar una receta por ID
app.delete("/recetas/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM recetas WHERE id = ?", id, function (err) {
    if (err) {
      console.error("❌ Error al eliminar receta:", err.message);
      res.status(500).json({ error: "Error al eliminar receta" });
    } else {
      res.json({ mensaje: "Receta eliminada correctamente" });
    }
  });
});



app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
