import { supabase } from './supabase';
import { Guest, Stay, Room, Payment, UserProfile } from '../types';
import { ImportBatch } from './importData';
import { notifyDataChanged } from './storeEvents';

async function profile(write = false): Promise<UserProfile> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Entre na sua conta para acessar os dados.');
  const result = await supabase.from('user_profiles').select('*').eq('id', data.session.user.id).single();
  if (result.error) throw result.error;
  if (!result.data.active || (write && !['admin', 'recepcao'].includes(result.data.role))) throw new Error('Sem permissão para esta operação.');
  return result.data;
}

async function rows(table: string, select = '*'): Promise<any[]> {
  await profile();
  const result: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select(select).order('id').range(offset, offset + 499);
    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < 500) return result;
  }
}

export const cloudStore = {
  async importDataBatch(payload: ImportBatch & { filename: string }) {
    await profile(true);
    const { data, error } = await supabase.rpc('import_guest_batch', { payload });
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') throw new Error('A importação precisa ser ativada no banco. Aplique a migração 20260925170000_excel_import.sql no Supabase e tente novamente.');
      throw error;
    }
    notifyDataChanged();
    return data;
  },
  async roomTypes() { return rows('room_types'); },
  async saveRoomType(value: { id?: string; name: string; description?: string; default_price: number }) {
    const actor = await profile(true);
    const { id, ...fields } = value;
    const query = id ? supabase.from('room_types').update(fields).eq('id',id) : supabase.from('room_types').insert({...fields,pousada_id:actor.pousada_id});
    const { data, error } = await query.select().single();
    if (error) throw error; notifyDataChanged(); return data;
  },
  async importHistory() { return (await rows('import_history')).sort((a,b) => b.created_at.localeCompare(a.created_at)); },
  async config() {
    const actor = await profile();
    const { data, error } = await supabase.from('pousada_config').select('*').eq('id', actor.pousada_id).single();
    if (error) throw error;
    return data;
  },
  async saveConfig(fields: Record<string, unknown>) {
    const actor = await profile(true);
    if (actor.role !== 'admin') throw new Error('Somente administradores podem alterar configurações.');
    const { data, error } = await supabase.from('pousada_config').update(fields).eq('id', actor.pousada_id).select().single();
    if (error) throw error;
    notifyDataChanged();
    return data;
  },
  async guests(): Promise<Guest[]> { return rows('guests'); },
  async stays(): Promise<Stay[]> {
    return rows('stays', '*, guest:guests(*), room:rooms(*), payments(*), companions:stay_guests(*)');
  },
  async rooms(): Promise<Room[]> {
    const data = await rows('rooms', '*, room_type:room_types(name)');
    return data.map(({ room_type, ...room }) => ({ ...room, room_type_name: room_type?.name || room.room_type_name }));
  },
  async payments(): Promise<Payment[]> { return rows('payments'); },
  async auditLogs(entityId?: string) {
    const data = await rows('audit_logs');
    return data.filter(row => !entityId || row.entity_id === entityId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async saveStay(stay: Partial<Stay>): Promise<Stay> {
    await profile(true);
    const { guest, room, payments, pousada_id, created_by, created_at, updated_at, ...payload } = stay;
    const { data, error } = await supabase.rpc('save_stay', { payload });
    if (error) throw error;
    notifyDataChanged();
    return data;
  },
  async saveRoom(room: Partial<Room>): Promise<Room> {
    const actor = await profile(true);
    const { id, ...fields } = room;
    const payload = { ...fields, pousada_id: actor.pousada_id };
    const query = id ? supabase.from('rooms').update(payload).eq('id', id) : supabase.from('rooms').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    notifyDataChanged();
    return data;
  },
  async savePayment(payment: Partial<Payment>): Promise<Payment> {
    const actor = await profile(true);
    if (!Number.isFinite(payment.amount) || payment.amount! <= 0) throw new Error('Informe um pagamento positivo.');
    const { id, ...fields } = payment;
    const { data, error } = await supabase.from('payments').insert({ ...fields, created_by: actor.id }).select().single();
    if (error) throw error;
    notifyDataChanged();
    return data;
  },
  async exportBackup() {
    const actor = await profile();
    const { data: config, error } = await supabase.from('pousada_config').select('*').eq('id', actor.pousada_id).single();
    if (error) throw error;
    const [guests, stays, rooms, payments, auditLogs, importHistory] = await Promise.all([
      rows('guests'), this.stays(), this.rooms(), rows('payments'), rows('audit_logs'), rows('import_history')
    ]);
    return JSON.stringify({ schemaVersion: 2, source: 'supabase', exportedAt: new Date().toISOString(), config, guests, stays, rooms, payments, auditLogs, importHistory }, null, 2);
  }
};
