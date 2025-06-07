const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Ensure data directory exists
const DATA_DIR = '/data';
const DATA_FILE = path.join(DATA_DIR, 'app-data.json');

// Initialize data directory
async function initializeDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Create initial data file if it doesn't exist
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify({ 
        initialized: true, 
        timestamp: new Date().toISOString(),
        entries: []
      }, null, 2));
    }
  } catch (error) {
    console.error('Failed to initialize data directory:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    app: process.env.APP_NAME || 'alchemy-fly-example',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Alchemy Fly.io Example!',
    endpoints: {
      health: '/health',
      data: '/data (GET/POST)',
      env: '/env'
    },
    timestamp: new Date().toISOString()
  });
});

// Environment info endpoint (non-sensitive only)
app.get('/env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    APP_NAME: process.env.APP_NAME,
    // Show that secrets are available (but don't expose values)
    has_database_url: !!process.env.DATABASE_URL,
    has_api_key: !!process.env.API_KEY,
  });
});

// Data persistence endpoints
app.get('/data', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to read data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/data', async (req, res) => {
  try {
    // Read existing data
    let existingData;
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      existingData = JSON.parse(data);
    } catch {
      existingData = { entries: [] };
    }

    // Add new entry
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      data: req.body
    };

    existingData.entries = existingData.entries || [];
    existingData.entries.push(newEntry);
    existingData.lastUpdated = new Date().toISOString();

    // Write updated data
    await fs.writeFile(DATA_FILE, JSON.stringify(existingData, null, 2));
    
    res.json({ 
      success: true, 
      entry: newEntry,
      total_entries: existingData.entries.length
    });
  } catch (error) {
    console.error('Failed to write data:', error);
    res.status(500).json({ error: 'Failed to write data' });
  }
});

// Clear all data
app.delete('/data', async (req, res) => {
  try {
    const initialData = {
      initialized: true,
      timestamp: new Date().toISOString(),
      entries: []
    };
    
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
    res.json({ success: true, message: 'All data cleared' });
  } catch (error) {
    console.error('Failed to clear data:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

// Initialize and start server
async function startServer() {
  await initializeDataDir();
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`💾 Data endpoint: http://localhost:${port}/data`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);