import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from '../../src/App';

it('renderiza o título', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Ficha ABCDE' })).toBeInTheDocument();
});
