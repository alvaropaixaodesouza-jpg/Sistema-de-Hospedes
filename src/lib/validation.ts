import { Guest, Room, Stay, Payment, PousadaConfig, AuditLog, ImportHistoryItem } from '../types';

export function validateStay(stay: Partial<Stay>, guests: Guest[], rooms: Room[], stays: Stay[]) {
  const room = rooms.find(r => r.id === stay.room_id);
  if (!guests.some(g => g.id === stay.guest_id && !g.archived_at)) throw new Error('Selecione um hóspede cadastrado.');
  if (!room) throw new Error('Selecione um quarto cadastrado.');
  const start = Date.parse(stay.check_in_expected || '');
  const end = Date.parse(stay.check_out_expected || '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('A saída deve ser posterior à entrada, com datas válidas.');
  if (!Number.isInteger(stay.party_size) || stay.party_size! < 1) throw new Error('Informe uma quantidade válida de pessoas.');
  if (!Number.isFinite(stay.agreed_amount) || stay.agreed_amount! < 0) throw new Error('Valor da estadia inválido.');
  if (!['reservada', 'hospedado', 'finalizada', 'cancelada', 'nao_compareceu'].includes(stay.status || '')) throw new Error('Situação inválida.');
  if (stay.companions && stay.companions.length > stay.party_size! - 1) throw new Error('A quantidade de pessoas deve incluir o responsável e os acompanhantes.');
  if (stay.status === 'reservada' || stay.status === 'hospedado') {
    if (!room.active || room.status === 'bloqueado' || room.status === 'manutencao') throw new Error('O quarto está inativo, bloqueado ou em manutenção.');
    if (stay.status === 'hospedado' && room.status === 'limpeza') throw new Error('Libere o quarto da limpeza antes do check-in.');
    if (stay.party_size! > room.capacity) throw new Error(`Este quarto comporta até ${room.capacity} pessoas.`);
    const conflict = stays.some(s => s.id !== stay.id && s.room_id === room.id && ['reservada', 'hospedado'].includes(s.status) && start < Date.parse(s.check_out_expected) && end > Date.parse(s.check_in_expected));
    if (conflict) throw new Error('Conflito de acomodação: já existe reserva ou hospedagem neste período.');
  }
}

export interface Snapshot {
  config: PousadaConfig; guests: Guest[]; stays: Stay[]; rooms: Room[];
  payments: Payment[]; auditLogs: AuditLog[]; importHistory: ImportHistoryItem[]; guestCodeSequence: number;
}

export function validateSnapshot(input: unknown): Snapshot {
  const value = JSON.parse(JSON.stringify(input)) as Snapshot;
  if (!value || !value.config?.id || !value.config?.name) throw new Error('Backup sem configuração da pousada.');
  for (const key of ['guests', 'stays', 'rooms', 'payments'] as const) {
    if (!Array.isArray(value[key])) throw new Error(`Backup incompleto: ${key}.`);
    const ids = value[key].map(row => row?.id);
    if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error(`Identificadores inválidos ou repetidos em ${key}.`);
  }
  if (value.guests.some(g => typeof g.full_name !== 'string' || !g.full_name.trim())) throw new Error('Backup contém hóspede sem nome.');
  if (value.rooms.some(r => !r.number_name || !Number.isInteger(r.capacity) || r.capacity < 1)) throw new Error('Backup contém quarto inválido.');
  for (const stay of value.stays) {
    // Historical snapshots preserve room operational states and pre-existing records.
    if (!value.guests.some(g => g.id === stay.guest_id) || !value.rooms.some(r => r.id === stay.room_id)) throw new Error('Backup contém hospedagem sem hóspede ou quarto correspondente.');
    if (!Number.isFinite(Date.parse(stay.check_in_expected)) || !Number.isFinite(Date.parse(stay.check_out_expected))) throw new Error('Backup contém data inválida.');
  }
  if (value.payments.some(p => !value.stays.some(s => s.id === p.stay_id) || !Number.isFinite(p.amount) || p.amount <= 0)) throw new Error('Backup contém pagamento inválido ou sem hospedagem.');
  value.auditLogs = value.auditLogs || [];
  value.importHistory = value.importHistory || [];
  if (!Array.isArray(value.auditLogs) || !Array.isArray(value.importHistory)) throw new Error('Histórico inválido no backup.');
  value.guestCodeSequence = Math.max(1, ...value.guests.map(g => Number(g.internal_code?.replace('HSP-', '')) + 1 || 1), Number(value.guestCodeSequence) || 1);
  return value;
}
