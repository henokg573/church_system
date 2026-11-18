export default async function run(page, ui) {
  const out = {};
  // dashboard: load file, go live
  await page.goto('http://localhost:8000/plugin/presenter/dashboard.html');
  await page.fill('#login_code', 'preacher2024');
  await page.click('#btn_login');
  await page.waitForSelector('#dashboard_view:not(.hidden)');
  out.files = await page.evaluate(async () => (await (await fetch('/api/presenter/files')).json()).map(f => ({ id: f.id, url: f.url, kind: f.kind })));
  await page.click('#file_list li button');
  await page.waitForTimeout(1500);
  out.liveVisible = await page.isVisible('#btn_go_live');
  if (out.liveVisible) await page.click('#btn_go_live');
  await page.waitForTimeout(800);
  out.dashState = await page.evaluate(() => window.state || null);

  const display = await page.context().newPage();
  await display.goto('http://localhost:8000/screen/01/');
  await display.waitForTimeout(2500);
  out.screenHidden = await display.evaluate(() => {
    const f = document.getElementById('presenter_iframe');
    return { hidden: f.hidden, src: f.src };
  });
  // capture presenter_state as screen01 sees it
  out.screenState = await display.evaluate(() => new Promise(res => {
    const s = window.io ? window.io() : null;
    if (!s) return res('no io');
    s.on('presenter_state', st => { res(st); s.close(); });
    setTimeout(() => res('timeout'), 3000);
  }));
  // peek into the nested iframes
  out.nested = await display.evaluate(() => {
    try {
      const outer = document.getElementById('presenter_iframe');
      const doc = outer.contentWindow.document;
      const inner = doc.getElementById('slide_frame');
      return { outerReady: !!doc, innerSrc: inner ? inner.src : null, canvas: inner ? (() => { try { return inner.contentWindow.document.getElementById('page_canvas')?.dataset.page ?? 'no-canvas'; } catch (e) { return 'ERR ' + e.message.slice(0, 40); } })() : null };
    } catch (e) { return 'ERR ' + e.message.slice(0, 60); }
  });
  await display.screenshot({ path: 'qa_diag.png' });
  await display.close();
  return out;
}
