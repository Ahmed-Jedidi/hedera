// generate.js

const fs = require('fs');

// ===========================
// 1. HTML (index.html)
// ===========================
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AidProof TN</title>
  <script defer src="app.js"></script>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: auto; padding: 1rem; }
    input, button { padding: 0.5rem; margin: 0.5rem 0; width: 100%; }
    ul { padding: 0; list-style: none; }
    li { background: #f0f0f0; margin: 0.25rem 0; padding: 0.5rem; border-radius: 4px; }
  </style>
</head>
<body>
  <h2>AidProof TN - Aid Logger</h2>
  <input id="beneficiaryId" placeholder="Beneficiary ID (pseudonym)" />
  <input id="aidType" placeholder="Aid Type (e.g., food, medicine)" />
  <input id="location" placeholder="Location (e.g., Sousse)" />
  <button onclick="submitAid()">Log Aid Distribution</button>
  <h3>Aid Log History</h3>
  <ul id="logsList"><li>Loading logs...</li></ul>
  <div id="result"></div>
</body>
</html>
`;

fs.writeFileSync('index.html', html);

// ===========================
// 2. Frontend JS (app.js)
// ===========================
const js = `
async function submitAid() {
  const beneficiaryId = document.getElementById('beneficiaryId').value;
  const aidType = document.getElementById('aidType').value;
  const location = document.getElementById('location').value;
  const timestamp = new Date().toISOString();

  const aidData = JSON.stringify({ beneficiaryId, aidType, location, timestamp });
  const hash = await sha256(aidData);

  const response = await fetch('/logAid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aidDataHash: hash, beneficiaryId, aidType, location, timestamp })
  });

  const result = await response.json();
  document.getElementById('result').innerText = 'Logged on Hedera. File ID: ' + result.fileId;

  await loadLogs();
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function loadLogs() {
  try {
    const res = await fetch('/logs');
    const logs = await res.json();

    const list = document.getElementById('logsList');
    if (!list) return;

    list.innerHTML = '';
    logs.forEach(log => {
      const li = document.createElement('li');
      li.textContent = \`\${log.timestamp} - \${log.aidType} aid to \${log.beneficiaryId} in \${log.location} (File ID: \${log.fileId})\`;
      list.appendChild(li);
    });

    if (logs.length === 0) {
      list.innerHTML = '<li>No aid logs available yet.</li>';
    }
  } catch (error) {
    console.error('Failed to load logs:', error);
    const list = document.getElementById('logsList');
    if (list) list.innerHTML = '<li>Error fetching logs.</li>';
  }
}

window.onload = loadLogs;
`;

fs.writeFileSync('app.js', js);

// ===========================
// 3. Backend (server.js)
// ===========================
const server = `
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { Client, FileCreateTransaction } = require('@hashgraph/sdk');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('.'));

const client = Client.forTestnet().setOperator(process.env.OPERATOR_ID, process.env.OPERATOR_KEY);

const logsFile = 'logs.json';
if (!fs.existsSync(logsFile)) fs.writeFileSync(logsFile, '[]');

app.post('/logAid', async (req, res) => {
  try {
    const { aidDataHash, beneficiaryId, aidType, location, timestamp } = req.body;

    const tx = new FileCreateTransaction()
      .setKeys([client.operatorPublicKey])
      .setContents(aidDataHash)
      .setMaxTransactionFee(100000000);

    const submitTx = await tx.execute(client);
    const receipt = await submitTx.getReceipt(client);
    const fileId = receipt.fileId.toString();

    const log = { beneficiaryId, aidType, location, timestamp, fileId };
    const logs = JSON.parse(fs.readFileSync(logsFile));
    logs.push(log);
    fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2));

    res.json({ success: true, fileId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/logs', (req, res) => {
  const logs = JSON.parse(fs.readFileSync(logsFile));
  res.json(logs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('✅ AidProof TN server running on http://localhost:' + PORT));
`;

fs.writeFileSync('server.js', server);

// ===========================
// 4. .env configuration
// ===========================
const env = `
OPERATOR_ID=0.0.6161057
OPERATOR_KEY=3030020100300706052b8104000a04220420868c3ceb5ad78c912ed59d13b6ee16f0cd16e5815906837ce370bfbf41e4b07d
`;

fs.writeFileSync('.env', env.trim());

console.log("✅ All files generated. Run:\n  npm install express body-parser @hashgraph/sdk dotenv\n  node server.js");
