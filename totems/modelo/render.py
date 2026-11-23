"""Renders PNG del tótem con three.js (Chromium headless).
Uso: python3 totems/modelo/render.py [nombre_pieza]"""
import subprocess, sys, pathlib, http.server, threading, functools, yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]
CFG = yaml.safe_load(open(ROOT / "config" / "totem_ajolote.yaml", encoding="utf-8"))
name = sys.argv[1] if len(sys.argv) > 1 else CFG["nombre_pieza"]
out = ROOT / "salida" / name / "render"
out.mkdir(parents=True, exist_ok=True)

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
Handler.log_message = lambda *a, **k: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
port = srv.server_address[1]

js = r"""
const { chromium } = require('playwright');
(async () => {
  const [port, name, out] = process.argv.slice(1);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [view, w, h, s] of [['frente', 1100, 1100, 2], ['tres_cuartos', 1100, 1100, 2], ['lado', 900, 1100, 2], ['espalda', 1100, 1100, 2], ['explosion', 1300, 1100, 2], ['frente_qr', 1600, 1600, 1]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: s });
    p.on('pageerror', e => console.error('pageerror', e.message));
    await p.goto(`http://127.0.0.1:${port}/modelo/render.html?dir=../salida/${name}&view=${view}&w=${w}&h=${h}`);
    await p.waitForFunction('window.__done === true', null, { timeout: 180000 });
    await p.screenshot({ path: `${out}/${view}.png` });
    console.log('ok', view);
  }
  await b.close();
})();
"""
subprocess.run(["node", "-e", js, str(port), name, str(out)], check=True)
srv.shutdown()
