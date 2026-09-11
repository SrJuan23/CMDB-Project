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
  console.log('--- Testing API through Vite proxy on 5174 ---');
  const login = await apiRequest(5174, 'POST', '/api/auth/login', { email: 'admin@ttech.com', password: 'Admin123!*' });
  console.log('Login 5174:', login.status);
  if (login.status !== 200) { console.log('Error:', JSON.stringify(login.data)); return; }
  const token = login.data.token;

  const activos = await apiRequest(5174, 'GET', '/api/activos', null, token);
  console.log('Activos 5174:', activos.status, 'Total:', activos.data.total || 'N/A');

  const clientes = await apiRequest(5174, 'GET', '/api/clientes', null, token);
  console.log('Clientes 5174:', clientes.status, 'Count:', clientes.data.length || 'N/A');

  const dash = await apiRequest(5174, 'GET', '/api/dashboard/stats', null, token);
  console.log('Dashboard 5174:', dash.status);

  console.log('\n--- Testing API directly on 5000 ---');
  const login2 = await apiRequest(5000, 'POST', '/api/auth/login', { email: 'admin@ttech.com', password: 'Admin123!*' });
  console.log('Login 5000:', login2.status);
  const token2 = login2.data.token;
  const clientes2 = await apiRequest(5000, 'GET', '/api/clientes', null, token2);
  console.log('Clientes 5000:', clientes2.status, 'Count:', clientes2.data.length || 'N/A');
}
test().catch(console.error);