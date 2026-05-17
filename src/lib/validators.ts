// Máscaras e validadores para CPF, CNPJ, CEP, telefone e e-mail

export const onlyDigits = (v: string) => v.replace(/\D/g, '');

export const maskCPF = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const maskCNPJ = (v: string) => {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const maskCEP = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, '$1-$2');
};

export const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

export const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export const isValidCPF = (v: string) => {
  const cpf = onlyDigits(v);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(cpf[i]) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(cpf[9]) && calc(10) === parseInt(cpf[10]);
};

export const isValidCNPJ = (v: string) => {
  const cnpj = onlyDigits(v);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (slice: number) => {
    const weights = slice === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(cnpj[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(cnpj[12]) && calc(13) === parseInt(cnpj[13]);
};

export const isValidCEP = (v: string) => onlyDigits(v).length === 8;

export const isValidPhone = (v: string) => {
  const d = onlyDigits(v);
  return d.length >= 10 && d.length <= 11;
};

// Detecta se uma string parece um documento (somente dígitos após limpar)
export const looksLikeDocument = (v: string) => /^[\d.\-/\s]+$/.test(v.trim());
