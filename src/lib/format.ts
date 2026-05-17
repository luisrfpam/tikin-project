/**
 * Formata número no padrão financeiro brasileiro: 1.234,56 (sem R$).
 */
export const brl = (n: number | string | null | undefined): string => {
  const v = typeof n === 'number' ? n : Number(n ?? 0);
  if (!Number.isFinite(v)) return '0,00';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
