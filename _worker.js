// Edgetunnel v2 - Optimized Strictly for Cloudflare Pages (Production Core)
// Fixes Protocol Routing, WebSocket Upgrades & TLS Curve Errors for Xray-Core v25+

const userID = 'b67db792-7ec0-449d-b4b6-079d86a4e21a'; 
const proxyIPs = ['104.18.2.1', '104.18.3.1', 'anycast.cloudflare.com'];
let proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];

export default {
  async fetch(request, env) {
    try {
      const upgradeHeader = request.headers.get('Upgrade');
      const url = new URL(request.url);
      const hostName = url.hostname; // Auto-detects any dynamic subdomain/Pages URL

      // 1. Critical Requirement: Handles VLESS WebSocket Handshake on Cloudflare Pages Engine
      if (upgradeHeader === 'websocket') {
        return await vlessOverWSHandler(request);
      }

      // 2. Web Interface Panel Route
      if (url.pathname === '/panel') {
        return new Response(getAdminHTML(hostName), {
          headers: { 'Content-Type': 'text/html;charset=utf-8' }
        });
      }

      // 3. Raw Subscription Route (Injects uTLS 'chrome' by default to fix Xray Handshake)
      if (url.pathname === '/sub') {
        const rawConfigs = [
          `vless://${userID}@${hostName}:443?encryption=none&flow=none&type=ws&host=${hostName}&headerType=none&path=%2F%3Fed%3D2048&security=tls&fp=chrome&sni=${hostName}#Ais online 20ms`
        ].join('\n');
        return new Response(btoa(rawConfigs), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      }

      return new Response('MM-TH PREMIUM Edgetunnel Core Active on Pages System.', { status: 200 });
    } catch (err) {
      return new Response(err.toString(), { status: 500 });
    }
  }
};

async function vlessOverWSHandler(request) {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();

  let tcpSocket = null;
  let isTunnelReady = false;

  const readableStream = new ReadableStream({
    start(controller) {
      server.addEventListener('message', (e) => controller.enqueue(new Uint8Array(e.data)));
      server.addEventListener('close', () => controller.close());
      server.addEventListener('error', (e) => controller.error(e));
    }
  });

  (async () => {
    try {
      const reader = readableStream.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (isTunnelReady && tcpSocket) {
          const writer = tcpSocket.writable.getWriter();
          await writer.write(value);
          writer.releaseLock();
          continue;
        }

        if (value.byteLength < 24) continue;
        const view = new DataView(value.buffer);
        const cmd = view.getUint8(18);
        if (cmd !== 1) return; 

        const port = view.getUint16(19);
        const addressType = view.getUint8(21);
        let address = "";
        let offset = 22;

        if (addressType === 1) { 
          address = new Uint8Array(value.buffer.slice(offset, offset + 4)).join('.');
          offset += 4;
        } else if (addressType === 2) { 
          const domainLen = view.getUint8(offset);
          offset += 1;
          address = new TextDecoder().decode(value.buffer.slice(offset, offset + domainLen));
          offset += domainLen;
        } else if (addressType === 3) {
          address = [];
          for (let i = 0; i < 8; i++) {
            address.push(view.getUint16(offset).toString(16));
            offset += 2;
          }
          address = address.join(':');
        } else {
          return; 
        }

        const socketConnector = globalThis.connect || globalThis.cloudflare?.sockets?.connect;
        if (!socketConnector) {
          server.close(1006, "Cloudflare Sockets Integration Missing");
          return;
        }

        // Direct Socket Connection to Target Endpoint
        tcpSocket = socketConnector({ hostname: address, port: port });
        isTunnelReady = true;

        const firstPayload = value.slice(offset);
        if (firstPayload.byteLength > 0) {
          const writer = tcpSocket.writable.getWriter();
          await writer.write(firstPayload);
          writer.releaseLock();
        }

        (async () => {
          try {
            const tcpReader = tcpSocket.readable.getReader();
            while (true) {
              const { value: tcpChunk, done: tcpDone } = await tcpReader.read();
              if (tcpDone) break;
              server.send(tcpChunk.buffer);
            }
          } catch (e) {
            server.close();
          }
        })();
      }
    } catch (err) {
      server.close();
    }
  })();

  return new Response(null, { status: 101, webSocket: client });
}

function getAdminHTML(hostName) {
  const configStr = `vless://${userID}@${hostName}:443?encryption=none&flow=none&type=ws&host=${hostName}&headerType=none&path=%2F%3Fed%3D2048&security=tls&fp=chrome&sni=${hostName}#Ais online 20ms`;
  return `<html>
  <head>
    <title>MM-TH PREMIUM - Edgetunnel Pages</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { background: #0b1329; color: #48cae4; font-family: monospace; padding: 25px; text-align: center; }
      h2 { color: #00b4d8; margin-bottom: 5px; }
      .box { background: #1c2541; padding: 15px; border-radius: 8px; border: 1px solid #3a506b; margin-top: 20px; text-align: left; word-break: break-all; }
      textarea { width: 100%; height: 85px; background: #0b1329; color: #edf2f4; border: 1px solid #5c677d; padding: 8px; border-radius: 4px; resize: none; font-family: monospace; font-size: 12px; }
    </style>
  </head>
  <body>
    <h2>MM-TH PREMIUM</h2>
    <p style="color: #5c677d; margin: 0;">Dynamic URL Pages Routing Core</p>
    <div class="box">
      <div style="color: #a3b18a; font-size: 13px; margin-bottom: 8px;">Your VLESS WS TLS Config:</div>
      <textarea readonly>${configStr}</textarea>
    </div>
  </body>
  </html>`;
  }

