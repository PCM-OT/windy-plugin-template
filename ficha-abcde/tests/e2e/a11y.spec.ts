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
    expect(await audit(page)).toEqual([]); // Treinos (com boas-vindas)

    await page.getByRole('button', { name: 'Ver fichas prontas' }).click();
    expect(await audit(page)).toEqual([]); // lista de fichas prontas
    await page.getByRole('button', { name: /^Ver a ficha Superior/ }).click();
    await page.getByRole('button', { name: 'Como fazer' }).first().click();
    expect(await audit(page)).toEqual([]); // detalhe da ficha, com dicas e fontes
    await page.getByRole('button', { name: 'Treinos' }).click();

    await page.getByRole('button', { name: 'Treino A, Quadríceps' }).click();
    expect(await audit(page)).toEqual([]); // pré-visualização
    await page.getByRole('button', { name: 'Editar treino' }).click();
    expect(await audit(page)).toEqual([]); // editor
    await page.getByRole('button', { name: '+ Adicionar exercício' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await audit(page)).toEqual([]); // seletor de exercícios
    await page.getByRole('button', { name: 'Como fazer' }).first().click();
    await page.getByRole('button', { name: 'Criar exercício manualmente' }).click();
    expect(await audit(page)).toEqual([]); // seletor com dicas e formulário manual
    await page.getByRole('button', { name: 'Fechar' }).click();
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
