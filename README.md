# Plataforma de Reuniones Online (MVP)

Sistema de videoconferencias WebRTC simple y escalable.

## 📋 Requisitos Previos

* Node.js (v16+)
* MySQL

## 🚀 Instalación

1. **Base de Datos:**
   * Crea una base de datos en MySQL.
   * Ejecuta el script `database/schema.sql`.
   * Configura las credenciales en `server/server.js` (líneas 12-16).

2. **Dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar:**
   ```bash
   npm start
   ```
   El servidor correrá en `http://localhost:3000`.

## 📖 Uso

### Rol: Propietario (Crear Reunión)
Dado que no hay sistema de login complejo, el propietario accede a una ruta oculta para iniciar la sesión:
1. Navega a `http://localhost:3000/admin/start`.
2. Haz clic en "Iniciar Nueva Reunión".
3. Esto creará un registro en la BD y te redirigirá a la sala.

### Rol: Usuario (Unirse)
1. Navega a la página principal `http://localhost:3000`.
2. Si el propietario ha iniciado una reunión, el botón "Unirse" estará habilitado.
3. Haz clic para entrar.

## 🛠 Tecnologías
* **Frontend:** HTML5, CSS3, Vanilla JS.
* **Backend:** Node.js, Express.
* **Real-time:** WebRTC (Mesh Topology), Socket.IO.
* **DB:** MySQL.