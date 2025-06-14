
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
