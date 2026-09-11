const http = require('http');

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: port, path: '/', headers: { 'Accept': 'text/html' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        resolve({ port, status: res.statusCode, len: d.length, hasVite: d.includes('vite'), hasApp: d.includes('id="app"') });
      });
    });
    req.on('error', e => resolve({ port, status: 0, error: e.message }));
    req.end();
  });
}

async function main() {
  const r5173 = await checkPort(5173);
  const r5174 = await checkPort(5174);
  console.log('Port 5173:', JSON.stringify(r5173));
  console.log('Port 5174:', JSON.stringify(r5174));
}
main();