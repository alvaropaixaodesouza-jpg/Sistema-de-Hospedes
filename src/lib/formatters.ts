// Utilitários de Formatação, Validação e Normalização

export const onlyDigits = (value: string = ''): string => String(value).replace(/\D/g, '');

export function formatCPF(value: string = ''): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatPhone(value: string = ''): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export function isValidCPF(value: string = ''): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  
  const digit = (size: number) => {
    let sum = 0;
    for (let i = 0; i < size; i += 1) sum += Number(cpf[i]) * (size + 1 - i);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function maskCPF(value: string = '', fullVisible: boolean = false): string {
  const cpf = onlyDigits(value);
  if (!cpf) return 'CPF não informado';
  if (fullVisible) return formatCPF(cpf);
  return cpf.length === 11 ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : formatCPF(cpf);
}

export function maskPhone(value: string = ''): string {
  const phone = onlyDigits(value);
  if (!phone) return 'Telefone não informado';
  if (phone.length >= 10) {
    return `(${phone.slice(0, 2)}) *****-${phone.slice(-4)}`;
  }
  return formatPhone(phone);
}

export function normalizeSearchText(text: string = ''): string {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function formatCurrency(amount: number = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

// Retorna data formatada no fuso operacional (America/Bahia por padrão)
export function getOperationalDateString(dateInput?: Date | string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return '';
  // Usar fuso Brasil/Bahia UTC-3
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date); // YYYY-MM-DD
}

export function getOperationalTimeString(dateInput?: Date | string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return '14:00';
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Bahia',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(date);
}

export function formatDatePTBR(dateString?: string): string {
  if (!dateString) return 'Data não informada';
  try {
    const datePart = dateString.includes('T') ? getOperationalDateString(dateString) : dateString;
    const [year, month, day] = datePart.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTimePTBR(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bahia'
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatLongDatePTBR(dateString?: string): string {
  if (!dateString) return '';
  try {
    const datePart = dateString.includes('T') ? getOperationalDateString(dateString) : dateString;
    const d = new Date(`${datePart}T12:00:00-03:00`);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateString;
  }
}
