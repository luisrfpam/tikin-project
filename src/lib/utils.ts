import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskCpf(cpf?: string | null): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "").padStart(11, "0");
  if (digits.length !== 11) return cpf;
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format CPF as user types: 000.000.000-00 (max 11 digits)
export function formatCpfInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Format CPF for display: 000.000.000-00 (full, not masked)
export function formatCpf(value?: string | null): string {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length !== 11) return value;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Format CNPJ for display: 00.000.000/0000-00
export function formatCnpj(value?: string | null): string {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length !== 14) return value;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(cpf: string): boolean {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0;
  return r === parseInt(d[10]);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// BRL currency input: takes raw user input, returns formatted string and numeric value
// Treats digits as cents: "12345" -> "123,45"
export function formatBRLInput(value: string): string {
  const d = value.replace(/\D/g, "");
  if (!d) return "";
  const n = parseInt(d, 10) / 100;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseBRLInput(value: string): number {
  const d = value.replace(/\D/g, "");
  if (!d) return 0;
  return parseInt(d, 10) / 100;
}

