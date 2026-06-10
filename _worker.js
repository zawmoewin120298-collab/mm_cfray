// BPB-CF-Pages & VLESS Production Engine (Fixed Timeout)
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

  let tcpSocket = null;

  server.addEventListener('message', async ({ data }) => {
    try {
      if (tcpSocket) {
        // Core Logic: If TCP Socket is open, stream data straight away
        const writer = tcpSocket.writable.getWriter();
        await writer.write(new Uint8Array(data));
        writer.releaseLock();
        return;
      }

      // Parse VLESS Header and create TCP connection
      const vlessBuffer = data;
      const addressInfo = processVlessHeader(vlessBuffer);
      if (!addressInfo) return;

      tcpSocket = connect({ hostname: addressInfo.address, port: addressInfo.port });
      
      // Establishing bidirectional stream data flow between client and target
      handleTcpToClient(tcpSocket, server);

      // Write the first data payload after removing VLESS metadata header
      const writer = tcpSocket.writable.getWriter();
      const payload = new Uint8Array(vlessBuffer.slice(addressInfo.offset));
      await writer.write(payload);
      writer.releaseLock();

    } catch (error) {
      server.close(1006, "Internal Error");
    }
  });

  server.addEventListener('close', () => {
    if (tcpSocket) tcpSocket.close();
  });

  return new Response(null, { status: 101, webSocket: client });
}

function processVlessHeader(buffer) {
  if (buffer.byteLength < 24) return null;
  const view = new DataView(buffer);
  
  // VLESS Structure Check
  const cmd = view.getUint8(18); 
  if (cmd !== 1) return null; // Only allow TCP Connect
  
  const port = view.getUint16(19);
  const addressType = view.getUint8(21);
  let address = "";
  let offset = 22;

  if (addressType === 1) { // IPv4
    address = new Uint8Array(buffer.slice(offset, offset + 4)).join('.');
    offset += 4;
  } else if (addressType === 2) { // Domain Name
    const domainLength = view.getUint8(offset);
    offset += 1;
    address = new TextDecoder().decode(buffer.slice(offset, offset + domainLength));
    offset += domainLength;
  } else if (addressType === 3) { // IPv6
    return null; // Bypass IPv6 for stability
  }

  return { address, port, offset };
}

async function handleTcpToClient(tcpSocket, wsServer) {
  try {
    const reader = tcpSocket.readable.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      wsServer.send(value.buffer);
    }
  } catch (err) {
    wsServer.close(1006, "Connection Closed");
  }
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
      
