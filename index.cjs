const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
const PORT = 3000;
const USERS_FILE = 'users.json';

// Load or initialize user data
let users = fs.existsSync(USERS_FILE)
  ? JSON.parse(fs.readFileSync(USERS_FILE))
  : {};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Discord Bot setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

const DISCORD_BOT_TOKEN = '--MTM3NDY5MDYzNzc5NzkxNjczMw.GMfIEt.bCE10gLctFUSxv4hP4l0ZJT5-KMAmqTklBbwhA';

client.once('ready', () => {
  console.log(`🤖 Discord Bot logged in as ${client.user.tag}`);
});
client.login(DISCORD_BOT_TOKEN);

// Helper to save users
function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Routes

// Register
app.post('/register', async (req, res) => {
  const { username, password, discordUserId } = req.body;
  if (!username || !password || !discordUserId) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (users[username]) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users[username] = {
    password: hashedPassword,
    discordUserId,
    twoFactorCode: null
  };
  saveUsers();
  res.json({ message: 'User registered successfully' });
});

// Login (send 2FA code to Discord)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.twoFactorCode = code;
  saveUsers();

  try {
    const discordUser = await client.users.fetch(user.discordUserId);
    await discordUser.send(`🔐 Your 2FA code is: **${code}**`);
    res.json({ message: '2FA code sent via Discord DM' });
  } catch (err) {
    console.error('Discord DM error:', err);
    res.status(500).json({ error: 'Failed to send Discord DM' });
  }
});

// Verify 2FA
app.post('/verify-2fa', (req, res) => {
  const { username, code } = req.body;
  const user = users[username];
  if (!user || user.twoFactorCode !== code) {
    return res.status(401).json({ error: 'Invalid 2FA code' });
  }
  user.twoFactorCode = null;
  saveUsers();
  res.json({ message: '2FA verification successful' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

const MESSAGES_FILE = 'messages.json';
let messages = fs.existsSync(MESSAGES_FILE)
  ? JSON.parse(fs.readFileSync(MESSAGES_FILE))
  : [];

// Save messages to file
function saveMessages() {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

// Send a message
app.post('/send-message', (req, res) => {
  const { from, to, content } = req.body;
  if (!from || !to || !content) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!users[from] || !users[to]) {
    return res.status(404).json({ error: 'Sender or recipient not found' });
  }
  messages.push({
    from,
    to,
    content,
    timestamp: new Date().toISOString()
  });
  saveMessages();
  res.json({ message: 'Message sent' });
});

// Get messages for a user
app.get('/messages/:username', (req, res) => {
  const { username } = req.params;
  if (!users[username]) {
    return res.status(404).json({ error: 'User not found' });
  }
  const userMessages = messages.filter(msg => msg.to === username);
  res.json(userMessages);
});