"""Real-browser regressions; invoke with the integrated browser helpers.

browser_exec runner (after opening a tab):
    exec(Path(TEST_ROOT, 'tests/browser/tunnel-mobile.py').read_text())
    run_tunnel_mobile(TEST_ROOT, QA_OUTPUT, TUNNEL_URL, cdp=cdp, js=js,
                     goto_url=goto_url, wait_for_load=wait_for_load)

Requires a live production build. No added dependencies. Not run by pnpm test.
"""
from pathlib import Path
import json
import time


def run_tunnel_mobile(test_root, qa_output, tunnel_url, *, cdp, js, goto_url, wait_for_load):
    root = Path(test_root)
    out = Path(qa_output)
    out.mkdir(parents=True, exist_ok=True)
    cdp('Page.addScriptToEvaluateOnNewDocument', source="""
    (() => {
      window.__qaErrors=[];
      addEventListener('error',e=>window.__qaErrors.push(e.message));
      addEventListener('unhandledrejection',e=>window.__qaErrors.push(String(e.reason)));
      const oldError=console.error;
      console.error=(...a)=>{window.__qaErrors.push(a.map(String).join(' '));oldError(...a)};
    })();
    """)
    goto_url(tunnel_url)
    wait_for_load()
    cdp('Page.bringToFront')
    assert js('document.hidden') is False
    source = (root / 'tests/browser/tunnel-layout.mjs').read_text()
    results = []
    for width, height in [(320, 568), (390, 844), (768, 1024), (899, 844),
                          (900, 844), (1440, 900), (844, 390), (568, 320)]:
        cdp('Emulation.setDeviceMetricsOverride', width=width, height=height,
            deviceScaleFactor=1, mobile=width < 900)
        time.sleep(.3)
        result = js('(() => {' + source.replace('export function', 'function') +
                    ';return checkTunnelLayout();})()')
        results.append(result)
    (out / 'layout-results.json').write_text(json.dumps(results, indent=2))
    assert all(a['pass'] for result in results for a in result['assertions']), results

    cdp('Emulation.setDeviceMetricsOverride', width=390, height=844,
        deviceScaleFactor=1, mobile=True)
    cdp('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
    js("""
    window.__touchEvents=[];
    for(const node of [document.querySelector('main'),document.querySelector('nav')]){
     node.addEventListener('touchstart',e=>window.__touchEvents.push({type:e.type,trusted:e.isTrusted}));
    }
    document.querySelector('main').scrollTop=0;
    """)

    def tap_destination(index):
        point = js(f"""(() => {{const r=document.querySelectorAll('nav button')[{index}]
          .getBoundingClientRect();return {{x:r.x+r.width/2,y:r.y+r.height/2}}}})()""")
        cdp('Input.dispatchTouchEvent', type='touchStart',
            touchPoints=[{'x': point['x'], 'y': point['y'], 'id': 1}])
        cdp('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])

    tap_destination(5)
    arrival = js("""new Promise(resolve=>{
     const main=document.querySelector('main');const samples=[main.scrollTop];let count=0;
     const timer=setInterval(()=>{samples.push(main.scrollTop);if(++count===20){
     clearInterval(timer);const section=document.querySelector('#contato');
     const target=Math.min(Math.max(section.offsetTop+section.offsetHeight/2-main.clientHeight/2,0),main.scrollHeight-main.clientHeight);
     resolve({samples,target,actual:main.scrollTop,active:document.querySelector('nav button[aria-current]').getAttribute('aria-label')});
     }},200)})""")
    (out / 'touch-arrival.json').write_text(json.dumps(arrival, indent=2))
    assert abs(arrival['actual'] - arrival['target']) <= 1, arrival
    assert arrival['active'] == 'Ir para 06 Contato', arrival
    assert any(0 < value < arrival['target'] for value in arrival['samples']), arrival
    assert all(b >= a for a, b in zip(arrival['samples'], arrival['samples'][1:])), arrival

    tap_destination(0)
    time.sleep(.65)
    cdp('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': 250, 'y': 600, 'id': 1}])
    cdp('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
    interruption = js("""new Promise(resolve=>{const m=document.querySelector('main');
     const samples=[m.scrollTop];setTimeout(()=>{samples.push(m.scrollTop);
     setTimeout(()=>{samples.push(m.scrollTop);resolve({samples,events:window.__touchEvents})},3200)},250)})""")
    assert interruption['samples'][0] > 1000, interruption
    assert max(interruption['samples']) - min(interruption['samples']) <= 1, interruption
    assert interruption['events'] and all(e['trusted'] for e in interruption['events']), interruption

    start = js('document.querySelector("main").scrollTop')
    cdp('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': 250, 'y': 650, 'id': 1}])
    for y in range(620, 349, -30):
        cdp('Input.dispatchTouchEvent', type='touchMove', touchPoints=[{'x': 250, 'y': y, 'id': 1}])
        time.sleep(.05)
    cdp('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
    time.sleep(1)
    end = js('document.querySelector("main").scrollTop')
    result = {'interruption': interruption, 'swipe': {'start': start, 'end': end, 'delta': end-start},
              'errors': js('window.__qaErrors')}
    (out / 'touch-interruption-swipe.json').write_text(json.dumps(result, indent=2))
    assert end > start + 100, result
    assert not result['errors'], result
    print(json.dumps({'layout_viewports': len(results), 'arrival': arrival, 'touch': result}))
