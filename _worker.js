// BPB-CF-Pages & VLESS Core Engine for MM-TH PREMIUM
import { connect } from 'cloudflare:sockets';

const UUID = 'b67db792-7ec0-449d-b4b6-079d86a4e21a';

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const hostName = url.hostname;
      const upgradeHeader = request.headers.get('Upgrade');

      // 1. Handling VLESS WebSocket Traffic (Core Connection)
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
          `vless://${UUID}@${hostName}:443?encryption=none&security=tls&sni=ais.online.game.th&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#Ais online 20ms`,
          `vless://${UUID}@${hostName}:443?encryption=none&security=tls&sni=true.move.h.th&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#True online 30ms`
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
  const log = (info, sep) => { console.log(`[VLESS] ${info}${sep || ''}`); };

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
      log(error.toString());
    }
  });

  return new Response(null, { status: 101, webSocket: client });
}

function processVlessHeader(buffer) {
  if (buffer.byteLength < 24) return null;
  const version = new Uint8Array(buffer.slice(0, 1));
  const id = new Uint8Array(buffer.slice(1, 17));
  const optLength = new Uint8Array(buffer.slice(17, 18))[0];
  const cmd = new Uint8Array(buffer.slice(18 + optLength, 19 + optLength))[0];
  if (cmd !== 1) return null; 
  
  const port = new DataView(buffer.slice(19 + optLength, 21 + optLength)).getUint16(0);
  const addressType = new Uint8Array(buffer.slice(21 + optLength, 22 + optLength))[0];
  let address = "";
  let addressLength = 0;
  let addressBeginIndex = 22 + optLength;

  if (addressType === 1) {
    address = new Uint8Array(buffer.slice(addressBeginIndex, addressBeginIndex + 4)).join('.');
  } else if (addressType === 2) {
    addressLength = new Uint8Array(buffer.slice(addressBeginIndex, addressBeginIndex + 1))[0];
    addressBeginIndex += 1;
    address = new TextDecoder().decode(buffer.slice(addressBeginIndex, addressBeginIndex + addressLength));
  }
  return { address, port };
}

async function handleClientToTcp(ws, tcp) {
  // Logic to pipe data from WS to TCP socket
}
async function handleTcpToClient(tcp, ws) {
  // Logic to pipe data from TCP socket to WS
}

function getAdminHTML(hostName) {
  return `<html><body style="background:#121212;color:#00ffcc;font-family:sans-serif;padding:30px;text-align:center;">
    <h2 style="color:#00ffcc;">MM-TH PREMIUM Dashboard</h2>
    <hr style="border:1px solid #333;">
    <p style="color:#aaa;">Host: ${hostName}</p>
    <p style="color:#aaa;">Sub Link: https://${hostName}/sub</p>
    <div style="margin-top:20px;text-align:left;display:inline-block;width:90%;">
      <label style="color:#fff;">AIS Config:</label>
      <textarea style="width:100%;height:80px;background:#222;color:#fff;border:1px solid #444;padding:5px;" readonly>vless://${UUID}@${hostName}:443?encryption=none&security=tls&sni=ais.online.game.th&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#Ais online 20ms</textarea>
      <br><br>
      <label style="color:#fff;">TRUE Config:</label>
      <textarea style="width:100%;height:80px;background:#222;color:#fff;border:1px solid #444;padding:5px;" readonly>vless://${UUID}@${hostName}:443?encryption=none&security=tls&sni=true.move.h.th&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#True online 30ms</textarea>
    </div>
  </body></html>`;
}
