const express = require('express');
const bodyParser = require('body-parser');
const { Client, GatewayIntentBits } = require('discord.js');

const DISCORD_BOT_TOKEN = '--MTM3NDY5MDYzNzc5NzkxNjczMw.GpWR1b.3Auc5fjfPzCOluKZjnJEUJJ9m1OUtSv0xHBuRE'; // Replace with your Discord bot token

const app = express();
app.use(bodyParser.json());

const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: ['CHANNEL'], // Needed to receive DMs
});

discordClient.login(DISCORD_BOT_TOKEN);

discordClient.on('ready', () => {
  console.log(`Discord Bot logged in as ${discordClient.user.tag}!`);
});

const codes = {}; // In-memory store for 2FA codes

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.get('/', (req, res) => {
  res.send('Secure Chat Backend is Running ✅');
});

app.post('/request-2fa', async (req, res) => {
  const { username, discordUserId } = req.body;

  if (!username || !discordUserId) {
    return res.status(400).json({ error: 'username and discordUserId are required' });
  }

  const code = generateCode();
  codes[username] = code;

  try {
    const user = await discordClient.users.fetch(discordUserId);
    await user.send(`Your 2FA code is: **${code}**`);
    console.log(`[2FA] Sent code to Discord user ${discordUserId}: ${code}`);
    res.json({ status: 'Code sent via Discord' });
  } catch (err) {
    console.error('Discord DM error:', err);
    // Return the actual error message to the client for debugging
    res.status(500).json({ error: 'Failed to send Discord DM', details: err.message });
  }
});


app.post('/verify-2fa', (req, res) => {
  const { username, code } = req.body;

  if (!username || !code) {
    return res.status(400).json({ error: 'username and code are required' });
  }

  if (codes[username] === code) {
    delete codes[username];
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid code' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
