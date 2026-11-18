export default async function run(page, ui) {
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

  // login flow
  await page.fill("#login_code", "preacher2024");
  await page.click("#btn_login");
  await page.waitForSelector("#dashboard_view:not(.hidden)", { timeout: 5000 });

  // check upload list has the test file
  await page.waitForFunction(() => document.querySelectorAll("#file_list li").length > 0, { timeout: 5000 });

  // open the uploaded file in the reader
  await page.click("#file_list li:first-child button");
  await page.waitForFunction(() => document.getElementById("page_label").textContent.includes("page 1 of 2"), { timeout: 8000 });

  // go live, advance a page
  await page.click("#btn_go_live");
  await page.waitForFunction(() => document.getElementById("live_badge").classList.contains("hidden") === false, { timeout: 5000 });
  await page.click("#btn_next");
  await page.waitForFunction(() => document.getElementById("page_label").textContent.includes("page 2 of 2"), { timeout: 5000 });

  // notes
  await page.fill("#notes_area", "Remember to pray before slide 3");
  await page.waitForTimeout(500);

  // chat
  await page.fill("#chat_input", "hello media team");
  await page.click("#btn_chat_send");
  await page.waitForFunction(() => document.querySelectorAll("#chat_box .chat-msg").length > 0, { timeout: 5000 });

  const frameSrc = await page.evaluate(() => document.getElementById("slide_frame").src);
  await page.screenshot({ path: "presenter_dashboard.png" });
  return { frameSrc, errors, ok: true };
}
