const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// On Vercel the filesystem is read-only; /tmp is the only writable dir
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR  = IS_VERCEL ? '/tmp' : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

app.use(express.json());
app.use(express.static(__dirname));

// Landing page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'eBidSaathi-Landing.html'));
});

// Early access form submission
app.post('/api/early-access', (req, res) => {
  const { name, phone, business, type, state, category } = req.body;

  if (!name || !phone || !business || !type || !state) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const submission = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    name,
    phone,
    business,
    type,
    state,
    category: category || ''
  };

  // Persist locally (on Vercel this uses /tmp — survives the request but not cold starts)
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    let submissions = [];
    if (fs.existsSync(DATA_FILE)) {
      try { submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch {}
    }
    submissions.push(submission);
    fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2));
  } catch (err) {
    console.error('File write error (non-fatal):', err.message);
  }

  console.log(`[${submission.timestamp}] New signup: ${name} (${phone}) — ${business} [${type}, ${state}]`);
  res.json({ success: true });
});

// View submissions (local dev only)
app.get('/admin/submissions', (req, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json({ total: 0, submissions: [] });
  try {
    const submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json({ total: submissions.length, submissions });
  } catch {
    res.status(500).json({ error: 'Could not read submissions' });
  }
});

// Start server only when run directly (not imported by Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  eBidSaathi running at http://localhost:${PORT}`);
    console.log(`  Submissions at   http://localhost:${PORT}/admin/submissions\n`);
  });
}

// Export for Vercel serverless
module.exports = app;
