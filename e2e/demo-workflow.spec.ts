import { expect, test } from '@playwright/test';

test('reviewer completes the demo risk workflow', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Risk overview' }),
  ).toBeVisible();
  await expect(page.getByText('Seeded demonstration')).toBeVisible();
  await page.getByRole('button', { name: 'Stress test' }).click();
  await page.getByRole('button', { name: 'Crypto crash' }).click();
  await expect(page.getByText('How this scenario is calculated')).toBeVisible();
  await page.getByRole('button', { name: 'Alerts' }).click();
  await expect(page.getByText('Risk event timeline')).toBeVisible();
  await page.getByRole('button', { name: 'Replay' }).click();
  await page.getByRole('button', { name: 'Play replay' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
});
