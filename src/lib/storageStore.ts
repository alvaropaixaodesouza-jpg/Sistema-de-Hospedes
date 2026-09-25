import { cloudStore } from './cloudStore';
import { Guest, Stay, Room, AuditLog, ImportHistoryItem, Payment, RoomType, PousadaConfig } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { validateStay, validateSnapshot } from './validation';
import { notifyDataChanged } from './storeEvents';
import { onlyDigits, normalizeSearchText, getOperationalDateString, getOperationalTimeString } from './formatters';

const LOCAL_STORAGE_KEY = 'pousada_hospedes_v2_store';

// Default Pousada Config
export const DEFAULT_POUSADA_CONFIG: PousadaConfig = {
  id: 'pousada-master-001',
  name: 'Pousada Consciência & Abundância',
  document_cnpj: '12.345.678/0001-90',
  phone: '(71) 9988-7766',
  email: 'contato@pousadaconciencia.com.br',
  address: 'Rua das Flores, 120 - Vila Balneária',
  default_checkin_time: '14:00',
  default_checkout_time: '12:00',
  timezone: 'America/Bahia'
};

// Initial Default Rooms
export const DEFAULT_ROOMS: Room[] = [
  { id: 'room-101', pousada_id: DEFAULT_POUSADA_CONFIG.id, number_name: 'Suíte 01', capacity: 2, status: 'disponivel', active: true, room_type_name: 'Suíte Luxo' },
  { id: 'room-102', pousada_id: DEFAULT_POUSADA_CONFIG.id, number_name: 'Suíte 02', capacity: 3, status: 'disponivel', active: true, room_type_name: 'Suíte Família' },
  { id: 'room-103', pousada_id: DEFAULT_POUSADA_CONFIG.id, number_name: 'Suíte 03', capacity: 2, status: 'disponivel', active: true, room_type_name: 'Suíte Standard' },
  { id: 'room-104', pousada_id: DEFAULT_POUSADA_CONFIG.id, number_name: 'Chalé 01', capacity: 4, status: 'disponivel', active: true, room_type_name: 'Chalé Vista Mar' },
  { id: 'room-105', pousada_id: DEFAULT_POUSADA_CONFIG.id, number_name: 'Chalé 02', capacity: 4, status: 'limpeza', active: true, room_type_name: 'Chalé Vista Mar' },
  { id: 'room-106', pousada_id: DEFAULT_POUSADA_CONFIG.id, number_name: 'Quarto 06', capacity: 2, status: 'manutencao', active: true, room_type_name: 'Standard' }
];

// Seed Guests derived from prototype and initial data
export const SEED_GUESTS: Guest[] = [
  {
    id: 'guest-seed-1',
    pousada_id: DEFAULT_POUSADA_CONFIG.id,
    internal_code: 'HSP-00000001',
    full_name: 'Carlos Eduardo Oliveira',
    cpf: '12345678901',
    phone: '71988776655',
    email: 'carlos.eduardo@email.com',
    city: 'Salvador',
    state: 'BA',
    neighborhood: 'Pituba',
    country: 'Brasil',
    is_incomplete: false,
    preferences: 'Gosta de quarto silencioso no térreo.',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z'
  },
  {
    id: 'guest-seed-2',
    pousada_id: DEFAULT_POUSADA_CONFIG.id,
    internal_code: 'HSP-00000002',
    full_name: 'Mariana Santos Silva',
    cpf: '98765432100',
    phone: '11977665544',
    email: 'mariana.silva@email.com',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Moema',
    country: 'Brasil',
    is_incomplete: false,
    preferences: 'Alergia a travesseiro de penas.',
    created_at: '2026-09-05T14:30:00Z',
    updated_at: '2026-09-05T14:30:00Z'
  },
  {
    id: 'guest-seed-3',
    pousada_id: DEFAULT_POUSADA_CONFIG.id,
    internal_code: 'HSP-00000003',
    full_name: 'Jean-Luc Dubois',
    alt_doc_type: 'Passaporte',
    alt_doc_number: 'FR88992211',
    alt_doc_country: 'França',
    phone: '557199112233',
    email: 'jean.dubois@email.fr',
    city: 'Paris',
    country: 'França',
    is_incomplete: false,
    preferences: 'Café da manhã sem glúten.',
    created_at: '2026-09-10T11:15:00Z',
    updated_at: '2026-09-10T11:15:00Z'
  }
];

export const SEED_STAYS: Stay[] = [
  {
    id: 'stay-seed-1',
    pousada_id: DEFAULT_POUSADA_CONFIG.id,
    guest_id: 'guest-seed-1',
    room_id: 'room-101',
    check_in_expected: `${getOperationalDateString()}T14:00:00-03:00`,
    check_in_actual: `${getOperationalDateString()}T14:15:00-03:00`,
    check_out_expected: `${getOperationalDateString(new Date(Date.now() + 86400000))}T12:00:00-03:00`,
    party_size: 2,
    agreed_amount: 450.00,
    notes: 'Chegada no início da tarde.',
    status: 'hospedado',
    created_at: `${getOperationalDateString()}T10:00:00-03:00`,
    updated_at: `${getOperationalDateString()}T14:15:00-03:00`
  },
  {
    id: 'stay-seed-2',
    pousada_id: DEFAULT_POUSADA_CONFIG.id,
    guest_id: 'guest-seed-2',
    room_id: 'room-102',
    check_in_expected: '2026-09-10T14:00:00-03:00',
    check_in_actual: '2026-09-10T14:00:00-03:00',
    check_out_expected: '2026-09-15T12:00:00-03:00',
    check_out_actual: '2026-09-15T11:45:00-03:00',
    party_size: 3,
    agreed_amount: 1250.00,
    notes: 'Estadia finalizada sem pendências.',
    status: 'finalizada',
    created_at: '2026-09-05T14:30:00Z',
    updated_at: '2026-09-15T11:45:00Z'
  }
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    pousada_id: DEFAULT_POUSADA_CONFIG.id,
    user_name: 'Sistema (Inicialização)',
    entity_name: 'Hóspede',
    entity_id: 'guest-seed-1',
    action: 'INSERT',
    payload: { details: 'Cadastro inicial de Carlos Eduardo Oliveira' },
    created_at: '2026-09-01T10:00:00Z'
  }
];

export const SEED_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    stay_id: 'stay-seed-1',
    amount: 450.00,
    payment_method: 'Pix',
    paid_at: `${getOperationalDateString()}T14:15:00-03:00`,
    notes: 'Pagamento integral via Pix na entrada'
  },
  {
    id: 'pay-2',
    stay_id: 'stay-seed-2',
    amount: 1250.00,
    payment_method: 'Cartão de Crédito',
    paid_at: '2026-09-10T14:00:00-03:00',
    notes: 'Sinal e saldo parcelado no cartão'
  }
];

interface LocalStoreSchema {
  config: PousadaConfig;
  guests: Guest[];
  stays: Stay[];
  rooms: Room[];
  payments: Payment[];
  auditLogs: AuditLog[];
  importHistory: ImportHistoryItem[];
  guestCodeSequence: number;
}

function getLocalStore(): LocalStoreSchema {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.guests) || !Array.isArray(parsed.stays) || !Array.isArray(parsed.rooms) || !parsed.config) throw new Error();
      return { ...parsed, payments: parsed.payments || [], auditLogs: parsed.auditLogs || [], importHistory: parsed.importHistory || [] };
    } catch {
      throw new Error('Os dados locais não puderam ser lidos. Preserve o armazenamento e recupere um backup; nenhum dado foi substituído.');
    }
  }
  const initial: LocalStoreSchema = JSON.parse(JSON.stringify({
    config: DEFAULT_POUSADA_CONFIG, guests: SEED_GUESTS, stays: SEED_STAYS,
    rooms: DEFAULT_ROOMS, payments: SEED_PAYMENTS, auditLogs: SEED_AUDIT_LOGS,
    importHistory: [], guestCodeSequence: 4
  }));
  saveLocalStore(initial);
  return initial;
}

function saveLocalStore(store: LocalStoreSchema) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  notifyDataChanged();
}

function requireLocalMode() {
  if (isSupabaseConfigured) throw new Error('Esta operação local não está disponível com Supabase configurado. Nenhum dado foi salvo no navegador.');
}

// Generate Next Guest Internal Code
export function generateGuestCode(seqNumber?: number): string {
  const store = getLocalStore();
  const nextSeq = seqNumber || store.guestCodeSequence;
  return `HSP-${String(nextSeq).padStart(8, '0')}`;
}

// Data Repository Service API
export const dataService = {

  async fetchGuests(params: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    filterMode?: 'todos' | 'hospedados' | 'sem_hospedagem';
    cityFilter?: string;
    stateFilter?: string;
    neighborhoodFilter?: string;
    sortBy?: 'name' | 'code' | 'last_stay' | 'stays_count';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: Guest[]; totalCount: number }> {

    const {
      page = 1,
      pageSize = 10,
      searchQuery = '',
      filterMode = 'todos',
      cityFilter = '',
      stateFilter = '',
      neighborhoodFilter = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = params;

    const store = isSupabaseConfigured
      ? { guests: await cloudStore.guests(), stays: await cloudStore.stays() }
      : getLocalStore();
    let guests = store.guests.filter(g => !g.archived_at);

    // Compute stats for all guests
    const todayStr = getOperationalDateString();
    guests = guests.map(guest => {
      const guestStays = store.stays.filter(s => s.guest_id === guest.id);
      // Valid stay count: ONLY completed or currently hosted. Cancelled/NoShow excluded!
      const validStays = guestStays.filter(s => s.status === 'hospedado' || s.status === 'finalizada');
      const isHosted = guestStays.some(s => s.status === 'hospedado');
      const sortedDates = [...validStays].sort((a, b) => new Date(b.check_in_expected).getTime() - new Date(a.check_in_expected).getTime());

      return {
        ...guest,
        total_stays_count: validStays.length,
        last_stay_date: sortedDates[0]?.check_in_expected,
        is_currently_hosted: isHosted
      };
    });

    // Apply Filter Mode
    if (filterMode === 'hospedados') {
      guests = guests.filter(g => g.is_currently_hosted);
    } else if (filterMode === 'sem_hospedagem') {
      guests = guests.filter(g => (g.total_stays_count || 0) === 0);
    }

    // Apply Location Filters
    if (cityFilter) {
      const normCity = normalizeSearchText(cityFilter);
      guests = guests.filter(g => normalizeSearchText(g.city || '').includes(normCity));
    }
    if (stateFilter) {
      const normState = normalizeSearchText(stateFilter);
      guests = guests.filter(g => normalizeSearchText(g.state || '').includes(normState));
    }
    if (neighborhoodFilter) {
      const normBairro = normalizeSearchText(neighborhoodFilter);
      guests = guests.filter(g => normalizeSearchText(g.neighborhood || '').includes(normBairro));
    }

    // Apply Search Bar Query
    if (searchQuery.trim()) {
      const digits = onlyDigits(searchQuery);
      const normQuery = normalizeSearchText(searchQuery);

      if (digits.length >= 4) {
        guests = guests.filter(g => 
          onlyDigits(g.cpf || '').includes(digits) ||
          onlyDigits(g.phone || '').includes(digits) ||
          onlyDigits(g.internal_code || '').includes(digits)
        );
      } else {
        guests = guests.filter(g =>
          normalizeSearchText(g.full_name).includes(normQuery) ||
          normalizeSearchText(g.city || '').includes(normQuery) ||
          normalizeSearchText(g.internal_code).includes(normQuery)
        );
      }
    }

    // Apply Sorting
    guests.sort((a, b) => {
      let valA: any = a.full_name;
      let valB: any = b.full_name;
      if (sortBy === 'code') {
        valA = a.internal_code;
        valB = b.internal_code;
      } else if (sortBy === 'last_stay') {
        valA = a.last_stay_date || '';
        valB = b.last_stay_date || '';
      } else if (sortBy === 'stays_count') {
        valA = a.total_stays_count || 0;
        valB = b.total_stays_count || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = guests.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = guests.slice(startIndex, startIndex + pageSize);

    return { data: paginated, totalCount };
  },

  async getGuestById(id: string): Promise<Guest | null> {
    if (isSupabaseConfigured) {
      const { data } = await this.fetchGuests({ pageSize: Number.MAX_SAFE_INTEGER });
      return data.find(g => g.id === id) || null;
    }

    const store = getLocalStore();
    const guest = store.guests.find(g => g.id === id);
    if (!guest) return null;

    const stays = store.stays.filter(s => s.guest_id === id);
    const validStays = stays.filter(s => s.status === 'hospedado' || s.status === 'finalizada');
    return {
      ...guest,
      total_stays_count: validStays.length,
      is_currently_hosted: stays.some(s => s.status === 'hospedado')
    };
  },

  async saveGuest(guestData: Partial<Guest>, actorName: string = 'Usuário'): Promise<Guest> {
    const now = new Date().toISOString();
    
    if (isSupabaseConfigured) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error('Entre na sua conta para salvar.');
      const { data: profile, error: profileError } = await supabase.from('user_profiles').select('*').eq('id', sessionData.session.user.id).single();
      if (profileError) throw profileError;
      if (!profile?.active || !['admin', 'recepcao'].includes(profile.role)) throw new Error('Sem permissão para alterar hóspedes.');
      const { id, total_stays_count, last_stay_date, is_currently_hosted, ...fields } = guestData;
      const payload = { ...fields, cpf: fields.cpf ? onlyDigits(fields.cpf) : null, pousada_id: profile.pousada_id, updated_at: now };
      const query = id ? supabase.from('guests').update(payload).eq('id', id) : supabase.from('guests').insert(payload);
      const { data, error } = await query.select().single();
      if (error) throw error;
      notifyDataChanged();
      return data;
    }

    // Local Storage Fallback
    const store = getLocalStore();
    const candidate = { ...store.guests.find(g => g.id === guestData.id), ...guestData };
    if (!candidate.full_name?.trim() || !onlyDigits(candidate.phone || '')) throw new Error('Informe nome e telefone do hóspede.');
    const cpf = onlyDigits(candidate.cpf || '');
    if (cpf && store.guests.some(g => g.id !== guestData.id && onlyDigits(g.cpf || '') === cpf)) throw new Error('Já existe um hóspede com este CPF. Localize e reutilize o cadastro.');
    guestData = { ...guestData, cpf: cpf || undefined, phone: onlyDigits(candidate.phone || '') };
    let saved: Guest;

    if (guestData.id) {
      const existingIndex = store.guests.findIndex(g => g.id === guestData.id);
      if (existingIndex < 0) throw new Error('Hóspede não encontrado para atualização.');
      
      saved = {
        ...store.guests[existingIndex],
        ...guestData,
        updated_at: now
      };
      store.guests[existingIndex] = saved;

      store.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        pousada_id: store.config.id,
        user_name: actorName,
        entity_name: 'Hóspede',
        entity_id: saved.id,
        action: 'UPDATE',
        payload: { updated_fields: Object.keys(guestData) },
        created_at: now
      });
    } else {
      const code = generateGuestCode(store.guestCodeSequence);
      store.guestCodeSequence += 1;
      
      saved = {
        id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        pousada_id: store.config.id,
        internal_code: code,
        full_name: guestData.full_name || '',
        phone: onlyDigits(guestData.phone || ''),
        cpf: guestData.cpf ? onlyDigits(guestData.cpf) : undefined,
        alt_doc_type: guestData.alt_doc_type,
        alt_doc_number: guestData.alt_doc_number,
        alt_doc_country: guestData.alt_doc_country,
        email: guestData.email,
        birth_date: guestData.birth_date,
        city: guestData.city,
        state: guestData.state,
        neighborhood: guestData.neighborhood,
        street: guestData.street,
        number: guestData.number,
        complement: guestData.complement,
        zip_code: guestData.zip_code,
        country: guestData.country || 'Brasil',
        preferences: guestData.preferences,
        is_incomplete: guestData.is_incomplete ?? false,
        created_at: now,
        updated_at: now
      };
      store.guests.push(saved);

      store.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        pousada_id: store.config.id,
        user_name: actorName,
        entity_name: 'Hóspede',
        entity_id: saved.id,
        action: 'INSERT',
        payload: { internal_code: saved.internal_code, full_name: saved.full_name },
        created_at: now
      });
    }

    saveLocalStore(store);
    return saved;
  },

  async fetchStays(params: {
    guestId?: string;
    roomId?: string;
    date?: string;
    statusFilter?: string;
    periodStart?: string;
    periodEnd?: string;
  }): Promise<Stay[]> {

    const store = isSupabaseConfigured ? null : getLocalStore();
    const source = isSupabaseConfigured ? await cloudStore.stays() : store!.stays;
    let stays = [...source];

    if (params.guestId) {
      stays = stays.filter(s => s.guest_id === params.guestId);
    }
    if (params.roomId) {
      stays = stays.filter(s => s.room_id === params.roomId);
    }
    if (params.statusFilter) {
      stays = stays.filter(s => s.status === params.statusFilter);
    }
    if (params.date) {
      const targetDate = params.date;
      stays = stays.filter(s => {
        const checkIn = s.check_in_expected.split('T')[0];
        const checkOut = s.check_out_expected.split('T')[0];
        return checkIn <= targetDate && checkOut >= targetDate;
      });
    }

    if (params.periodStart) stays = stays.filter(s => s.check_out_expected >= params.periodStart!);
    if (params.periodEnd) stays = stays.filter(s => s.check_in_expected <= params.periodEnd!);
    if (!store) return stays.sort((a, b) => b.check_in_expected.localeCompare(a.check_in_expected));
    // Attach guest and room data
    return stays.map(stay => ({
      ...stay,
      guest: store.guests.find(g => g.id === stay.guest_id),
      room: store.rooms.find(r => r.id === stay.room_id),
      payments: store.payments.filter(p => p.stay_id === stay.id)
    })).sort((a, b) => new Date(b.check_in_expected).getTime() - new Date(a.check_in_expected).getTime());
  },

  async saveStay(stayData: Partial<Stay>, actorName: string = 'Usuário'): Promise<Stay> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured) return cloudStore.saveStay(stayData);
    const store = getLocalStore();

    const previous = store.stays.find(s => s.id === stayData.id);
    if (stayData.id && !previous) throw new Error('Hospedagem não encontrada.');
    stayData = { ...previous, ...stayData, status: stayData.status || previous?.status || 'hospedado' };
    validateStay(stayData, store.guests, store.rooms, store.stays);

    let saved: Stay;
    if (stayData.id) {
      const idx = store.stays.findIndex(s => s.id === stayData.id);
      if (idx < 0) throw new Error('Hospedagem não encontrada.');
      saved = {
        ...store.stays[idx],
        ...stayData,
        updated_at: now
      } as Stay;
      store.stays[idx] = saved;
    } else {
      saved = {
        id: `stay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        pousada_id: store.config.id,
        guest_id: stayData.guest_id!,
        room_id: stayData.room_id!,
        check_in_expected: stayData.check_in_expected || `${getOperationalDateString()}T14:00:00-03:00`,
        check_in_actual: stayData.status === 'hospedado' ? now : undefined,
        check_out_expected: stayData.check_out_expected || `${getOperationalDateString()}T12:00:00-03:00`,
        party_size: stayData.party_size || 1,
        agreed_amount: stayData.agreed_amount || 0,
        notes: stayData.notes || '',
        status: stayData.status || 'hospedado',
        created_at: now,
        updated_at: now
      };
      store.stays.push(saved);
    }

    // Save Companions if provided
    if (stayData.companions && Array.isArray(stayData.companions)) {
      saved.companions = stayData.companions.map(c => ({ ...c, id: c.id || crypto.randomUUID(), stay_id: saved.id }));
    }

    if (saved.status === 'finalizada' && previous?.status === 'hospedado') {
      saved.check_out_actual = saved.check_out_actual || now;
      const room = store.rooms.find(r => r.id === saved.room_id);
      if (room) room.status = 'limpeza';
    }
    if (saved.status === 'hospedado') saved.check_in_actual = saved.check_in_actual || now;
    store.auditLogs.unshift({
      id: crypto.randomUUID(),
      pousada_id: store.config.id,
      user_name: actorName,
      entity_name: 'Hospedagem',
      entity_id: saved.id,
      action: stayData.id ? 'UPDATE' : 'INSERT',
      payload: { status: saved.status, room_id: saved.room_id },
      created_at: now
    });

    saveLocalStore(store);
    return saved;
  },

  async fetchRooms(): Promise<Room[]> {
    if (isSupabaseConfigured) return cloudStore.rooms();
    const store = getLocalStore();
    return store.rooms;
  },

  async saveRoom(roomData: Partial<Room>): Promise<Room> {
    if (isSupabaseConfigured) return cloudStore.saveRoom(roomData);
    const store = getLocalStore();
    if (roomData.capacity !== undefined && (!Number.isInteger(roomData.capacity) || roomData.capacity < 1)) throw new Error('Capacidade inválida.');
    if (roomData.number_name !== undefined && !roomData.number_name.trim()) throw new Error('Informe o nome do quarto.');
    let saved: Room;
    if (roomData.id) {
      const idx = store.rooms.findIndex(r => r.id === roomData.id);
      if (idx < 0) throw new Error('Quarto não encontrado.');
      saved = { ...store.rooms[idx], ...roomData };
      store.rooms[idx] = saved;
    } else {
      saved = {
        id: `room-${Date.now()}`,
        pousada_id: store.config.id,
        number_name: roomData.number_name || 'Nova Acomodação',
        capacity: roomData.capacity || 2,
        status: roomData.status || 'disponivel',
        active: true,
        notes: roomData.notes,
        room_type_name: roomData.room_type_name || 'Standard'
      };
      store.rooms.push(saved);
    }
    saveLocalStore(store);
    return saved;
  },

  async fetchAuditLogs(entityId?: string): Promise<AuditLog[]> {
    if (isSupabaseConfigured) return cloudStore.auditLogs(entityId);
    const store = getLocalStore();
    if (entityId) {
      return store.auditLogs.filter(log => log.entity_id === entityId);
    }
    return store.auditLogs;
  },

  async importDataBatch(params: {
    filename: string; guests: Partial<Guest>[]; stays: Partial<Stay>[]; rooms?: Partial<Room>[];
  }): Promise<{ importedGuestsCount: number; importedStaysCount: number }> {
    requireLocalMode();
    const store = getLocalStore();
    const now = new Date().toISOString();
    const guestMap = new Map<string, string>();
    const roomMap = new Map<string, string>();
    let importedGuestsCount = 0;
    let importedStaysCount = 0;
    for (const room of params.rooms || []) {
      if (!room.id || !room.number_name) throw new Error('Quarto inválido no arquivo.');
      const existing = store.rooms.find(r => r.number_name.toLowerCase() === room.number_name!.toLowerCase());
      const id = existing?.id || crypto.randomUUID();
      roomMap.set(room.id, id);
      if (!existing) store.rooms.push({ ...room, id, pousada_id: store.config.id, number_name: room.number_name, capacity: room.capacity || 1, active: true, status: 'disponivel' });
    }
    for (const guest of params.guests) {
      if (!guest.id || !guest.full_name?.trim()) throw new Error('Hóspede sem identificador ou nome no arquivo.');
      const cpf = onlyDigits(String(guest.cpf || ''));
      const existing = store.guests.find(g => g.id === guest.id || (!!cpf && onlyDigits(g.cpf || '') === cpf));
      const id = existing?.id || crypto.randomUUID();
      guestMap.set(guest.id, id);
      if (!existing) {
        store.guests.push({ ...guest, id, pousada_id: store.config.id, internal_code: generateGuestCode(store.guestCodeSequence++), full_name: guest.full_name.trim(), cpf: cpf || undefined, phone: onlyDigits(String(guest.phone || '')), country: guest.country || 'Brasil', is_incomplete: !guest.phone, created_at: guest.created_at || now, updated_at: now });
        importedGuestsCount++;
      }
    }
    for (const entry of params.stays) {
      const guest_id = guestMap.get(entry.guest_id || '') || entry.guest_id;
      const room_id = roomMap.get(entry.room_id || '') || entry.room_id;
      const imported: Stay = { ...entry, id: entry.id || crypto.randomUUID(), pousada_id: store.config.id, guest_id: guest_id!, room_id: room_id!, check_in_expected: entry.check_in_expected!, check_out_expected: entry.check_out_expected!, party_size: entry.party_size || 1, agreed_amount: entry.agreed_amount || 0, status: entry.status || 'finalizada', created_at: entry.created_at || now, updated_at: now };
      const existing = store.stays.find(s => s.id === imported.id);
      if (existing) {
        if (existing.guest_id !== imported.guest_id || existing.room_id !== imported.room_id || existing.check_in_expected !== imported.check_in_expected || existing.check_out_expected !== imported.check_out_expected) throw new Error('Identificador de hospedagem já utilizado com outros dados.');
        continue;
      }
      validateStay(imported, store.guests, store.rooms, store.stays);
      store.stays.push(imported);
      importedStaysCount++;
    }
    store.importHistory.unshift({ id: crypto.randomUUID(), pousada_id: store.config.id, filename: params.filename, total_rows: params.guests.length + params.stays.length, imported_guests: importedGuestsCount, imported_stays: importedStaysCount, status: 'sucesso', created_at: now });
    saveLocalStore(store);
    return { importedGuestsCount, importedStaysCount };
  },

  async exportFullDataJSON(): Promise<string> {
    if (isSupabaseConfigured) return cloudStore.exportBackup();
    const store = getLocalStore();
    return JSON.stringify({ ...store, schemaVersion: 2, exportedAt: new Date().toISOString() }, null, 2);},

  async restoreBackup(snapshot: unknown): Promise<void> {
    requireLocalMode();
    const validated = validateSnapshot(snapshot);
    const previous = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (previous) localStorage.setItem(LOCAL_STORAGE_KEY + '_before_restore', previous);
    saveLocalStore(validated);
  },

  async fetchPayments(): Promise<Payment[]> {
    if (isSupabaseConfigured) return cloudStore.payments();
    const store = getLocalStore();
    return store.payments || [];
  },

  async savePayment(paymentData: Partial<Payment>, actorName: string = 'Usuário'): Promise<Payment> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured) return cloudStore.savePayment(paymentData);
    const store = getLocalStore();
    if (!store.stays.some(s => s.id === paymentData.stay_id)) throw new Error('Hospedagem não encontrada.');
    if (!Number.isFinite(paymentData.amount) || paymentData.amount! <= 0) throw new Error('Valor de pagamento inválido.');
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      stay_id: paymentData.stay_id || '',
      amount: paymentData.amount || 0,
      payment_method: paymentData.payment_method || 'Pix',
      paid_at: paymentData.paid_at || now,
      notes: paymentData.notes || ''
    };
    if (!store.payments) store.payments = [];
    store.payments.unshift(newPayment);

    // Record audit log
    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      pousada_id: store.config.id,
      user_name: actorName,
      entity_name: 'Pagamento',
      entity_id: newPayment.id,
      action: 'INSERT',
      payload: { amount: newPayment.amount, method: newPayment.payment_method, stay_id: newPayment.stay_id },
      created_at: now
    });

    saveLocalStore(store);
    return newPayment;
  }
};
