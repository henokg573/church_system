export default async function run(page, ui) {
  await page.goto('http://localhost:8000/plugin/presenter/dashboard.html');
  await page.fill('#login_code', 'preacher2024');
  await page.click('#btn_login');
  await page.waitForSelector('#dashboard_view:not(.hidden)');
  await page.click('#file_list li button');
  await page.waitForTimeout(2000);

  const display = await page.context().newPage();
  await display.goto('http://localhost:8000/screen/01/');
  await display.waitForTimeout(1000);
  await page.bringToFront();
  const liveVisible = await page.isVisible('#btn_go_live');
  if (liveVisible) await page.click('#btn_go_live');

  await display.waitForFunction(
    () => !document.getElementById('presenter_iframe').hidden,
    undefined, { timeout: 6000 }
  ).catch(() => { });
  await display.waitForTimeout(3000); // let the viewer load and pre-render

  // measure flip latency: click next, then poll the canvas page marker
  const flips = [];
  for (let i = 0; i < 4; i++) {
    const target = String(2 + i);
    const t0 = Date.now();
    await page.click('#btn_next');
    let done = false;
    while (Date.now() - t0 < 5000 && !done) {
      done = await display.evaluate((t) => {
        try {
          const inner = document.getElementById('presenter_iframe')
            .contentWindow.document.getElementById('slide_frame');
          return inner.contentWindow.document.getElementById('page_canvas').dataset.page === t;
        } catch (e) { return false; }
      }, target);
      if (!done) await display.waitForTimeout(40);
    }
    flips.push({ target, ms: Date.now() - t0, done });
  }

  await display.screenshot({ path: 'qa_screen01_live.png' });
  await display.close();
  return { liveVisible, flips };
}
