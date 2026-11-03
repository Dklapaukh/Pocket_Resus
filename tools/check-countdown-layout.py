#!/usr/bin/env python3
"""A4 real-browser check: countdown digits must not overlap "+ Previous shock", the cycle title, ROSC,
Start / Rhythm check buttons or the caption, and must sit inside the dial, at many phone sizes and in the
ready / running / rhythm-check-due states. Also prints the digit size so before/after can be compared.

Run (needs Python + Playwright + Chromium; none are part of the app):
    python3 tools/check-countdown-layout.py
Exit code 0 = no problems, 1 = at least one overlap.
"""
import sys, threading, functools, http.server, socketserver, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass
handler = functools.partial(Quiet, directory=str(ROOT))
srv = socketserver.TCPServer(("127.0.0.1", 0), handler)
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PORT}/index.html"
CSS = ""
sizes=[(360,800),(412,915),(393,851),(360,740),(412,732),(360,680),(360,640),(360,600),(320,568),(360,500)]
JS="""()=>{const q=s=>document.querySelector(s);const c=q('#cycleClock');const rg=document.createRange();rg.selectNodeContents(c);const tr=rg.getBoundingClientRect();const lb=c.getBoundingClientRect();const g={left:tr.left,right:tr.right,top:lb.top,bottom:lb.bottom};
const vis=e=>e&&!e.hidden&&e.offsetParent!==null;
const names={prev:'.previous-shock',head:'.cycle-heading',rosc:'#unexpectedRosc',start:'#startCycle',rhythm:'#rhythmCheck',pause:'#pauseCycle'};
const hit=[];for(const [n,s] of Object.entries(names)){const e=q(s);if(!vis(e))continue;const r=e.getBoundingClientRect();if(g.left<r.right-.5&&g.right>r.left+.5&&g.top<r.bottom-.5&&g.bottom>r.top+.5)hit.push(n)}
const cp=q('#cycleCaption').getBoundingClientRect();for(const [n,sel] of [['start','#startCycle'],['rhythm','#rhythmCheck']]){const e=q(sel);if(!vis(e))continue;const r=e.getBoundingClientRect();if(cp.left<r.right&&cp.right>r.left&&cp.top<r.bottom-.5&&cp.bottom>r.top+.5)hit.push('caption~'+n)}
if(g.bottom>cp.top+1)hit.push('digits~caption');
const d=q('.cycle-dial').getBoundingClientRect();const inside=g.left>=d.left&&g.right<=d.right&&g.top>=d.top-1&&g.bottom<=d.bottom+1;
return {fs:parseFloat(getComputedStyle(c).fontSize),hit,inside,state:q('#timerPanel').className.replace('timer-panel','').trim()}}"""
bad=0
with sync_playwright() as p:
    b=p.chromium.launch()
    for large in (False,True):
      for w,h in sizes:
        ctx=b.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True)
        pg=ctx.new_page(); pg.clock.install(); pg.goto(URL); pg.wait_for_timeout(300)
        if CSS: pg.add_style_tag(content=CSS)
        if large:
            pg.click('.top-actions button'); pg.click('[data-action=large]'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        row=[]
        for label,act in (('ready',None),('active','start'),('due','ff')):
            if act=='start': pg.click('#startCycle'); pg.clock.run_for(1500)
            if act=='ff': pg.clock.run_for(125000); pg.wait_for_timeout(100)
            r=pg.evaluate(JS); ok=(not r['hit']) and r['inside']; bad+=0 if ok else 1
            row.append(f"{label}={r['fs']:.0f}px{'' if ok else ' !!'+','.join(r['hit'])+('' if r['inside'] else ' outside')}")
        
        print(('L ' if large else '  ')+f"{w}x{h}: "+'  '.join(row))
        ctx.close()
    b.close()
print('PROBLEMS:',bad)
sys.exit(1 if bad else 0)
