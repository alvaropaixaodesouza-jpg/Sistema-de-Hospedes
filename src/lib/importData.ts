import { Guest, Stay, Room } from '../types';
import { onlyDigits } from './formatters';

export interface ImportBatch { guests: Partial<Guest>[]; stays: Partial<Stay>[]; rooms?: Partial<Room>[]; warnings?: string[]; sourceRows?: Record<string, unknown>[]; batchKey?: string }

export function importDate(value: unknown): string {
  if (typeof value === 'number') return new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000).toISOString().slice(0, 10);
  const text = String(value || '').trim();
  const brazil = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const result = brazil ? `${brazil[3]}-${brazil[2]}-${brazil[1]}` : text.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new Error(`Data inválida: ${text || '(vazia)'}. Informe a data de chegada.`);
  return result;
}

function nextDay(date: string) { return new Date(Date.parse(date + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10); }

export function normalizeLegacy(input: any): ImportBatch {
  if (!Array.isArray(input?.guests) || !Array.isArray(input?.stays)) throw new Error('O arquivo deve conter listas de hóspedes e hospedagens.');
  const rooms: Partial<Room>[] = [];
  const roomIds = new Map<string, string>();
  const stays = input.stays.map((s: any, i: number) => {
    const date = importDate(s.arrivalDate || s.check_in_expected);
    const name = String(s.room || s.room_name || '').trim();
    let roomId = s.room_id;
    if (!roomId) {
      if (!name) throw new Error(`Hospedagem ${i + 1}: informe a acomodação.`);
      if (!roomIds.has(name)) {
        roomIds.set(name, `legacy-room-${rooms.length}`);
        rooms.push({ id: roomIds.get(name), number_name: name, capacity: Number(s.partySize || s.party_size) || 1, status: 'disponivel', active: true });
      }
      roomId = roomIds.get(name);
      const room = rooms.find(r => r.id === roomId)!;
      room.capacity = Math.max(room.capacity || 1, Number(s.partySize || s.party_size) || 1);
    }
    const estimated = !s.check_out_expected;
    return { ...s, id: s.id || `legacy-stay-${i}`, guest_id: s.guestId || s.guest_id, room_id: roomId,
      check_in_expected: s.check_in_expected || `${date}T${s.arrivalTime || '14:00'}:00-03:00`,
      check_out_expected: s.check_out_expected || `${nextDay(date)}T12:00:00-03:00`,
      party_size: Number(s.partySize || s.party_size) || 1, agreed_amount: Number(s.agreed_amount) || 0,
      status: s.status || 'finalizada', notes: [s.notes, estimated ? 'Saída estimada para o dia seguinte: o arquivo original não informa a saída. Revisar.' : ''].filter(Boolean).join('\n') };
  });
  return { rooms, stays, guests: input.guests.map((g: any) => ({ ...g, full_name: g.full_name || g.name, cpf: onlyDigits(String(g.cpf || '')), phone: onlyDigits(String(g.phone || '')) })) };
}

// Header aliases accept the original consolidation as well as exported sheets.
export function normalizeRows(rows: Record<string, any>[]): ImportBatch {
  if (!rows.length) throw new Error('A aba selecionada está vazia.');
  const guests = new Map<string, any>();
  const stays: any[] = [];
  const warnings: string[] = [];
  const clean = (v: unknown) => { const s = String(v ?? '').trim(); return s === '-' ? '' : s; };
  rows.forEach((row, i) => {
    const get = (...keys: string[]) => clean(keys.map(k => row[k]).find(v => clean(v)));
    const name = get('Nome Completo', 'Nome completo', 'Nome', 'nome');
    if (!name) throw new Error(`Linha ${i + 2}: nome ausente. Selecione a aba que contém os clientes.`);
    const document = onlyDigits(get('CPF', 'cpf', 'CPF / documento'));
    const cpf = document.length === 11 ? document : '';
    const phone = onlyDigits(get('Telefone', 'Celular', 'phone'));
    const key = cpf || `row-${i}`;
    const details = [get('Observações', 'observacoes_cliente', 'Preferências'), get('Observações hospedagem'),
      get('Contato de emergência') && `Contato de emergência: ${get('Contato de emergência')}`,
      get('Arquivo de origem') && `Origem: ${get('Arquivo de origem')}; linha: ${get('Linha de origem')}`,
      get('Acompanhantes') && `Acompanhantes informados: ${get('Acompanhantes')}`,
      `Registro original da importação: ${JSON.stringify(row)}`].filter(Boolean).join('\n');
    if (!guests.has(key)) guests.set(key, { id: `sheet-guest-${i}`, full_name: name, cpf, phone,
      alt_doc_type: document && !cpf ? 'Documento informado' : undefined,
      alt_doc_number: document && !cpf ? document : undefined,
      city: get('Cidade', 'city', 'Cidade / origem informada'), state: get('Estado'),
      street: get('Endereço'), number: get('Número'), complement: get('Complemento'),
      neighborhood: get('Bairro'), zip_code: onlyDigits(get('CEP')), country: get('País') || 'Brasil',
      email: get('Email', 'E-mail'), preferences: details, is_incomplete: !phone || !document });
    else guests.get(key).preferences += `\nOutro registro original: ${JSON.stringify(row)}`;
    if (document && !cpf) warnings.push(`Linha ${i + 2}: documento com ${document.length} dígitos preservado como documento alternativo.`);
    const arrival = get('Chegada', 'Entrada', 'arrivalDate');
    if (!arrival) { warnings.push(`Linha ${i + 2}: sem entrada; somente cadastro do cliente.`); return; }
    try {
      // Preserve numeric Excel serials; strings such as 16/01 are never assigned a year.
      const rawArrival = row.Chegada ?? row.Entrada ?? row.arrivalDate;
      const arrivalDate = importDate(typeof rawArrival === 'number' ? rawArrival : arrival);
      const room = get('Quarto', 'room', 'Quarto / unidade');
      if (!room || /[/;,]/.test(room)) throw new Error('quarto ausente ou vários quartos na mesma célula; separe as estadias');
      const rawDeparture = row.Saída ?? row.Saida ?? row.check_out_expected;
      const departure = clean(rawDeparture);
      const checkOut = departure ? `${importDate(rawDeparture)}T12:00:00-03:00` : undefined;
      if (checkOut && Date.parse(checkOut) <= Date.parse(`${arrivalDate}T14:00:00-03:00`)) throw new Error('saída deve ser posterior à entrada');
      if (!checkOut) warnings.push(`Linha ${i + 2}: saída ausente; será estimada para o dia seguinte. Revise a hospedagem.`);
      const amountText = get('Valor Combinado', 'Valor informado', 'Valor', 'agreed_amount');
      const numeric = amountText.replace(/R\$|\s/g, '');
      if (numeric && !/^(?:\d+(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)$/.test(numeric)) throw new Error('valor ambíguo');
      const amount = numeric.includes(',') ? Number(numeric.replace(/\./g, '').replace(',', '.')) : Number(numeric);
      if (!Number.isFinite(amount) || amount < 0) throw new Error('valor inválido');
      if (!amountText) warnings.push(`Linha ${i + 2}: valor não informado; cadastrado como zero, sem registrar pagamento.`);
      const companions = get('Acompanhantes').split(/[,;]\s*/).filter(Boolean).map((text, index) => {
        const match = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(text);
        return { id: `companion-${i}-${index}`, full_name: (match?.[1] || text).trim(), cpf: match ? onlyDigits(match[2]) : undefined };
      });
      const count = get('Nº Hóspedes', 'Pessoas');
      const partySize = count ? Number(count) : 1 + companions.length;
      if (!Number.isInteger(partySize) || partySize < 1 + companions.length) throw new Error('quantidade de pessoas incompatível com acompanhantes');
      const statusText = get('Situação', 'Status').toLowerCase();
      const aliases: Record<string,string> = { concluida: 'finalizada', 'concluída': 'finalizada', finalizada: 'finalizada', reservada: 'reservada', hospedado: 'hospedado', cancelada: 'cancelada', nao_compareceu: 'nao_compareceu' };
      if (statusText && !aliases[statusText]) throw new Error('situação desconhecida');
      stays.push({ id: `sheet-stay-${i}`, guestId: guests.get(key).id, arrivalDate,
        room, partySize, agreed_amount: amount, check_out_expected: checkOut,
        companions, status: aliases[statusText] || 'finalizada', notes: details });
    } catch (error) {
      warnings.push(`Linha ${i + 2}: hospedagem não incluída (${(error as Error).message}); dados originais preservados na ficha do cliente.`);
    }
  });
  return { ...normalizeLegacy({ guests: [...guests.values()], stays }), warnings, sourceRows: rows };
}
