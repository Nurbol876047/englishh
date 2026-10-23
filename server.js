const express = require('express');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 8099;

const MAX_TEXT_LEN = 300;
const cache = new Map();

function synthesize(text) {
  return new Promise((resolve, reject) => {
    execFile(
      'espeak-ng',
      ['-v', 'en-us', '-s', '150', '-p', '55', '-a', '150', '--stdout', text],
      { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(err);
        resolve(stdout);
      }
    );
  });
}

app.get('/api/tts', async (req, res) => {
  const text = String(req.query.text || '').trim().slice(0, MAX_TEXT_LEN);
  if (!text) return res.status(400).end();

  const cached = cache.get(text);
  if (cached) {
    res.set('Content-Type', 'audio/wav');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(cached);
  }

  try {
    const wav = await synthesize(text);
    cache.set(text, wav);
    res.set('Content-Type', 'audio/wav');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(wav);
  } catch (e) {
    console.error('TTS error:', e.message);
    res.status(500).end();
  }
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`English Corridor running at http://localhost:${PORT}`);
});
