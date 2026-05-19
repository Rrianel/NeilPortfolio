const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5500;

// ensure uploads folder exists
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

app.use(cors());
app.use(express.json());

// serve the static portfolio files
app.use(express.static(__dirname));

// serve uploaded files
app.use('/uploads', express.static(UPLOADS));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safe = file.originalname.replace(/[^a-z0-9\.\-\_]/gi, '_');
    cb(null, `${timestamp}_${safe}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/upload', upload.single('resume'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url, name: req.file.originalname });
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Contact form: create a GitHub issue with the message
app.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    // If GitHub integration is configured, create an issue.
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
      const [owner, repo] = process.env.GITHUB_REPO.split('/');
      const title = `Portfolio message from ${name || email || 'guest'}`;
      const body = `**Name:** ${name || ''}\n**Email:** ${email || ''}\n\n${message || ''}`;

      // use global fetch if available
      if (typeof fetch !== 'function') {
        return res.status(500).json({ success: false, error: 'Server fetch not available. Update Node or install node-fetch.' });
      }

      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          'User-Agent': 'neil-portfolio',
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return res.status(500).json({ success: false, status: resp.status, error: text });
      }

      const data = await resp.json();
      return res.json({ success: true, url: data.html_url });
    }

    // Fallback: save message to uploads/messages.json (array of messages)
    const messagesFile = path.join(UPLOADS, 'messages.json');
    let messages = [];
    try {
      if (fs.existsSync(messagesFile)) {
        const raw = fs.readFileSync(messagesFile, 'utf8');
        messages = JSON.parse(raw || '[]');
      }
    } catch (e) {
      console.warn('Could not read messages file, starting fresh.', e && e.message);
      messages = [];
    }

    const entry = { id: Date.now(), name: name || null, email: email || null, message: message || null, createdAt: new Date().toISOString() };
    messages.push(entry);
    try {
      fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2), 'utf8');
      return res.json({ success: true, fallback: true, saved: `/uploads/messages.json`, id: entry.id });
    } catch (e) {
      console.error('Failed to save message fallback', e);
      return res.status(500).json({ success: false, error: 'Failed to save message fallback' });
    }
  } catch (err) {
    console.error('contact error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
