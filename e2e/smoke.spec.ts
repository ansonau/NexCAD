import { expect, test } from '@playwright/test';
import zh from '../src/i18n/zh.json' with { type: 'json' };

// 完整流程：放零件 → 產生外殼 → 匯出 STL。
// E2E 在功能已存在後撰寫，用來驗證整合是否正常運作（規格 §13）。
test('建立零件、產生外殼、匯出 STL', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');

  // 桌面版由左欄 Add Part 展開零件庫；窄畫面仍可能是底部抽屜。
  const drawerSearch = page.getByPlaceholder(zh.drawer.search);
  await page.getByRole('button', { name: zh.view.addPart }).first().click();
  await expect(drawerSearch).toBeVisible();

  await drawerSearch.fill('nano');
  await page.getByRole('button', { name: 'Arduino Nano' }).click();

  // 確認場景中出現屬性卡，且新零件已被選取
  await expect(page.getByLabel(zh.property.name)).toHaveValue('Arduino Nano');

  // 產生外殼：先開啟工具列上的外殼面板，再按面板內的產生按鈕
  await page.getByRole('button', { name: zh.view.sidebarTools }).click();
  await page.getByTitle(zh.enclosure.title).click();
  // 面板標題文字與產生按鈕文字皆為「產生外殼」，取最後一個（面板內的按鈕，DOM 順序在工具列按鈕之後）
  await page.getByRole('button', { name: zh.enclosure.generate, exact: true }).last().click();

  // 匯出 STL：攔截下載事件確認檔案真的產生
  await page.getByTitle(zh.toolbar.export).click();
  const downloadButton = page.getByRole('button', {
    name: zh.export.download.replace('{{format}}', 'STL'),
  });
  await expect(downloadButton).toBeEnabled({ timeout: 15_000 });
  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.stl$/);
});

test('mobile object sidebar controls remain reachable at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'zh'));
  await page.goto('/');

  await expect(page.getByRole('combobox', { name: zh.view.language })).toBeVisible();
  await expect(page.getByTitle(zh.view.xray)).toBeVisible();
  await expect(page.getByTitle(zh.view.wireframe)).toBeVisible();
  await expect(page.getByTitle(zh.view.highRes)).toBeVisible();

  await page.getByRole('button', { name: zh.view.partsLibrary }).click();
  await expect(page.getByPlaceholder(zh.drawer.search)).toBeVisible();
  await page.getByRole('button', { name: zh.drawer.close }).click();

  await page.getByTitle(zh.enclosure.title).click();
  const dialog = page.getByRole('dialog', { name: zh.enclosure.title });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
});
