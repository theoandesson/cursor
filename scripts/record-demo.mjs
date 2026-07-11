import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME_PATH = "/usr/local/bin/google-chrome";
const BASE_URL = "http://127.0.0.1:4173/#/map";
const FRAMES_DIR = "/tmp/demo-frames";
const OUTPUT_VIDEO = "/opt/cursor/artifacts/sverige-3d-karta-demo.mp4";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.readdirSync(dir).forEach((file) => fs.unlinkSync(path.join(dir, file)));
};

const compileVideo = () => {
  const frameCount = fs.readdirSync(FRAMES_DIR).filter((f) => f.endsWith(".png")).length;
  if (frameCount === 0) {
    throw new Error("Inga bildrutor att kompilera.");
  }

  fs.mkdirSync(path.dirname(OUTPUT_VIDEO), { recursive: true });
  execSync(
    [
      "ffmpeg -y",
      `-framerate 0.4`,
      `-i "${path.join(FRAMES_DIR, "frame-%04d.png")}"`,
      `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#f0f5fa"`,
      `-c:v libx264 -pix_fmt yuv420p -movflags +faststart`,
      `"${OUTPUT_VIDEO}"`
    ].join(" "),
    { stdio: "inherit" }
  );
};

const createRecorder = (page) => {
  let frameIndex = 0;

  const capture = async (label) => {
    const framePath = path.join(FRAMES_DIR, `frame-${String(frameIndex).padStart(4, "0")}.png`);
    await page.screenshot({ path: framePath, type: "png" });
    console.log(`  📸 ${label} → ${path.basename(framePath)}`);
    frameIndex += 1;
    return frameIndex;
  };

  const step = async (label, action) => {
    console.log(`▶ ${label}`);
    try {
      if (action) {
        await action();
      }
    } catch (error) {
      console.warn(`  ⚠ ${label}: ${error.message}`);
    }
    await sleep(2800);
    await capture(label);
  };

  return { step, capture };
};

const waitForMapReady = async (page) => {
  console.log("Väntar på att kartan ska laddas…");
  await page.waitForFunction(
    () => {
      const overlay = document.getElementById("loading-overlay");
      if (!overlay) {
        return true;
      }
      if (overlay.style.display === "none") {
        return true;
      }
      if (overlay.dataset.state === "ready") {
        return true;
      }
      return false;
    },
    { timeout: 120_000 }
  );
  await sleep(4000);
};

const clickTab = async (page, route) => {
  await page.click(`#app-tab-${route}`);
};

const runDemo = async () => {
  ensureDir(FRAMES_DIR);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080",
      "--window-position=0,0",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--ignore-gpu-blocklist",
      `--user-data-dir=/tmp/demo-chrome-${Date.now()}`
    ],
    env: {
      ...process.env,
      DISPLAY: process.env.DISPLAY ?? ":1"
    }
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60_000);

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.warn(`[browser] ${msg.text()}`);
    }
  });

  const { step } = createRecorder(page);

  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForMapReady(page);

    await step("1. Översikt – Sverige i 3D");

    await step("2. Zooma in mot Stockholm", async () => {
      const mapRoot = await page.$("#map-root");
      const box = await mapRoot.boundingBox();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      for (let i = 0; i < 8; i += 1) {
        await page.mouse.wheel({ deltaY: -180 });
        await sleep(200);
      }
    });

    await step("3. Rotera och luta kartan", async () => {
      const mapRoot = await page.$("#map-root");
      const box = await mapRoot.boundingBox();
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4);
      await page.mouse.down({ button: "right" });
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5, { steps: 25 });
      await page.mouse.up({ button: "right" });
      await sleep(800);
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 15 });
      await page.mouse.up();
    });

    await step("4. Sök Göteborg", async () => {
      const input = await page.$(".map-search-control__input");
      await input.click({ clickCount: 3 });
      await input.type("Göteborg", { delay: 80 });
      await sleep(1200);
      await page.click(".map-search-control__result", { timeout: 8000 });
    });

    await step("5. Väder-popup på kartan", async () => {
      const mapRoot = await page.$("#map-root");
      const box = await mapRoot.boundingBox();
      await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.45);
    });

    await step("6. Byt till satellitläge", async () => {
      await page.click('.map-mode-control__button[aria-label*="Satellit"]');
      await sleep(5000);
    });

    await step("7. Växla dag/natt-läge", async () => {
      await page.click('button[title*="nattläge"], button[title*="dagläge"]', { timeout: 5000 });
    });

    await step("8. Aktivera trafikflöde", async () => {
      await page.evaluate(() => {
        const toggle = document.querySelector("#traffic-toggle-traffic-flow");
        if (toggle && !toggle.checked) {
          toggle.click();
        }
      });
    });

    await step("9. Aktivera SMHI-radar", async () => {
      await page.evaluate(() => {
        const panel = document.querySelector(".map-layer-panel");
        if (panel?.dataset.state === "collapsed") {
          panel.querySelector(".map-layer-panel__collapse")?.click();
        }
        const radarToggle = document.querySelector(
          '[data-layer-id="smhi-radar"] .map-layer-panel__toggle'
        );
        if (radarToggle?.textContent?.trim() === "Av") {
          radarToggle.click();
        }
      });
      await sleep(2500);
    });

    await step("10. Städer-panelen", async () => {
      await clickTab(page, "cities");
      await sleep(1500);
      await page.click(".cities-panel__item", { timeout: 8000 }).catch(() => {});
      await sleep(3000);
    });

    await step("11. Prestanda-panelen", async () => {
      await clickTab(page, "perf");
      await sleep(2000);
    });

    await step("12. Tillbaka till kartan", async () => {
      await clickTab(page, "map");
      await sleep(3000);
      const mapRoot = await page.$("#map-root");
      const box = await mapRoot.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < 4; i += 1) {
        await page.mouse.wheel({ deltaY: -120 });
        await sleep(250);
      }
    });
  } finally {
    await browser.close();
  }

  console.log("Kompilerar demo-video…");
  if (!process.env.SKIP_COMPILE) {
    compileVideo();
    console.log(`Demo-video sparad: ${OUTPUT_VIDEO}`);
  }
};

runDemo().catch((error) => {
  console.error("Demo-inspelning misslyckades:", error);
  process.exit(1);
});
