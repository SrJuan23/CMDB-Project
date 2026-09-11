const http = require('http');

function apiRequest(port, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(chunks) });
        } catch(e) {
          resolve({ status: res.statusCode, data: chunks });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function test() {
  console.log('=== Testing full flow on ports ===');
  
  // Test login through Vite proxy (5173)
  console.log('\n--- Login through 5173 ---');
  const login = await apiRequest(5173, 'POST', '/api/auth/login', { email: 'admin@ttech.com', password: 'Admin123!*' });
  console.log('Login:', login.status);
  if (login.status !== 200) { console.log('FAIL:', JSON.stringify(login.data)); return; }
  const token = login.data.token;
  console.log('Token OK:', token.substring(0, 20) + '...');
  
  // Test each endpoint through proxy
  const endpoints = [
    '/api/activos',
    '/api/activos/1',
    '/api/clientes',
    '/api/clientes/1/360',
    '/api/plataformas',
    '/api/plataformas/1/activos',
    '/api/personas',
    '/api/dashboard/stats',
    '/api/historial',
    '/api/config'
  ];
  
  let allOK = true;
  for (const ep of endpoints) {
    const r = await apiRequest(5173, 'GET', ep, null, token);
    const ok = r.status === 200;
    if (!ok) allOK = false;
    console.log(`${ok ? '✓' : '✗'} ${ep}: ${r.status}`);
    if (!ok) console.log('  Error:', JSON.stringify(r.data).substring(0, 100));
  }
  
  console.log('\n=== All endpoints:', allOK ? 'PASS' : 'FAIL', '===');
  
  // Also test direct on 5000
  console.log('\n--- Direct login on 5000 ---');
  const login2 = await apiRequest(5000, 'POST', '/api/auth/login', { email: 'admin@ttech.com', password: 'Admin123!*' });
  console.log('Login 5000:', login2.status);
  const token2 = login2.data.token;
  
  for (const ep of endpoints) {
    const r = await apiRequest(5000, 'GET', ep, null, token2);
    const ok = r.status === 200;
    console.log(`${ok ? '✓' : '✗'} ${ep}: ${r.status}`);
  }
}
test().catch(console.error);