const net = require('net');

function findPID(port) {
  return new Promise((resolve) => {
    try {
      const { execSync } = require('child_process');
      // Try to find process using the port
      try {
        const result = execSync(`powershell -Command "Get-NetTCPConnection -LocalPort ${port} | Select-Object OwningProcess"`, { encoding: 'utf8' });
        const match = result.match(/(\d+)/);
        if (match && match[1]) {
          resolve(match[1]);
          return;
        }
      } catch(e) {}
      
      // Try alternative
      try {
        const result = execSync(`tasklist /FI "SERVICES eq >?" 2>/dev/null`, { encoding: 'utf8' });
        resolve(null);
      } catch(e) {
        resolve(null);
      }
    } catch(e) {
      resolve(null);
    }
  });
}

async function main() {
  const pid = await findPID(5173);
  console.log('PID on 5173:', pid);
  
  if (pid) {
    try {
      require('child_process').execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit' });
      console.log('Killed process', pid);
    } catch(e) {
      console.log('Failed to kill', pid, e.message);
    }
  }
}
main();