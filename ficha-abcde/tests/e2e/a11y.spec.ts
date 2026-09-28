import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const audit = async (page: Page) =>
  (
    await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
  ).violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );

for (const scheme of ['light', 'dark'] as const) {
  test(`acessibilidade (WCAG AA) sem violações · tema ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await expect(page.getByText('Próximo treino')).toBeVisible();
    expect(await audit(page)).toEqual([]); // Treinos

    await page.getByRole('button', { name: 'Treino A, Quadríceps' }).click();
    expect(await audit(page)).toEqual([]); // pré-visualização
    await page.getByRole('button', { name: 'Editar treino' }).click();
    expect(await audit(page)).toEqual([]); // editor
    await page.getByRole('button', { name: 'Voltar', exact: true }).click();
    await page.getByRole('button', { name: 'Histórico' }).click();
    expect(await audit(page)).toEqual([]);
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await expect(page.getByText('Alerta de descanso')).toBeVisible();
    expect(await audit(page)).toEqual([]);

    await page.getByRole('button', { name: 'Treinos' }).click();
    await page.getByRole('button', { name: 'Iniciar treino A' }).click();
    await page
      .getByRole('button', { name: 'Série 1 de Mobilidade de quadril e tornozelo' })
      .click();
    await expect(page.getByRole('timer')).toBeVisible();
    expect(await audit(page)).toEqual([]); // sessão com descanso
  });
}
