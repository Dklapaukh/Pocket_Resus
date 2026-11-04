#!/usr/bin/env python3
"""Real-browser before/after check for style-sheet changes (not part of npm test; needs Python + Playwright + Chrome).
Run BEFORE the change:  python3 tools/snapshot-computed-styles.py before.json
Run AFTER the change:   python3 tools/snapshot-computed-styles.py after.json
Then compare the two files: every element, in about 20 screens and pop-ups at 6 phone-size / text-size settings, must have the same
computed style and position. Run each twice on unchanged code first: a few timing-driven elements (progress ring, toast, caption) vary by themselves."""
import sys, json, hashlib, threading, functools, http.server, socketserver, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a,**k): pass
srv = socketserver.TCPServer(("127.0.0.1",0), functools.partial(Q, directory=str(ROOT)))
URL = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = """()=>{
 const out={}; const els=[...document.querySelectorAll('*')];
 const fp=(cs)=>{let s='';for(let i=0;i<cs.length;i++){const p=cs[i];s+=p+':'+cs.getPropertyValue(p)+';';}return s;};
 const h=(s)=>{let a=5381;for(let i=0;i<s.length;i++)a=((a*33)^s.charCodeAt(i))>>>0;return a.toString(36)+s.length;};
 els.forEach((e,i)=>{
  const key=i+' '+e.tagName+(e.id?'#'+e.id:'')+(e.className&&e.className.baseVal===undefined?'.'+String(e.className).trim().replace(/\\s+/g,'.'):'');
  let v=h(fp(getComputedStyle(e)));
  for(const ps of ['::before','::after']){const c=getComputedStyle(e,ps);if(c.content&&c.content!=='none'&&c.content!=='normal')v+='|'+ps+h(fp(c));}
  const r=e.getBoundingClientRect(); v+='|'+[r.x,r.y,r.width,r.height].map(n=>Math.round(n*10)/10).join(',');
  out[key]=v;});
 return out;}"""
def click(pg, sel):
    try:
        pg.click(sel, timeout=1500); pg.wait_for_timeout(120); return True
    except Exception: return False
def esc(pg): pg.keyboard.press('Escape'); pg.wait_for_timeout(120)
res = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for large in (False, True):
      for w,h in ((360,800),(360,640),(412,915)):
        ctx = b.new_context(viewport={'width':w,'height':h}, is_mobile=True, has_touch=True)
        pg = ctx.new_page(); pg.clock.install(); pg.goto(URL); pg.wait_for_timeout(300)
        pre = f"{'L' if large else 'N'}{w}x{h}:"
        def snap(name): res[pre+name] = pg.evaluate(JS)
        if large:
            click(pg,'.top-actions button'); click(pg,'[data-action=large]'); esc(pg)
        snap('ready')
        click(pg,'[data-action=settings]'); snap('settings'); esc(pg)
        click(pg,'[data-action=weight]'); snap('weight-sheet')
        try: pg.fill('input[type=number], input', '70', timeout=800)
        except Exception: pass
        snap('weight-filled'); esc(pg)
        click(pg,'[data-action=resus-time]'); snap('resus-time'); esc(pg)
        click(pg,'#startCycle'); pg.clock.run_for(1500); snap('running')
        for _ in range(3): click(pg,'[data-action=previous-shock]')
        snap('shocks3')
        pg.clock.run_for(60000); snap('adrenaline-time')
        pg.clock.run_for(70000); snap('rhythm-due')
        click(pg,'[data-action=rhythm-check]'); snap('rhythm-sheet'); esc(pg)
        for a in ('airway','access','note','estimate','explain-me','history','cycle-log'):
            if click(pg,f'[data-action={a}]'): snap('sheet-'+a); esc(pg)
        for t in ('guidance','log','checks','live'):
            click(pg,f'[data-tab={t}]'); snap('tab-'+t)
        click(pg,'[data-tab=log]'); click(pg,'[data-action=interventions]'); snap('log-interventions')
        click(pg,'[data-tab=checks]')
        for sel in ('button:has-text("Post ROSC")','[data-action=postrosc]'):
            if click(pg,sel): snap('postrosc'); esc(pg); break
        click(pg,'[data-tab=live]'); click(pg,'[data-action=settings]'); click(pg,'[data-action=end]'); snap('end-sheet'); esc(pg)
        ctx.close()
    b.close()
json.dump(res, open(sys.argv[1],'w'))
print({k: len(v) for k,v in list(res.items())[:4]}, 'states:', len(res)//6)
