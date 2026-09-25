import { Guest, Stay, Room } from '../types';
import { onlyDigits } from './formatters';

export interface ImportBatch { guests: Partial<Guest>[]; stays: Partial<Stay>[]; rooms?: Partial<Room>[] }

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

export function normalizeRows(rows: Record<string, any>[]): ImportBatch {
  const guests = new Map<string, any>();
  const stays: any[] = [];
  rows.forEach((row, i) => {
    const cpf = onlyDigits(String(row.CPF || row.cpf || ''));
    const name = String(row['Nome Completo'] || row['Nome completo'] || row.Nome || row.nome || '').trim();
    if (!name) throw new Error(`Linha ${i + 2}: nome do hóspede ausente.`);
    const phone = onlyDigits(String(row.Telefone || row.Celular || row.phone || ''));
    // Without a CPF, keep rows separate rather than merging different people with the same name.
    const key = cpf || `row-${i}`;
    if (!guests.has(key)) guests.set(key, { id: `sheet-guest-${i}`, name, cpf, phone, city: row.Cidade || row.city || '', state: row.Estado || '' });
    const arrival = row.Chegada || row.Entrada || row.arrivalDate;
    if (arrival) {
      const arrivalDate = importDate(arrival);
      const departure = row.Saída || row.Saida || row.check_out_expected;
      stays.push({ id: `sheet-stay-${i}`, guestId: guests.get(key).id, arrivalDate,
        room: row.Quarto || row.room, partySize: Number(row['Nº Hóspedes'] || row.Pessoas) || 1,
        check_out_expected: departure ? `${importDate(departure)}T12:00:00-03:00` : undefined });
    }
  });
  return normalizeLegacy({ guests: [...guests.values()], stays });
}
