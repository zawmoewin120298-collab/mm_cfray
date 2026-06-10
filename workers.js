// ==========================================
// MM-TH PREMIUM - BPB CLOUDFLARE PAGES CORE
// ==========================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostName = url.hostname;

    // ပြင်ဆင်ရန် - မိမိ၏ စိတ်ကြိုက် UUID နှင့် သုံးမည့် Bug Host များ
    const USER_UUID = "b67db792-7ec0-449d-b4b6-079d86a4e21a"; 
    const BUG_HOST_AIS = "ais.online.game.th";
    const BUG_HOST_TRUE = "true.move.h.th";

    // ၁။ Admin Dashboard Panel (/panel)
    if (url.pathname === '/panel') {
      return new Response(renderAdminPanel(hostName, USER_UUID, BUG_HOST_AIS, BUG_HOST_TRUE), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ၂။ Subscription Link API (/sub) - App ထဲ တိုက်ရိုက်ချိတ်သုံးရန်
    if (url.pathname === '/sub') {
      const vlessAis = `vless://${USER_UUID}@${hostName}:443?encryption=none&security=tls&sni=${BUG_HOST_AIS}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#Ais Online 20ms`;
      const vlessTrue = `vless://${USER_UUID}@${hostName}:443?encryption=none&security=tls&sni=${BUG_HOST_TRUE}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#True Online 30ms`;
      
      // Base64 Format ဖြင့် Output ထုတ်ပေးခြင်း
      const totalConfig = `${vlessAis}\n${vlessTrue}`;
      return new Response(btoa(totalConfig), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // ၃။ ပုံမှန် Landing Page (Website Link ကို လာကြည့်ရင် ပြမယ့်နေရာ)
    return new Response(renderLandingPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

// ==========================================
// HTML UI COMPONENTS (ADMIN PANEL & LANDING)
// ==========================================

function renderAdminPanel(host, uuid, aisBug, trueBug) {
  const vless1 = `vless://${uuid}@${host}:443?encryption=none&security=tls&sni=${aisBug}&fp=randomized&type=ws&host=${host}&path=%2F%3Fed%3D2048#Ais Online 20ms`;
  const vless2 = `vless://${uuid}@${host}:443?encryption=none&security=tls&sni=${trueBug}&fp=randomized&type=ws&host=${host}&path=%2F%3Fed%3D2048#True Online 30ms`;

  return `
  <!DOCTYPE html>
  <html lang="my">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MM-TH PREMIUM Admin</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #121212; color: #e0e0e0; padding: 20px; margin: 0; }
      .card { max-width: 650px; margin: 30px auto; background: #1e1e1e; border-radius: 12px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 1px solid #333; }
      h2 { color: #00ffcc; text-align: center; margin-bottom: 20px; }
      .info-box { background: #2d2d2d; padding: 12px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; word-break: break-all; border-left: 4px solid #00ffcc; }
      .btn { display: block; width: 100%; background: #00ffcc; color: #121212; padding: 12px; border: none; border-radius: 6px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 10px; transition: 0.3s; }
      .btn:hover { background: #00b399; }
      textarea { width: 100%; height: 80px; background: #252525; color: #fff; border: 1px solid #444; border-radius: 6px; padding: 10px; resize: none; box-sizing: border-box; font-size: 12px; }
      label { font-size: 14px; font-weight: bold; color: #aaa; display: block; margin: 10px 0 5px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>MM-TH PREMIUM Dashboard</h2>
      <div class="info-box"><strong>Server Host:</strong> ${host}</div>
      <div class="info-box"><strong>UUID:</strong> ${uuid}</div>
      <div class="info-box"><strong>Sub Link:</strong> https://${host}/sub</div>
      
      <hr style="border: 0.5px solid #333; margin: 20px 0;">
      
      <label>AIS VLESS Config:</label>
      <textarea readonly id="vlessAis">${vless1}</textarea>
      <button class="btn" onclick="copyText('vlessAis')">AIS Config ကို ကူးယူမည်</button>

      <label>TRUE VLESS Config:</label>
      <textarea readonly id="vlessTrue">${vless2}</textarea>
      <button class="btn" onclick="copyText('vlessTrue')">TRUE Config ကို ကူးယူမည်</button>
    </div>

    <script>
      function copyText(id) {
        var copyText = document.getElementById(id);
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(copyText.value);
        alert("Config ကို Copy ကူးလိုက်ပါပြီဗျာ။");
      }
    </script>
  </body>
  </html>
  `;
}

function renderLandingPage() {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Welcome to MM-TH PREMIUM</title>
    <style>
      body { background: #121212; color: white; text-align: center; font-family: sans-serif; padding-top: 100px; }
      h1 { color: #00ffcc; }
    </style>
  </head>
  <body>
    <h1>MM-TH PREMIUM VPN</h1>
    <p>Server Status: <span style="color: #00ffcc;">Active (Online)</span></p>
  </body>
  </html>
  `;
        }

