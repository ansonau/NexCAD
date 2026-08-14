import { expect, test } from '@playwright/test';
import zh from '../src/i18n/zh.json' with { type: 'json' };

// 完整流程：放零件 → 產生外殼 → 匯出 STL。
// E2E 在功能已存在後撰寫，用來驗證整合是否正常運作（規格 §13）。
test('建立零件、產生外殼、匯出 STL', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');

  // 桌面版預設開在「零件」Tab。
  const drawerSearch = page.getByPlaceholder(zh.drawer.search);
  await expect(drawerSearch).toBeVisible();

  await drawerSearch.fill('nano');
  await page.getByRole('button', { name: 'Arduino Nano' }).click();

  // 確認場景中出現屬性卡，且新零件已被選取
  await expect(page.getByLabel(zh.property.name)).toHaveValue('Arduino Nano');
  await page.getByTitle(zh.view.dimensions).click();
  await page.getByRole('menuitem', { name: zh.view.dimensionsHoles }).click();
  await expect(page.getByText(/\d+(\.\d+)?mm/).first()).toBeVisible({ timeout: 10_000 });
  await page.getByTitle(zh.view.dimensions).click();
  await page.getByRole('menuitem', { name: zh.view.dimensionsHoleLabels }).click();
  await expect(page.getByText(/Ø1\.8/).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/X-?\d+(\.\d+)?/).first()).toBeVisible();
  await expect(page.getByText(/Y-?\d+(\.\d+)?/).first()).toBeVisible();
  await expect(page.getByText(/Z-?\d+(\.\d+)?/).first()).toBeVisible();

  // 產生外殼：先切到「工具」Tab，再按面板內的產生按鈕
  await page.getByRole('tab', { name: zh.view.sidebarTools }).click();
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

test('建立零件、建立支架', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');

  // 放一個零件
  const drawerSearch = page.getByPlaceholder(zh.drawer.search);
  await expect(drawerSearch).toBeVisible();
  await drawerSearch.fill('nano');
  await page.getByRole('button', { name: 'Arduino Nano' }).click();
  await expect(page.getByLabel(zh.property.name)).toHaveValue('Arduino Nano');

  // 切到工具 Tab，開啟支架面板並產生
  await page.getByRole('tab', { name: zh.view.sidebarTools }).click();
  await page.getByTitle(zh.bracket.title).click();
  await expect(page.getByRole('dialog', { name: zh.bracket.title })).toBeVisible();
  await page.getByRole('button', { name: zh.bracket.generate, exact: true }).last().click();

  // 切到場景 Tab，確認出現 bracket 節點
  await page.getByRole('tab', { name: zh.view.sidebarScene }).click();
  await expect(page.getByText('bracket', { exact: true })).toBeVisible();
});

test('desktop sidebar tabs expose parts, tools, and scene objects', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('tab', { name: zh.view.sidebarParts })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByPlaceholder(zh.drawer.search)).toBeVisible();

  await page.getByRole('tab', { name: zh.view.sidebarTools }).click();
  await expect(page.getByTitle(zh.enclosure.title)).toBeVisible();
  await expect(page.getByTitle(zh.toolbar.smartCar)).toBeVisible();
  await expect(page.getByTitle(zh.tools.title)).toBeVisible();
  await expect(page.getByTitle(zh.bracket.title)).toBeVisible();
  await page.getByTitle(zh.align.title).click();
  const toolsPanel = page.getByRole('tabpanel', { name: zh.view.sidebarTools });
  await expect(toolsPanel.getByText(zh.align.inlineHint)).toBeVisible();
  await expect(toolsPanel.getByText(zh.align.disabled.replace('{{count}}', '0'))).toBeVisible();
  await expect(toolsPanel.getByTitle(zh.align.undo)).toBeDisabled();
  const disabledAlignButtons = toolsPanel.locator('button:disabled').filter({ hasText: /X|Y|Z/ });
  await expect(disabledAlignButtons).toHaveCount(9);

  await page.getByRole('tab', { name: zh.view.sidebarScene }).click();
  await expect(page.getByText(zh.view.sceneTreeEmpty)).toBeVisible();
  await page.getByRole('button', { name: zh.view.addPart }).click();
  await expect(page.getByRole('tab', { name: zh.view.sidebarParts })).toHaveAttribute('aria-selected', 'true');
});

test('mobile object sidebar controls remain reachable at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'zh'));
  await page.goto('/');

  await expect(page.getByRole('combobox', { name: zh.view.language })).toBeVisible();
  const toggles = [zh.view.xray, zh.view.wireframe, zh.view.highRes].map((label) => page.getByTitle(label));
  for (const toggle of toggles) {
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  }
  const dimensions = page.getByTitle(zh.view.dimensions);
  await expect(dimensions).toBeVisible();
  await dimensions.click();
  await expect(page.getByRole('menuitem', { name: zh.view.dimensionsParts })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: zh.view.dimensionsHoles })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: zh.view.dimensionsHoleLabels })).toBeVisible();
  await page.getByRole('menuitem', { name: zh.view.dimensionsEnclosure }).click();
  await expect(dimensions).toHaveAttribute('aria-pressed', 'true');

  const viewTogglesBox = await toggles[0].locator('..').boundingBox();
  const workflowBox = await page.getByText(zh.view.workflowTools, { exact: true }).locator('..').boundingBox();
  expect(viewTogglesBox).not.toBeNull();
  expect(workflowBox).not.toBeNull();
  expect(
    (viewTogglesBox!.x + viewTogglesBox!.width <= workflowBox!.x) ||
    (workflowBox!.x + workflowBox!.width <= viewTogglesBox!.x) ||
    (viewTogglesBox!.y + viewTogglesBox!.height <= workflowBox!.y) ||
    (workflowBox!.y + workflowBox!.height <= viewTogglesBox!.y),
  ).toBe(true);

  await page.getByRole('button', { name: zh.view.partsLibrary }).click();
  await expect(page.getByPlaceholder(zh.drawer.search)).toBeVisible();
  await page.getByRole('button', { name: zh.drawer.close }).click();

  const expectInViewport = async (dialog: ReturnType<typeof page.getByRole>) => {
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    expect(box!.y + box!.height).toBeLessThanOrEqual(700);
  };

  await page.getByRole('button', { name: zh.enclosure.title }).click();
  await expectInViewport(page.getByRole('dialog', { name: zh.enclosure.title }));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: zh.tools.title }).click();
  await expectInViewport(page.getByRole('dialog', { name: zh.tools.title }));
});
