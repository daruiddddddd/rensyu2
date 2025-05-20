const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// アップロードディレクトリ設定
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'temp.jpg'); // 一時保存用
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));

// アップロード → 1枚だけ保持（current.jpgに固定）
app.post('/upload', upload.single('image'), (req, res) => {
    const currentPath = path.join(uploadDir, 'current.jpg');
    const tempPath = path.join(uploadDir, 'temp.jpg');
    fs.copyFileSync(tempPath, currentPath);
    fs.unlinkSync(tempPath); // 一時ファイル削除
    res.json({ imageUrl: '/uploads/current.jpg' });
});

let shapes = [];
let imageUrl = '/uploads/current.jpg';

io.on('connection', (socket) => {
    console.log('a user connected');

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

    socket.on('imageUrl', (url) => {
        imageUrl = url;
        socket.broadcast.emit('imageUrl', imageUrl);
    });
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
