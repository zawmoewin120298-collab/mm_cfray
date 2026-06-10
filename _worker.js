// Cloudflare Pages Dedicated VLESS Engine - Production Core
const UUID = 'b67db792-7ec0-449d-b4b6-079d86a4e21a';

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
        const rawConfigs = [`vless://${UUID}@${hostName}:443?encryption=none&flow=none&type=ws&host=${hostName}&headerType=none&path=%2F%3Fed%3D2048&security=tls&fp=randomized&sni=${hostName}#Ais online 20ms`].join('\n');
        return new Response(btoa(rawConfigs), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      }

      return new Response('MM-TH PREMIUM Pages Core Active.', { status: 200 });
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
        } else {
          return; 
        }

        const socketConnector = globalThis.connect || globalThis.cloudflare?.sockets?.connect;
        if (!socketConnector) {
          server.close(1006, "Sockets Integration Missing");
          return;
        }

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
  return `<html><body style="background:#121212;color:#00ffcc;font-family:sans-serif;padding:30px;text-align:center;">
    <h2 style="color:#00ffcc;">MM-TH PREMIUM Pages Panel</h2>
    <hr style="border:1px solid #333;">
    <p style="color:#aaa;">Host Domain: ${hostName}</p>
    <div style="margin-top:20px;text-align:left;display:inline-block;width:90%;">
      <textarea style="width:100%;height:90px;background:#222;color:#fff;border:1px solid #444;padding:5px;" readonly>vless://${UUID}@${hostName}:443?encryption=none&flow=none&type=ws&host=${hostName}&headerType=none&path=%2F%3Fed%3D2048&security=tls&fp=randomized&sni=${hostName}#Ais online 20ms</textarea>
    </div>
  </body></html>`;
      }

