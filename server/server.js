const express = require('express');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2');
const initializeSocket = require('./socket');

const app = express();
const server = http.createServer(app);

// Configuración de Base de Datos (Ajustar credenciales)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'meeting_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Inicializar Socket.IO
initializeSocket(server);

// Rutas

// 1. Obtener reunión activa (Para usuarios normales)
app.get('/api/active-meeting', (req, res) => {
    db.query('SELECT id FROM meetings WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error de base de datos' });
        }

        if (results.length > 0) {
            res.json({ roomId: results[0].id });
        } else {
            res.json({ roomId: null });
        }
    });
});

// 2. Crear reunión (Simulación de "Solo Propietario")
// En producción, esto estaría protegido por middleware de autenticación
app.post('/api/create-meeting', (req, res) => {
    const roomId = uuidv4();
    
    // Desactivar reuniones anteriores para mantener la regla de "una reunión activa"
    db.query('UPDATE meetings SET is_active = 0', (err) => {
        if (err) console.error(err);
        
        db.query('INSERT INTO meetings (id, is_active) VALUES (?, 1)', [roomId], (err) => {
            if (err) return res.status(500).json({ error: 'No se pudo crear la reunión' });
            res.json({ roomId });
        });
    });
});

// Rutas de Vistas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/meeting', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/meeting.html'));
});

// Ruta secreta para el propietario para iniciar reunión
app.get('/admin/start', (req, res) => {
    // Redirige a una lógica de frontend que llama a /api/create-meeting
    res.send(`
        <h1>Panel de Propietario</h1>
        <button onclick="fetch('/api/create-meeting', {method: 'POST'}).then(r=>r.json()).then(d=>window.location.href='/meeting?room='+d.roomId)">
            Iniciar Nueva Reunión
        </button>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));