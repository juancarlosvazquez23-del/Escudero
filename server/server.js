require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// MODELOS
const Book = require('./models/book');
const News = require('./models/news');
const Attendance = require('./models/attendance');
const Request = require('./models/request');
const Admin = require("./models/admin");  // <---- IMPORTANTE

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---- Servir frontend si existe la carpeta /public ----
app.use(express.static('public'));

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_KEY"; // <-- NECESARIO


/* ====================================================
                MIDDLEWARE AUTH
==================================================== */

function authAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.admin = decoded;
    next();
  });
}


/* ====================================================
                LOGIN ADMIN
==================================================== */

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });
  if (!admin) return res.json({ ok: false, msg: "Usuario no encontrado" });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return res.json({ ok: false, msg: "Contraseña incorrecta" });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "4h" });

  res.json({ ok: true, token });
});

app.get("/api/admin/check", authAdmin, (req, res) => {
  res.json({ ok: true, admin: req.admin.username });
});


/* ====================================================
                CONEXIÓN Y START
==================================================== */

async function start() {
  try {
    if (!MONGODB_URI) throw new Error('❌ MONGODB_URI no definida en .env');

    await mongoose.connect(MONGODB_URI);

    console.log('✅ Conectado a MongoDB Atlas');
    app.listen(PORT, () => console.log(`🚀 API escuchando en http://localhost:${PORT}`));

  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
}

app.get('/', (_, res) => res.send('Servidor Biblioteca OK'));
app.get('/health', (_, res) => res.json({ ok: true }));


/* ====================================================
                    BOOKS
==================================================== */

// Crear libro (PROTEGIDO)
app.post('/api/books', authAdmin, async (req, res) => {
  try {
    const p = req.body;

    const book = new Book({
      titulo: p.titulo,
      autor: p.autor,
      carrera: p.carrera,
      semestre: p.semestre,
      genero: p.genero,
      descripcion: p.descripcion,
      disponible: p.disponible ?? true,
      fileName: p.fileName,
      fileData: p.fileData
    });

    await book.save();
    res.status(201).json(book);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener libros (PÚBLICO)
app.get('/api/books', async (req, res) => {
  try {
    const q = req.query.q || '';

    const filter = q ? {
      $or: [
        { titulo: new RegExp(q, 'i') },
        { autor: new RegExp(q, 'i') },
        { genero: new RegExp(q, 'i') },
        { carrera: new RegExp(q, 'i') }
      ]
    } : {};

    const docs = await Book.find(filter).sort({ createdAt: -1 }).limit(1000).lean();

    const mapped = docs.map(d => ({
      id: d._id.toString(),
      title: d.titulo,
      author: d.autor,
      carrera: d.carrera,
      semestre: d.semestre,
      genero: d.genero,
      desc: d.descripcion,
      available: d.disponible,
      fileName: d.fileName,
      fileData: d.fileData,
      createdAt: d.createdAt
    }));

    res.json(mapped);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar libro (PROTEGIDO)
app.put('/api/books/:id', authAdmin, async (req, res) => {
  try {
    const update = req.body;

    const b = await Book.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!b) return res.status(404).json({ error: 'Libro no encontrado' });

    res.json(b);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar libro (PROTEGIDO)
app.delete('/api/books/:id', authAdmin, async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ====================================================
                    NEWS
==================================================== */

app.post('/api/news', authAdmin, async (req, res) => {
  try {
    const n = new News(req.body);
    await n.save();
    res.status(201).json(n);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/news', async (_, res) => {
  try {
    const docs = await News.find().sort({ createdAt: -1 }).limit(500).lean();

    const mapped = docs.map(d => ({
      id: d._id.toString(),
      title: d.titulo,
      body: d.cuerpo,
      ts: d.createdAt,
      img: d.img
    }));

    res.json(mapped);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/news/:id', authAdmin, async (req, res) => {
  try {
    const n = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(n);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/news/:id', authAdmin, async (req, res) => {
  try {
    await News.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ====================================================
                ATTENDANCE (ASISTENCIAS)
==================================================== */

app.post('/api/attendance', async (req, res) => {
  try {
    const a = new Attendance({ ...req.body, ts: new Date() });
    await a.save();
    res.status(201).json(a);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance', async (_, res) => {
  try {
    const docs = await Attendance.find().sort({ ts: -1 }).limit(2000).lean();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/attendance/:id', authAdmin, async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ====================================================
                REQUESTS (PRÉSTAMOS)
==================================================== */

app.post('/api/requests', async (req, res) => {
  try {
    const r = new Request(req.body);
    await r.save();
    res.status(201).json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/requests', async (_, res) => {
  try {
    const docs = await Request.find()
      .populate("bookId")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    res.json(docs);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/requests/:id', authAdmin, async (req, res) => {
  try {
    await Request.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

start();
