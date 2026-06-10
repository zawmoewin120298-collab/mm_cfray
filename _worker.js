// BPB-CF-Pages & VLESS Core Engine - Custom Host/SNI Edition
import { connect } from 'cloudflare:sockets';

const UUID = 'b67db792-7ec0-449d-b4b6-079d86a4e21a';

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const hostName = url.hostname;
      const upgradeHeader = request.headers.get('Upgrade');

      // 1. Handling VLESS WebSocket Traffic
      if (upgradeHeader === 'websocket') {
        return await vlessOverWSHandler(request);
      }

      // 2. Handling Admin Panel Web Interface
      if (url.pathname === '/panel') {
        return new Response(getAdminHTML(hostName), {
          headers: { 'Content-Type': 'text/html;charset=utf-8' }
        });
      }

      // 3. Handling Subscription Links
      if (url.pathname === '/sub') {
        const rawConfigs = [
          `vless://${UUID}@${hostName}:443?encryption=none&flow=none&type=ws&host=${hostName}&headerType=none&path=%2F%3Fed%3D2048&security=tls&fp=randomized&sni=${hostName}#Ais online 20ms`,
          `vless://${UUID}@${hostName}:443?encryption=none&flow=none&type=ws&host=${hostName}&headerType=none&path=%2F%3Fed%3D2048&security=tls&fp=randomized&sni=${hostName}#True online 30ms`
        ].join('\n');
        return new Response(btoa(rawConfigs), {
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
      }

      return new Response('MM-TH PREMIUM Service is Active.', { status: 200 });
    } catch (err) {
      return new Response(err.toString(), { status: 500 });
    }
  }
};

async function vlessOverWSHandler(request) {
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);
  server.accept();

  let address = '';
  let portWithRandomLog = '';

  server.addEventListener('message', async ({ data }) => {
    try {
      const vlessBuffer = data;
      const addressInfo = processVlessHeader(vlessBuffer);
      if (!addressInfo) return;
      
      address = addressInfo.address;
      portWithRandomLog = addressInfo.port;

      const tcpSocket = connect({ hostname: address, port: portWithRandomLog });
      await Promise.all([
        handleClientToTcp(server, tcpSocket),
        handleTcpToClient(tcpSocket, server)
      ]);
    } catch (error) {
      console.log(error.toString());
    }
  });

  return new Response(null, { status: 101, webSocket: client });
}

function processVlessHeader(buffer) {
  if (buffer.byteLength < 24) return null;
  const cmd = new Uint8Array(buffer.slice(18, 19))[0];
  if (cmd !== 1) return null; 
  
  const port = new DataView(buffer.slice(19, 21)).getUint16(0);
  const addressType = new Uint8Array(buffer.slice(21, 22))[0];
  let address = "";
  let addressBeginIndex = 22;

  if (addressType === 1) {
    address = new Uint8Array(buffer.slice(addressBeginIndex, addressBeginIndex + 4)).join('.');
  } else if (addressType === 2) {
    const addressLength = new Uint8Array(buffer.slice(addressBeginIndex, addressBeginIndex + 1))[0];
    addressBeginIndex += 1;
    address = new TextDecoder().decode(buffer.slice(addressBeginIndex, addressBeginIndex + addressLength));
  }
  return { address, port };
}

async function handleClientToTcp(ws, tcp) {
  // Transfer logic
}
async function handleTcpToClient(tcp, ws) {
  // Transfer logic
}

function getAdminHTML(hostName) {
  return `<html><body style="background:#121212;color:#00ffcc;font-family:sans-serif;padding:30px;text-align:center;">
    <h2 style="color:#00ffcc;">MM-TH PREMIUM Dashboard</h2>
    <hr style="border:1px solid #333;">
    <p style="color:#aaa;">Host: ${hostName}</p>
    <p style="color:#aaa;">Sub Link: https://${hostName}/sub</p>
    <div style="margin-top:20px;text-align:left;display:inline-block;width:90%;">
      <label style="color:#fff;">AIS Config:</label>
      <textarea style="width:100%;height:90px;background:#222;color:#fff;border:1px solid #444;padding:5px;" readonly>vless://${UUID}@${hostName}:443?encryption=none&flow=none&type=ws&host=${hostName}&headerType=none&path=%2F%3Fed%3D2048&security=tls&fp=randomized&sni=${hostName}#Ais online 20ms</textarea>
      <br><br>
      <label style="color:#fff;">TRUE Config:</label>
      <textarea style="width:100%;height:90px;background:#222;color:#fff;border:1px solid #444;padding:5px;" readonly>vless://${UUID}@${hostName}:443?encryption=none&flow=none&type=ws&host=${hostName}&headerType=none&path=%2F%3Fed%3D2048&security=tls&fp=randomized&sni=${hostName}#True online 30ms</textarea>
    </div>
  </body></html>`;
    }

