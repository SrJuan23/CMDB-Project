const http = require('http');

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
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
  const login = await apiRequest('POST', '/api/auth/login', { email: 'admin@ttech.com', password: 'Admin123!*' });
  console.log('Login:', login.status);
  const token = login.data.token;
  console.log('Token starts:', token.substring(0, 30));

  const activos = await apiRequest('GET', '/api/activos', null, token);
  console.log('\nActivos:', activos.status);
  console.log('Keys:', Object.keys(activos.data));
  console.log('Total:', activos.data.total);
  console.log('Data length:', activos.data.data.length);
  if (activos.data.counts) {
    console.log('Counts:', JSON.stringify(activos.data.counts));
  } else {
    console.log('NO COUNTS FIELD');
  }
  const first = activos.data.data[0];
  if (first) {
    console.log('First item keys:', Object.keys(first));
    console.log('Has lider_nombre:', 'lider_nombre' in first);
    console.log('Has vigencia:', 'vigencia' in first);
    console.log('Has dias_restantes:', 'dias_restantes' in first);
  }

  const clientes = await apiRequest('GET', '/api/clientes', null, token);
  console.log('\nClientes:', clientes.status, 'count:', clientes.data.length);

  const plataformas = await apiRequest('GET', '/api/plataformas', null, token);
  console.log('Plataformas:', plataformas.status, 'count:', plataformas.data.length);

  const dash = await apiRequest('GET', '/api/dashboard/stats', null, token);
  console.log('\nDashboard:', dash.status);
  console.log('Dashboard keys:', Object.keys(dash.data));
  if (dash.data.kpis) console.log('KPIs:', JSON.stringify(dash.data.kpis));
}

test().catch(console.error);