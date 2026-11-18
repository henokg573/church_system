export default async function run(page) {
  await page.goto("http://localhost:8000/plugin/presenter/dashboard.html", { waitUntil: "load" });
  await page.fill("#login_code", "preacher2024");
  await page.click("#btn_login");
  await page.waitForTimeout(5000);
  const state = {
    dashHidden: await page.evaluate(() => document.getElementById("dashboard_view").classList.contains("hidden")),
    items: await page.evaluate(() => document.querySelectorAll("#file_list li").length),
    pageLabel: await page.evaluate(() => document.getElementById("page_label").textContent),
    activeName: await page.evaluate(() => document.getElementById("active_name").textContent),
    frameSrc: await page.evaluate(() => document.getElementById("slide_frame").src),
    frameHidden: await page.evaluate(() => document.getElementById("slide_frame").offsetParent === null),
  };
  await page.screenshot({ path: "dash_debug.png" });
  return state;
}
