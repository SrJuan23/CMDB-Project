const http = require('http');

function checkModule(port, path) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: port, path: path }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        resolve({ path, status: res.statusCode, len: d.length, hasTransformError: d.includes('TransformError') || d.includes('Internal Server Error') });
      });
    });
    req.on('error', e => resolve({ path, status: 0, error: e.message }));
    req.end();
  });
}

async function main() {
  const modules = [
    '/src/main.ts',
    '/src/components/Sidebar.ts',
    '/src/components/Navbar.ts',
    '/src/components/DashboardView.ts',
    '/src/components/ActivosView.ts',
    '/src/components/ClientesView.ts',
    '/src/components/PlataformasView.ts',
    '/src/components/PersonasView.ts',
    '/src/components/HistorialView.ts',
    '/src/components/ConfiguracionView.ts',
    '/src/components/ReportesView.ts',
    '/src/services/api.ts',
  ];
  const results = await Promise.all(modules.map(m => checkModule(5173, m)));
  for (const r of results) {
    const status = r.status === 200 ? 'OK' : 'FAIL';
    const err = r.hasTransformError ? ' TRANSFORM ERROR' : '';
    console.log(`${status} ${r.path} (${r.len || 0} bytes)${err}`);
  }
}
main();