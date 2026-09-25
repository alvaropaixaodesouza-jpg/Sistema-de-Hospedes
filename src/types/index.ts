export type UserRole = 'admin' | 'recepcao' | 'consulta';

export interface UserProfile {
  id: string;
  pousada_id: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface PousadaConfig {
  id: string;
  name: string;
  document_cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  default_checkin_time: string;
  default_checkout_time: string;
  timezone: string;
}

export interface Guest {
  id: string;
  pousada_id: string;
  internal_code: string; // e.g. HSP-00000001
  full_name: string;
  cpf?: string;
  alt_doc_type?: string;
  alt_doc_number?: string;
  alt_doc_country?: string;
  phone: string;
  email?: string;
  birth_date?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  zip_code?: string;
  country: string;
  preferences?: string;
  is_incomplete: boolean;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  // Computed fields
  total_stays_count?: number;
  last_stay_date?: string;
  is_currently_hosted?: boolean;
}

export type RoomOperationalStatus = 'disponivel' | 'limpeza' | 'manutencao' | 'bloqueado';

export interface RoomType {
  id: string;
  pousada_id: string;
  name: string;
  description?: string;
  default_price: number;
}

export interface Room {
  id: string;
  pousada_id: string;
  room_type_id?: string;
  number_name: string; // e.g. "Suíte 01", "Quarto 104"
  capacity: number;
  status: RoomOperationalStatus;
  active: boolean;
  notes?: string;
  room_type_name?: string;
}

export type StayStatus = 'reservada' | 'hospedado' | 'finalizada' | 'cancelada' | 'nao_compareceu';

export interface StayGuestCompanion {
  id: string;
  stay_id: string;
  full_name: string;
  cpf?: string;
  phone?: string;
  is_responsible?: boolean;
}

export interface Stay {
  id: string;
  pousada_id: string;
  guest_id: string;
  room_id: string;
  check_in_expected: string; // ISO string
  check_in_actual?: string;
  check_out_expected: string;
  check_out_actual?: string;
  party_size: number;
  agreed_amount: number;
  notes?: string;
  status: StayStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  guest?: Guest;
  room?: Room;
  companions?: StayGuestCompanion[];
  payments?: Payment[];
}

export interface Payment {
  id: string;
  stay_id: string;
  amount: number;
  payment_method: string; // Pix, Dinheiro, Cartão de Crédito, Cartão de Débito
  paid_at: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  pousada_id: string;
  user_id?: string;
  user_name?: string;
  entity_name: string;
  entity_id: string;
  action: 'INSERT' | 'UPDATE' | 'ARCHIVE' | 'DELETE';
  payload?: any;
  created_at: string;
}

export interface ImportHistoryItem {
  id: string;
  pousada_id: string;
  filename: string;
  total_rows: number;
  imported_guests: number;
  imported_stays: number;
  status: string;
  details?: any;
  created_at: string;
}

export type ActiveSection = 
  | 'inicio'
  | 'hospedes'
  | 'hospedes_duplicidades'
  | 'hospedagens_chegadas'
  | 'hospedagens_hospedados'
  | 'hospedagens_saidas'
  | 'hospedagens_historico'
  | 'hospedagens_timeline'
  | 'quartos'
  | 'reservas'
  | 'pagamentos'
  | 'cadastros'
  | 'relatorios'
  | 'dados'
  | 'configuracoes';
