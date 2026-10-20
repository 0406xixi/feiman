// index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

app.get('/', (req, res) => {
  res.send('Feynman Platform backend is running!');
});

app.use('/api/users', require('./routes/users'));
app.use('/api/knowledge-points', require('./routes/knowledgePoints'));
app.use('/api/audio', require('./routes/audio'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/graph', require('./routes/graph'));

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});