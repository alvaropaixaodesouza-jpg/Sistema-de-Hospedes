import React, { useState, useEffect } from 'react';
import { Guest } from '../../types';
import { formatCPF, formatPhone, isValidCPF, onlyDigits } from '../../lib/formatters';
import { X, User, Phone, MapPin, FileText, CheckCircle } from 'lucide-react';

interface GuestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guestData: Partial<Guest>) => Promise<void>;
  initialData?: Guest | null;
}

export const GuestFormModal: React.FC<GuestFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [altDocType, setAltDocType] = useState('Passaporte');
  const [altDocNumber, setAltDocNumber] = useState('');
  const [altDocCountry, setAltDocCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [preferences, setPreferences] = useState('');
  const [isIncomplete, setIsIncomplete] = useState(false);

  const [cpfError, setCpfError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.full_name || '');
      setCpf(initialData.cpf ? formatCPF(initialData.cpf) : '');
      setAltDocType(initialData.alt_doc_type || 'Passaporte');
      setAltDocNumber(initialData.alt_doc_number || '');
      setAltDocCountry(initialData.alt_doc_country || '');
      setPhone(initialData.phone ? formatPhone(initialData.phone) : '');
      setEmail(initialData.email || '');
      setBirthDate(initialData.birth_date || '');
      setCity(initialData.city || '');
      setState(initialData.state || '');
      setNeighborhood(initialData.neighborhood || '');
      setStreet(initialData.street || '');
      setNumber(initialData.number || '');
      setComplement(initialData.complement || '');
      setZipCode(initialData.zip_code || '');
      setCountry(initialData.country || 'Brasil');
      setPreferences(initialData.preferences || '');
      setIsIncomplete(initialData.is_incomplete || false);
    } else {
      resetForm();
    }
    setCpfError('');
    setSubmitError('');
  }, [initialData, isOpen]);

  const resetForm = () => {
    setFullName('');
    setCpf('');
    setAltDocType('Passaporte');
    setAltDocNumber('');
    setAltDocCountry('');
    setPhone('');
    setEmail('');
    setBirthDate('');
    setCity('');
    setState('');
    setNeighborhood('');
    setStreet('');
    setNumber('');
    setComplement('');
    setZipCode('');
    setCountry('Brasil');
    setPreferences('');
    setIsIncomplete(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!fullName.trim()) {
      setSubmitError('O nome completo do hóspede é obrigatório.');
      return;
    }

    if (!phone.trim()) {
      setSubmitError('Informe o telefone com DDD do hóspede.');
      return;
    }

    // CPF Validation if entered
    const cleanCpf = onlyDigits(cpf);
    if (cleanCpf.length > 0) {
      if (!isValidCPF(cleanCpf)) {
        setCpfError('CPF inválido: verifique os dígitos digitados.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await onSave({
        id: initialData?.id,
        full_name: fullName.trim(),
        cpf: cleanCpf || undefined,
        alt_doc_type: altDocNumber ? altDocType : undefined,
        alt_doc_number: altDocNumber.trim() || undefined,
        alt_doc_country: altDocCountry.trim() || undefined,
        phone: onlyDigits(phone),
        email: email.trim() || undefined,
        birth_date: birthDate || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        street: street.trim() || undefined,
        number: number.trim() || undefined,
        complement: complement.trim() || undefined,
        zip_code: zipCode.trim() || undefined,
        country: country.trim() || 'Brasil',
        preferences: preferences.trim() || undefined,
        is_incomplete: isIncomplete
      });
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Falha ao salvar dados do hóspede. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="var(--accent)" />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
              {initialData ? `Editar Ficha - ${initialData.internal_code}` : 'Novo Cadastro de Hóspede'}
            </h3>
          </div>
          <button onClick={onClose} style={{ padding: '4px' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
            {submitError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {submitError}
              </div>
            )}

            <div className="form-grid-2">
              {/* Full Name */}
              <div className="form-group full">
                <label>Nome Completo *</label>
                <input
                  className="form-control"
                  type="text"
                  required
                  placeholder="Nome completo do hóspede"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {/* CPF */}
              <div className="form-group">
                <label>CPF (Se houver)</label>
                <input
                  className={`form-control ${cpfError ? 'invalid' : ''}`}
                  type="text"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={cpf}
                  onChange={(e) => {
                    setCpf(formatCPF(e.target.value));
                    setCpfError('');
                  }}
                />
                {cpfError && <span className="form-error-msg">{cpfError}</span>}
              </div>

              {/* Phone */}
              <div className="form-group">
                <label>Celular / Telefone *</label>
                <input
                  className="form-control"
                  type="tel"
                  required
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                />
              </div>

              {/* Alternative Document (Estrangeiros) */}
              <div className="form-group">
                <label>Doc. Alternativo (Estrangeiro/Outro)</label>
                <select 
                  className="form-control"
                  value={altDocType}
                  onChange={(e) => setAltDocType(e.target.value)}
                >
                  <option value="Passaporte">Passaporte</option>
                  <option value="RNE">RNE / RNM</option>
                  <option value="CNH">CNH</option>
                  <option value="RG">RG</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Nº Documento Alternativo</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Número do documento"
                  value={altDocNumber}
                  onChange={(e) => setAltDocNumber(e.target.value)}
                />
              </div>

              {/* Email & Birthdate */}
              <div className="form-group">
                <label>E-mail (Opcional)</label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Data de Nascimento</label>
                <input
                  className="form-control"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>

              {/* Endereço */}
              <div className="form-group">
                <label>Cidade / Origem</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Ex.: Salvador"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Estado (UF)</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Ex.: BA"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                />
              </div>

              <div className="form-group">
                <label>Bairro</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Ex.: Pituba"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>País</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Brasil"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>

              {/* Preferences */}
              <div className="form-group full">
                <label>Preferências Permanentes & Observações da Pessoa</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Ex.: Prefere andar térreo, alergia a poeira, veículo Placa XYZ-1234"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                />
              </div>

              <div className="form-group full" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="chkIncomplete"
                  checked={isIncomplete}
                  onChange={(e) => setIsIncomplete(e.target.checked)}
                />
                <label htmlFor="chkIncomplete" style={{ textTransform: 'none', cursor: 'pointer' }}>
                  Marcar como cadastro incompleto (Faltam documentos ou dados de origem)
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Cadastro do Hóspede'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
