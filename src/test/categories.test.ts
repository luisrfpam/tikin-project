import { describe, expect, it } from 'vitest';
import {
  establishmentAcceptsVoucherCategory,
  normalizeCategory,
  resolveAcceptedCategories,
} from '@/lib/categories';

describe('category matching', () => {
  it('normalizes aliases and accents', () => {
    expect(normalizeCategory('Refeição')).toBe('refeicao');
    expect(normalizeCategory('combustível')).toBe('mobilidade');
    expect(normalizeCategory('Farmácia')).toBe('saude');
  });

  it('uses establishment category as fallback when accepted list is empty', () => {
    expect(resolveAcceptedCategories([], 'refeicao')).toEqual(['refeicao']);
    expect(establishmentAcceptsVoucherCategory([], 'refeicao', 'mobilidade')).toBe(false);
    expect(establishmentAcceptsVoucherCategory([], 'refeicao', 'refeicao')).toBe(true);
  });

  it('accepts all categories only when no accepted list and no fallback category exist', () => {
    expect(establishmentAcceptsVoucherCategory([], null, 'saude')).toBe(true);
    expect(establishmentAcceptsVoucherCategory(null, null, 'mobilidade')).toBe(true);
  });

  it('matches synonyms between vouchers and merchant accepted categories', () => {
    expect(establishmentAcceptsVoucherCategory(['saúde'], null, 'farmacia')).toBe(true);
    expect(establishmentAcceptsVoucherCategory(['transporte'], null, 'mobilidade')).toBe(true);
  });
});
