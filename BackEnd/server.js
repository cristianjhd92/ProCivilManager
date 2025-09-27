const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');

require('dotenv').config();

// Conectar a la base de datos
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.json());

//llamados 
const userRoute = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const proyectosRoutes = require('./routes/ProyectoRoutes');
const statsRoutes = require('./routes/statsRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Importar rutas
app.use('/api/user', userRoute);
app.use('/api', contactRoutes);
app.use('/api/proyectos', proyectosRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reportes', reportRoutes);

// WebSockets
io.on('connection', (socket) => {
    console.log('Usuario conectado');

    socket.on('mensaje', (data) => {
        console.log(data);
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
