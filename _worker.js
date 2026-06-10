// BPB-CF-Pages & VLESS Production Engine (Fixed Internet Flow)
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
        // If TCP Connection is active, pump data into it
        const writer = tcpSocket.writable.getWriter();
        await writer.write(new Uint8Array(data));
        writer.releaseLock();
        return;
      }

      // First packet contains VLESS metadata header
      const vlessBuffer = data;
      const addressInfo = processVlessHeader(vlessBuffer);
      if (!addressInfo) return;

      // Connect to upstream proxy/website target
      tcpSocket = connect({ hostname: addressInfo.address, port: addressInfo.port });
      
      // Establish reverse pipeline stream (Target TCP -> Client WebSocket)
      handleTcpToClient(tcpSocket, server);

      // Write the remaining data payload after cutting header metadata
      const writer = tcpSocket.writable.getWriter();
      const payload = new Uint8Array(vlessBuffer.slice(addressInfo.offset));
      await writer.write(payload);
      writer.releaseLock();

    } catch (error) {
      server.close(1006, "Tunnel Connection Error");
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
  
  const cmd = view.getUint8(18); 
  if (cmd !== 1) return null; // 1 = TCP Connect
  
  const port = view.getUint16(19);
  const addressType = view.getUint8(21);
  let address = "";
  let offset = 22;

  if (addressType === 1) { // IPv4 Address
    address = new Uint8Array(buffer.slice(offset, offset + 4)).join('.');
    offset += 4;
  } else if (addressType === 2) { // Domain Name String
    const domainLength = view.getUint8(offset);
    offset += 1;
    address = new TextDecoder().decode(buffer.slice(offset, offset + domainLength));
    offset += domainLength;
  } else {
    return null; // Ignore IPv6 for stability rules
  }

  return { address, port, offset };
}

// Fixed Data Handler Logic: Streams binary chunks flawlessly back to NetMod client
async function handleTcpToClient(tcpSocket, wsServer) {
  try {
    const reader = tcpSocket.readable.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      // Wrap ArrayBuffer into raw frame stream
      wsServer.send(value.buffer);
    }
  } catch (err) {
    wsServer.close(1006, "Stream Ended");
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
    </div>
  </body></html>`;
  }

