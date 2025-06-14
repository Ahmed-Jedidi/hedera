
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

    const locationFilter = document.getElementById('filterLocation').value.toLowerCase();
    const dateFilter = document.getElementById('filterDate').value;
    const aidTypeFilter = document.getElementById('filterAidType').value.toLowerCase();
    const beneficiaryFilter = document.getElementById('filterBeneficiary')?.value.toLowerCase() || '';


    const filtered = logs.filter(log => {
      const locationMatch = !locationFilter || log.location.toLowerCase().includes(locationFilter);
      const dateMatch = !dateFilter || log.timestamp.startsWith(dateFilter);
      const aidTypeMatch = !aidTypeFilter || log.aidType.toLowerCase().includes(aidTypeFilter);
      const matchBeneficiary = !beneficiaryFilter || log.beneficiaryId.toLowerCase().includes(beneficiaryFilter);
      return locationMatch && dateMatch && aidTypeMatch && matchBeneficiary;
    });

    const list = document.getElementById('logsList');
    /*if (!list) return;*/

    list.innerHTML = '';
    /*logs.forEach(log => {
      const li = document.createElement('li');
      li.textContent = `${log.timestamp} - ${log.aidType} aid to ${log.beneficiaryId} in ${log.location} (File ID: ${log.fileId})`;
      list.appendChild(li);
    });

    if (logs.length === 0) {
      list.innerHTML = '<li>No aid logs available yet.</li>';
    }*/
       if (filtered.length === 0) {
      list.innerHTML = '<li>No logs match the filters.</li>';
    } else {
      filtered.forEach(log => {
      const li = document.createElement('li');
      li.textContent = `${log.timestamp} - ${log.aidType} aid to ${log.beneficiaryId} in ${log.location} (File ID: ${log.fileId})`;
      list.appendChild(li);
      });
    }
  } catch (error) {
    console.error('Failed to load logs:', error);
    const list = document.getElementById('logsList');
    if (list) list.innerHTML = '<li>Error fetching logs.</li>';
  }
}

function exportCSV() {
  fetch('/logs')
    .then(res => res.json())
    .then(data => {
      const csv = [
        ['Beneficiary ID', 'Aid Type', 'Location', 'Timestamp', 'File ID'],
        ...data.map(row => [row.beneficiaryId, row.aidType, row.location, row.timestamp, row.fileId])
      ].map(e => e.join(',')).join('\\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aid_logs.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });
}

window.onload = loadLogs;
