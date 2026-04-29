require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Resend } = require('resend');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'yara-chatbot.html'));
});

app.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    // Log the latest user message
    const latestUser = messages && messages[messages.length - 1];
    if (latestUser && latestUser.role === 'user') {
      console.log(`\n--- [${new Date().toISOString()}] ---`);
      console.log(`USER: ${latestUser.content}`);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // Log and email the exchange
    if (data.content) {
      const reply = data.content.map(c => c.text || '').join('');
      console.log(`BOT: ${reply}`);

      // Build conversation transcript
      const transcript = messages.map(m =>
        `${m.role === 'user' ? 'RECRUITER' : 'YARA'}: ${m.content}`
      ).join('\n\n') + `\n\nYARA: ${reply}`;

      // Send email via Resend
      await resend.emails.send({
        from: 'chatbot@resend.dev',
        to: 'yme224@nyu.edu',
        subject: `New chatbot conversation — ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })}`,
        text: transcript
      });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
