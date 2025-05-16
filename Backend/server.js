/**
 * Express backend for in-memory file exchange between two devices over WiFi using room IDs.
 * No storage, files held in memory per room.
 * 
 * API:
 * POST /rooms/:roomId/upload      - upload a file to a room (sender device)
 * GET /rooms/:roomId/files        - list files in a room (host device)
 * GET /rooms/:roomId/files/:fileId - download a file from a room
 * 
 * Files expire after 10 minutes.
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// Allow CORS from frontend origin
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

const upload = multer({ storage: multer.memoryStorage() });

// In-memory storage of rooms -> array of files
// Map<roomId, Array<fileObj>>, fileObj = {id, originalName, mimetype, buffer, size, uploadTime}
const rooms = new Map();

const FILE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

// Upload file to room
app.post('/rooms/:roomId/upload', upload.single('file'), (req, res) => {
  const { roomId } = req.params;
  if (!roomId) {
    return res.status(400).json({ message: 'Missing roomId' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileEntry = {
    id: uuidv4(),
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    buffer: req.file.buffer,
    size: req.file.size,
    uploadTime: Date.now()
  };

  if (!rooms.has(roomId)) {
    rooms.set(roomId, []);
  }
  rooms.get(roomId).push(fileEntry);

  // Schedule file removal after TTL
  setTimeout(() => {
    const files = rooms.get(roomId);
    if (files) {
      const idx = files.findIndex(f => f.id === fileEntry.id);
      if (idx !== -1) files.splice(idx, 1);
      if (files.length === 0) rooms.delete(roomId);
    }
  }, FILE_TTL_MS);

  res.json({ message: 'File uploaded', fileId: fileEntry.id, originalName: fileEntry.originalName });
});

// List files in room
app.get('/rooms/:roomId/files', (req, res) => {
  const { roomId } = req.params;
  if (!roomId) {
    return res.status(400).json({ message: 'Missing roomId' });
  }
  const files = rooms.get(roomId) || [];
  // Return metadata only
  res.json(files.map(f => ({
    id: f.id,
    originalName: f.originalName,
    mimetype: f.mimetype,
    size: f.size,
    uploadTime: f.uploadTime
  })));
});

// Download file from room
app.get('/rooms/:roomId/files/:fileId', (req, res) => {
  const { roomId, fileId } = req.params;
  if (!roomId || !fileId) {
    return res.status(400).json({ message: 'Missing roomId or fileId' });
  }
  const files = rooms.get(roomId) || [];
  const file = files.find(f => f.id === fileId);
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  res.set({
    'Content-Type': file.mimetype,
    'Content-Disposition': `attachment; filename="${file.originalName}"`
  });
  res.send(file.buffer);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

