// Edgetunnel for Cloudflare Pages v2026 - Production Dedicated Core
// Package Optimized for: NetMod, v2rayNG, HTTP Injector (Fixes TLS Curve preferences)

const userID = 'b67db792-7ec0-449d-b4b6-079d86a4e21a'; 
const proxyIPs = ['104.18.2.1', '104.18.3.1', 'anycast.cloudflare.com'];
let proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];

export default {
  async fetch(request, env) {
    try {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader === 'websocket') {
        return await vlessOverWSHandler(request);
      }

      const url = new URL(request.url);
      const hostName = url.hostname;

      if (url.pathname === '/panel') {
        return new Response(getAdminHTML(hostName), {
          headers: { 'Content-Type': 'text/html;charset=utf-8' }
        });
      }

      if (url.pathname === '/sub') {
        // Automatically injects 'fp=chrome' to bypass Xray-Core v25+ Unsupported Curve Bug
        const rawConfigs = [
          `vless://${userID}@${hostName}:443?encryption=none&flow=none&type=ws&host=${hostName}&headerType=none&path=%2F%3Fed%3D2048&security=tls&fp=chrome&sni=${hostName}#Ais online 20ms`
        ].join('\n');
        return new Response(btoa(rawConfigs), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      }

      return new Response('Edgetunnel Pages Core Active.', { status: 200 });
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
        if (cmd !== 1) return; // Only Allow TCP Connect

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
          server.close(1006, "Sockets integration missing");
          return;
        }

        // Routing via Edgetunnel Logic (Target Endpoint)
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
    <title>Edgetunnel Pages Panel</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { background: #0f172a; color: #38bdf8; font-family: monospace; padding: 20px; text-align: center; }
      h2 { color: #38bdf8; margin-bottom: 5px; }
      .box { background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; margin-top: 20px; text-align: left; word-break: break-all; }
      textarea { width: 100%; height: 80px; background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 8px; border-radius: 4px; resize: none; font-family: monospace; font-size: 12px; }
    </style>
  </head>
  <body>
    <h2>MM-TH PREMIUM</h2>
    <p style="color: #64748b; margin: 0;">Edgetunnel Powered VLESS Engine</p>
    <div class="box">
      <div style="color: #94a3b8; font-size: 13px; margin-bottom: 8px;">VLESS WS TLS Configuration:</div>
      <textarea readonly>${configStr}</textarea>
    </div>
  </body>
  </html>`;
  }

