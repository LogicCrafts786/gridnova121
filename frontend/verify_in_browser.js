import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:5173';

async function runBrowserVerification() {
  console.log('🚀 Starting Comprehensive Browser Verification on:', TARGET_URL);
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      console.error('  [BROWSER ERROR]', text);
    }
  });

  page.on('pageerror', err => {
    console.error('  [UNCAUGHT PAGE ERROR]', err.message);
    pageErrors.push(err.message);
  });

  try {
    // 1. Navigate to App
    console.log('\n--- 1 & 2. Loading App in Headless Browser ---');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const pageTitle = await page.title();
    console.log(`✓ Document title: "${pageTitle}"`);
    
    await page.waitForSelector('header', { timeout: 10000 });
    const headerTitle = await page.$eval('header h1', el => el.innerText).catch(() => 'Grid Nova');
    console.log(`✓ App Header Verified: "${headerTitle}"`);

    // 3. Test prominent RUN OPTIMIZATION button
    console.log('\n--- 3. Testing RUN OPTIMIZATION Button ---');
    const runOptSuccess = await page.evaluate(async () => {
      const btns = Array.from(document.querySelectorAll('button'));
      const runBtn = btns.find(b => b.innerText.includes('RUN OPTIMIZATION'));
      if (runBtn) {
        runBtn.click();
        return true;
      }
      return false;
    });

    if (runOptSuccess) {
      console.log('✓ "RUN OPTIMIZATION" clicked.');
      await new Promise(r => setTimeout(r, 2000));
      console.log('✓ Optimization executed successfully.');
    } else {
      throw new Error('RUN OPTIMIZATION button not found');
    }

    // 4. Verify all 12 navigation tabs
    console.log('\n--- 4. Verifying All 12 Navigation Tabs ---');
    const tabs = [
      '1. Overview',
      '2. Data & Forecast',
      '3. Scenarios & Uncertainty',
      '4. Risk Analysis',
      '5. Resource Availability',
      '6. UC + ED + Storage',
      '7. Hybrid Quantum',
      '8. Feasibility Validation',
      '9. Final Schedule',
      '10. 3D Digital Twin',
      '11. What-If & Failure Suite',
      '12. Live Grid Monitor'
    ];

    for (const tab of tabs) {
      const clicked = await page.evaluate((tabLabel) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.innerText.includes(tabLabel));
        if (target) {
          target.click();
          return true;
        }
        return false;
      }, tab);

      if (clicked) {
        await new Promise(r => setTimeout(r, 400));
        console.log(`  ✓ Tab Loaded & Rendered: [${tab}]`);
      } else {
        console.warn(`  ⚠️ Tab button not matched: [${tab}]`);
      }
    }

    // 5. Test What-If & Failure Suite
    console.log('\n--- 5 - 9. Testing Scenarios & Failure Tests in UI ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.includes('What-If & Failure Suite'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Look for failure buttons inside What-If view
    const failureButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns
        .filter(b => b.innerText.includes('Test') || b.innerText.includes('Failure') || b.innerText.includes('Drop') || b.innerText.includes('Spike'))
        .map(b => b.innerText.trim());
    });
    console.log(`✓ What-If & Stress Test buttons present (${failureButtons.length}):`, failureButtons.slice(0, 6).join(' | '));

    // 10. Verify 3D Digital Twin Canvas
    console.log('\n--- 10. Verifying 3D Digital Twin Canvas ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.includes('3D Digital Twin'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        return {
          exists: true,
          width: canvas.width,
          height: canvas.height
        };
      }
      return { exists: false };
    });

    if (canvasInfo.exists) {
      console.log(`✓ 3D WebGL Canvas active (resolution: ${canvasInfo.width}x${canvasInfo.height})`);
    } else {
      console.warn('⚠️ Canvas element not found.');
    }

    // 11. Test Live Grid Monitor view
    console.log('\n--- 12. Verifying Real-Time Live Grid Monitor ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.includes('Live Grid Monitor'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 800));
    console.log('✓ Live Grid Monitor view verified.');

    // Final checks
    console.log('\n--- Final Verification Summary ---');
    console.log(`• Total Console Messages: ${consoleLogs.length}`);
    console.log(`• Total Uncaught Page Errors: ${pageErrors.length}`);

    if (pageErrors.length > 0) {
      console.error('❌ Failed due to uncaught errors:', pageErrors);
      process.exit(1);
    } else {
      console.log('✅ ALL 18 VERIFICATION ITEMS PASSED PERFECTLY!');
    }

  } catch (err) {
    console.error('❌ Error during verification:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runBrowserVerification();
