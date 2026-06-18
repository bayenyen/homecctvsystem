const net = require('net');
const subnet = '192.168.1.';
const ports = [80, 554, 8554, 8800, 8000, 8080, 5000, 5001, 8090, 9000];
const timeout = 1000;
const hosts = ['192.168.1.2','192.168.1.3','192.168.1.4','192.168.1.6','192.168.1.10','192.168.1.12','192.168.1.13','192.168.1.14','192.168.1.15'];

const tryPort = (host, port) => new Promise((resolve) => {
  const s = new net.Socket();
  let done = false;

  const finish = (ok) => {
    if (done) return;
    done = true;
    s.destroy();
    resolve({ host, port, ok });
  };

  s.setTimeout(timeout);
  s.on('connect', () => finish(true));
  s.on('timeout', () => finish(false));
  s.on('error', () => finish(false));
  s.on('close', () => finish(false));
  s.connect(port, host);
});

(async () => {
  const checks = hosts.flatMap((host) => ports.map((port) => tryPort(host, port)));
  const results = await Promise.all(checks);
  for (const result of results) {
    console.log(`${result.host}:${result.port} -> ${result.ok ? 'OPEN' : 'closed'}`);
  }
  console.log('done');
})();
