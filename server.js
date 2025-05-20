const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// アップロード先
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'current.jpg'); // 常に同じ名前で保存
    }
});
const upload = multer({ storage: storage });
app.use(express.static(path.join(__dirname, 'public')));

// アップロードAPI
app.post('/upload', upload.single('image'), (req, res) => {
    res.json({ imageUrl: '/uploads/current.jpg' });
});

// Socket.IO
let shapes = [];
let imageUrl = '/uploads/current.jpg';

io.on('connection', (socket) => {
    socket.emit('initialDraw', shapes);
    if (fs.existsSync(path.join(uploadDir, 'current.jpg'))) {
        socket.emit('imageUrl', imageUrl);
    }

    socket.on('draw', (newShapes) => {
        shapes = newShapes;
        socket.broadcast.emit('draw', shapes);
    });

    socket.on('rotateImage', (angle) => {
        socket.broadcast.emit('rotateImage', angle);
    });

    socket.on('getInitialDraw', () => {
        socket.emit('initialDraw', shapes);
        if (fs.existsSync(path.join(uploadDir, 'current.jpg'))) {
            socket.emit('imageUrl', imageUrl);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
