export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostName = url.hostname;

    const USER_UUID = "b67db792-7ec0-449d-b4b6-079d86a4e21a"; 
    const BUG_HOST_AIS = "ais.online.game.th";
    const BUG_HOST_TRUE = "true.move.h.th";

    // ၁။ Admin Dashboard Panel (/panel)
    if (url.pathname === '/panel') {
      return new Response(renderAdminPanel(hostName, USER_UUID, BUG_HOST_AIS, BUG_HOST_TRUE), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ၂။ Subscription Link API (/sub)
    if (url.pathname === '/sub') {
      const vlessAis = `vless://${USER_UUID}@${hostName}:443?encryption=none&security=tls&sni=${BUG_HOST_AIS}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#Ais online 20ms`;
      const vlessTrue = `vless://${USER_UUID}@${hostName}:443?encryption=none&security=tls&sni=${BUG_HOST_TRUE}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#True online 30ms`;
      
      const totalConfig = `${vlessAis}\n${vlessTrue}`;
      return new Response(btoa(totalConfig), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // ၃။ Base Route (404 မပြအောင် Landing Page တစ်ခါတည်း ပြထားပါမည်)
    return new Response(renderLandingPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

function renderAdminPanel(host, uuid, aisBug, trueBug) {
  const vless1 = `vless://${uuid}@${host}:443?encryption=none&security=tls&sni=${aisBug}&fp=randomized&type=ws&host=${host}&path=%2F%3Fed%3D2048#Ais online 20ms`;
  const vless2 = `vless://${uuid}@${host}:443?encryption=none&security=tls&sni=${trueBug}&fp=randomized&type=ws&host=${host}&path=%2F%3Fed%3D2048#True online 30ms`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MM-TH PREMIUM Admin</title>
    <style>
      body { font-family: sans-serif; background-color: #121212; color: #e0e0e0; padding: 20px; text-align: center; }
      .card { max-width: 500px; margin: auto; background: #1e1e1e; border-radius: 8px; padding: 20px; border: 1px solid #333; }
      h2 { color: #00ffcc; }
      .info { background: #2d2d2d; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 13px; word-break: break-all; text-align: left; }
      .btn { width: 100%; background: #00ffcc; color: #121212; padding: 10px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 5px; }
      textarea { width: 100%; height: 60px; background: #252525; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 5px; resize: none; box-sizing: border-box; font-size: 11px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>MM-TH PREMIUM Dashboard</h2>
      <div class="info"><strong>Host:</strong> ${host}</div>
      <div class="info"><strong>Sub Link:</strong> https://${host}/sub</div>
      <hr style="border: 0.5px solid #333;">
      <p style="text-align:left; color:#aaa; font-size:12px;">AIS Config:</p>
      <textarea readonly id="vlessAis">${vless1}</textarea>
      <button class="btn" onclick="copyText('vlessAis')">AIS Copy</button>
      <p style="text-align:left; color:#aaa; font-size:12px;">TRUE Config:</p>
      <textarea readonly id="vlessTrue">${vless2}</textarea>
      <button class="btn" onclick="copyText('vlessTrue')">TRUE Copy</button>
    </div>
    <script>
      function copyText(id) {
        var tc = document.getElementById(id);
        tc.select();
        navigator.clipboard.writeText(tc.value);
        alert("Copied!");
      }
    </script>
  </body>
  </html>
  `;
}

function renderLandingPage() {
  return `<h1>MM-TH PREMIUM Server is Running</h1><p>Use <a href="/panel">/panel</a> for admin dashboard.</p>`;
}
