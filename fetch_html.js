const http = require('http');
const req = http.request({ hostname: 'localhost', port: 5173, path: '/' }, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(d.substring(0, 500)));
});
req.on('error', e => console.error(e.message));
req.end();