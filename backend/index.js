const express = require('express');
const { nanoid } = require('nanoid');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database to store URL mappings
const urlDatabase = new Map();

// POST endpoint to shorten URLs
app.post('/shorten', (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Generate unique 7-character ID
    const shortId = nanoid(7);
    
    // Store mapping in database
    urlDatabase.set(shortId, url);
    
    // Generate shortened URL using environment domain or localhost fallback
    const domain = process.env.WORKSPACE_DEV_DOMAIN || `localhost:${PORT}`;
    const protocol = process.env.WORKSPACE_DEV_DOMAIN ? 'https' : 'http';
    const shortUrl = `${protocol}://${domain}/${shortId}`;
    
    res.json({
      shortId,
      shortUrl,
      originalUrl: url
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET endpoint to redirect to original URL
app.get('/:shortId', (req, res) => {
  try {
    const { shortId } = req.params;
    
    // Look up the shortId in the database
    const longUrl = urlDatabase.get(shortId);
    
    if (!longUrl) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    
    // Redirect to original URL
    res.redirect(302, longUrl);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET endpoint to generate QR code for shortened URL
app.get('/qr/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    
    // Look up the shortId to verify it exists
    const longUrl = urlDatabase.get(shortId);
    
    if (!longUrl) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    
    // Create the full shortened URL using environment domain
    const domain = process.env.WORKSPACE_DEV_DOMAIN || `localhost:${PORT}`;
    const protocol = process.env.WORKSPACE_DEV_DOMAIN ? 'https' : 'http';
    const shortUrl = `${protocol}://${domain}/${shortId}`;
    
    // Set response headers
    res.setHeader('Content-Type', 'image/png');
    
    // Generate QR code and pipe to response
    QRCode.toFileStream(res, shortUrl, {
      type: 'png',
      width: 200,
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all URLs endpoint (for debugging)
app.get('/urls', (req, res) => {
  const domain = process.env.WORKSPACE_DEV_DOMAIN || `localhost:${PORT}`;
  const protocol = process.env.WORKSPACE_DEV_DOMAIN ? 'https' : 'http';
  
  const urls = Array.from(urlDatabase.entries()).map(([shortId, longUrl]) => ({
    shortId,
    longUrl,
    shortUrl: `${protocol}://${domain}/${shortId}`
  }));
  res.json(urls);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
