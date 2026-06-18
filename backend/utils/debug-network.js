const os = require('os');
const dgram = require('dgram');

const nets = os.networkInterfaces();
console.log('NETWORK INTERFACES:');
Object.entries(nets).forEach(([name, addrs]) => {
  console.log(name, addrs);
});

const SSDP_ADDRESS = '239.255.255.250';
const SSDP_PORT = 1900;
const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
const message = Buffer.from(
  'M-SEARCH * HTTP/1.1\r\n' +
  `HOST: ${SSDP_ADDRESS}:${SSDP_PORT}\r\n` +
  'MAN: "ssdp:discover"\r\n' +
  'MX: 2\r\n' +
  'ST: ssdp:all\r\n' +
  '\r\n'
);

socket.on('error', (err) => {
  console.error('SSDP ERROR', err);
  socket.close();
  process.exit(1);
});
socket.on('message', (msg, rinfo) => {
  console.log('SSDP RESPONSE', rinfo.address, msg.toString());
});

socket.bind(0, () => {
  try { socket.addMembership(SSDP_ADDRESS); } catch (err) { console.error('ADD MEMBERSHIP ERROR', err.message); }
  console.log('SSDP BOUND');
  socket.send(message, 0, message.length, SSDP_PORT, SSDP_ADDRESS, (err) => {
    if (err) console.error('SSDP SEND ERROR', err);
    else console.log('SSDP QUERY SENT');
  });
  setTimeout(() => {
    console.log('SSDP DONE');
    socket.close();
    process.exit(0);
  }, 2500);
});
