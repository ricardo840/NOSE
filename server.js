const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
    })
  : null;

app.use(express.json());
app.use(express.static(__dirname));

async function inicializarBaseDeDatos() {
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS historial (
      id SERIAL PRIMARY KEY,
      punto_cardinal TEXT NOT NULL,
      distancia NUMERIC,
      fecha_deteccion TEXT NOT NULL,
      hora_deteccion TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

app.get("/api/historial", async (_req, res) => {
  if (!pool) {
    res.json([]);
    return;
  }

  try {
    const resultado = await pool.query(
      "SELECT punto_cardinal, distancia, fecha_deteccion, hora_deteccion FROM historial ORDER BY id DESC"
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al obtener historial", error);
    res.status(500).json({ error: "No fue posible obtener el historial" });
  }
});

app.post("/api/historial", async (req, res) => {
  if (!pool) {
    res.status(503).json({ error: "Base de datos no configurada" });
    return;
  }

  const { punto_cardinal, distancia, fecha_deteccion, hora_deteccion } = req.body || {};

  if (!punto_cardinal || fecha_deteccion === undefined || hora_deteccion === undefined) {
    res.status(400).json({ error: "Faltan datos del historial" });
    return;
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO historial (punto_cardinal, distancia, fecha_deteccion, hora_deteccion)
       VALUES ($1, $2, $3, $4)
       RETURNING punto_cardinal, distancia, fecha_deteccion, hora_deteccion`,
      [punto_cardinal, distancia, fecha_deteccion, hora_deteccion]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al guardar historial", error);
    res.status(500).json({ error: "No fue posible guardar el historial" });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

inicializarBaseDeDatos()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor escuchando en el puerto ${port}`);
    });
  })
  .catch(error => {
    console.error("No fue posible inicializar la base de datos", error);
    process.exit(1);
  });