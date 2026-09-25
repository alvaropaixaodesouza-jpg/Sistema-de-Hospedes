import { useAuth } from '../../context/AuthContext';
import { ImportHistoryItem, Room } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';
import { normalizeLegacy, normalizeRows, ImportBatch } from '../../lib/importData';
import { validateSnapshot, Snapshot } from '../../lib/validation';
import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../../lib/storageStore';
import * as XLSX from 'xlsx';
import { Database, Upload, Download, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const DataImportExportView: React.FC<{ onNotify: (msg: string, type?: 'success' | 'error') => void }> = ({ onNotify }) => {
  const { user } = useAuth();
  const canImport = user?.active && ['admin', 'recepcao'].includes(user.role);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const roomNames = availableRooms.map(r=>r.number_name.toLowerCase().trim());
  const [roomTargets, setRoomTargets] = useState<Record<string,string>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  useEffect(() => { dataService.fetchRooms().then(rooms => setAvailableRooms(rooms)).catch(e => setErrorMessage(e.message)); }, []);
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'historico'>('import');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportBatch | null>(null);
  const [backup, setBackup] = useState<Snapshot | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      parseSelectedFile(file);
    }
  };

  const parseSelectedFile = async (file: File, sheetName?: string) => {
    if (busy.current) return;
    busy.current = true;
    setAcknowledged(false);
    setRoomTargets({});
    setErrorMessage('');
    setIsProcessing(true);
    setPreviewData(null);
    setBackup(null);
    setConfirmRestore(false);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Selecione um arquivo de até 10 MB.');
      if (file.name.toLowerCase().endsWith('.json')) {
        setSheetNames([]);
        if (isSupabaseConfigured) throw new Error('No modo Supabase, utilize Excel ou CSV. Restauração de backup JSON está disponível somente no modo local.');
        const text = await file.text();
        const json = JSON.parse(text);
        if (json.config && json.rooms && json.payments) {
          const snapshot = validateSnapshot(json);
          setBackup(snapshot);
          setPreviewData({ guests: snapshot.guests, stays: snapshot.stays });
        } else {
          setPreviewData(normalizeLegacy(json));
        }
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.csv')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const target = sheetName || (workbook.SheetNames.includes('ORIGINAL') ? 'ORIGINAL' : workbook.SheetNames[0]);
        setSheetNames(workbook.SheetNames);
        setSelectedSheet(target);
        const worksheet = workbook.Sheets[target];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rows.length > 10000) throw new Error('Limite de 10000 linhas por lote.');
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(rows)));
        const batchKey = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        setPreviewData({ ...normalizeRows(rows), batchKey });

      }
    } catch (err: any) {
      setErrorMessage(`Erro ao processar o arquivo: ${err.message}`);
    } finally {
      busy.current = false;
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !selectedFile || busy.current || !canImport || (!backup && !acknowledged)) return;
    busy.current = true;
    setErrorMessage('');
    setIsProcessing(true);
    try {
      if (backup) {
        if (!confirmRestore) throw new Error('Confirme a substituição dos dados para restaurar.');
        await dataService.restoreBackup(backup);
        onNotify('Backup restaurado com hóspedes, hospedagens, quartos, pagamentos e configurações.');
      } else {
      const result = await dataService.importDataBatch({
        filename: selectedFile.name,
        ...previewData,
        rooms: previewData.rooms?.map(r=>{ const chosen=availableRooms.find(a=>a.id === roomTargets[r.id || '']); return chosen ? {...r,number_name:chosen.number_name} : r; })
      });
      onNotify(`Importação concluída! ${result.importedGuestsCount} hóspede(s) novo(s) e ${result.importedStaysCount} estadia(s) importadas.`);
      }
      setBackup(null);
      setPreviewData(null);
      setSelectedFile(null);
      setSheetNames([]);
      if (fileInput.current) fileInput.current.value = '';
      setHistory(await dataService.fetchImportHistory());
    } catch (err: any) {
      setErrorMessage(`Falha na gravação da importação: ${err.message}`);
    } finally {
      busy.current = false;
      setIsProcessing(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      const jsonStr = await dataService.exportFullDataJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `backup-pousada-completo-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      onNotify('Backup JSON exportado com sucesso.');
    } catch (err: any) {
      onNotify(`Erro ao exportar JSON: ${(err as Error).message}`, 'error');
    }
  };

  const handleExportExcel = async () => {
    try {
      const { data: guests } = await dataService.fetchGuests({ pageSize: 10000 });
      const stays = await dataService.fetchStays({});

      const guestSheetData = guests.map(g => ({
        'Código':g.internal_code, 'Nome Completo':g.full_name, CPF:g.cpf || '',
        'CPF / documento':g.cpf || g.alt_doc_number || '', Telefone:g.phone || '',
        Endereço:g.street || '', Número:g.number || '', Complemento:g.complement || '', Bairro:g.neighborhood || '',
        Cidade:g.city || '', Estado:g.state || '', CEP:g.zip_code || '', 'E-mail':g.email || '', Observações:g.preferences || ''
      }));
      const staySheetData = stays.map(s => ({
        ...guestSheetData.find(g=>g['Código'] === s.guest?.internal_code),
        'Código Hóspede': s.guest?.internal_code || '',
        'Nome Completo': s.guest?.full_name || '',
        Quarto: s.room?.number_name || '', Entrada:s.check_in_expected.slice(0,10), Saída:s.check_out_expected.slice(0,10),
        'Nº Hóspedes':s.party_size, 'Valor Combinado':s.agreed_amount, Situação:s.status,
        Acompanhantes: (s.companions || []).map(c=>c.full_name + (c.cpf ? ` (${c.cpf})` : '')).join('; '),
        'Observações hospedagem':s.notes || ''
      }));
      const wb = XLSX.utils.book_new();
      const imported = [...staySheetData, ...guestSheetData.filter(g=>!stays.some(s=>s.guest?.internal_code === g['Código']))];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(imported), 'IMPORTAR');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guestSheetData), 'Hóspedes');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staySheetData), 'Hospedagens');
      const payments = await dataService.fetchPayments();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), 'Pagamentos');

      XLSX.writeFile(wb, `relatorio-pousada-${new Date().toISOString().slice(0, 10)}.xlsx`);
      onNotify('Planilha Excel exportada com sucesso.');
    } catch (err: any) {
      onNotify(`Erro ao exportar Excel: ${(err as Error).message}`, 'error');
    }
  };

  return (
    <div className="data-import-export-container">
      {/* Section Toolbar */}
      <div className="section-toolbar">
        <div className="toolbar-title-group">
          <h2>Módulo de Dados: Importação & Exportação</h2>
          <p>Importe planilhas Excel/CSV com conferência de clientes, hospedagens e acompanhantes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="drawer-tabs" style={{ marginBottom: '16px', background: 'var(--paper)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
        <button className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>
          <Upload size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Importar Dados
        </button>
        <button className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>
          <Download size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Exportar & Backups
        </button>
      </div>

      <button className="btn btn-secondary" onClick={async () => { setActiveTab('historico'); try { setHistory(await dataService.fetchImportHistory()); setErrorMessage(''); } catch (e: any) { setErrorMessage(e.message); } }}>Histórico de importações</button>
      {errorMessage && <p role="alert" style={{ color: '#a32222', whiteSpace: 'pre-wrap' }}>{errorMessage}</p>}
      {activeTab === 'historico' && <div className="pms-card">{history.length === 0 ? <p>Nenhuma importação registrada.</p> : history.map(h => <details key={h.id}><summary>{h.filename} — {new Date(h.created_at).toLocaleString('pt-BR')} — {h.imported_guests} clientes / {h.imported_stays} hospedagens</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(h.details, null, 2)}</pre></details>)}</div>}
      {/* Content */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p role="status">{isSupabaseConfigured ? 'Excel e CSV serão gravados no banco Supabase da sua pousada após a conferência. O arquivo é lido no navegador; os registros são enviados ao banco.' : 'Modo local: os registros serão salvos somente neste navegador.'}</p>
          {!canImport && <p>Seu perfil permite somente consulta. Entre com uma conta de recepção ou administrador para importar.</p>}
          {/* File Selector */}
          <div style={{ background: 'var(--paper)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '2px dashed #cfd5d1', textAlign: 'center' }}>
            <Upload size={36} color="var(--accent)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', color: 'var(--ink)' }}>Selecione o arquivo para importação</h3>
            <p style={{ fontSize: '12px', color: '#6b7773', margin: '6px 0 16px' }}>
              Suporta backup JSON do protótipo (ex.: <code>backup-hospedes.json</code>) ou planilhas Excel (.xlsx) / CSV.
            </p>
            <input
              type="file"
              ref={fileInput}
              aria-label="Selecionar planilha para importação"
              accept={isSupabaseConfigured ? ".xlsx,.csv" : ".json,.xlsx,.csv"}
              onChange={handleFileChange}
              disabled={isProcessing || !canImport}
              style={{ display: 'inline-block' }}
            />
          </div>

          {sheetNames.length > 0 && <label>Aba com os clientes <select className="form-control" value={selectedSheet} disabled={isProcessing} onChange={e => { if (selectedFile) void parseSelectedFile(selectedFile, e.target.value); }}>{sheetNames.map(name => <option key={name}>{name}</option>)}</select></label>}
          {/* Preview Box */}
          {previewData && (
            <div style={{ background: 'var(--paper)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
              <h4 style={{ fontSize: '15px', color: 'var(--ink)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} color="var(--success)" /> Prévia do Lote a Importar
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#faf8f3', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                <div>
                  <strong>Hóspedes Únicos Identificados:</strong> {previewData.guests.length} cadastro(s)
                </div>
                <div>
                  <strong>Total de Hospedagens no Lote:</strong> {previewData.stays.length} estadia(s)
                </div>
              </div>

              {!backup && <>
                <p>Sem coluna Situação, as hospedagens entram como finalizadas. Valor combinado não representa pagamento recebido.</p>
                <p>Novas acomodações: {(previewData.rooms || []).filter(r => !roomNames.includes((r.number_name || '').toLowerCase().trim())).map(r => r.number_name).join(', ') || 'nenhuma'}. A correspondência usa o nome completo do quarto; confira antes de confirmar.</p>
                <fieldset><legend>Conferir quartos</legend>{previewData.rooms?.map(r => <label key={r.id} style={{display:'block',marginBottom:8}}>{r.number_name}<select className="form-control" disabled={isProcessing} value={roomTargets[r.id || ''] || ''} onChange={e=>{setRoomTargets({...roomTargets,[r.id || '']:e.target.value});setAcknowledged(false);}}><option value="">{roomNames.includes((r.number_name || '').toLowerCase().trim()) ? 'Usar quarto com o mesmo nome' : `Criar acomodação: ${r.number_name}`}</option>{availableRooms.map(a=><option value={a.id} key={a.id}>{a.number_name} — {a.capacity} pessoas</option>)}</select></label>)}</fieldset>
                {!!previewData.warnings?.length && <details open><summary>{previewData.warnings.length} avisos para revisão</summary><ul style={{ maxHeight: 240, overflow: 'auto' }}>{previewData.warnings.map((w,i) => <li key={i}>{w}</li>)}</ul></details>}
                <div style={{ overflow: 'auto', maxHeight: 300 }}><table><thead><tr><th>Nome</th><th>Cidade</th><th>Telefone</th><th>Hospedagens</th></tr></thead><tbody>{previewData.guests.map(g => <tr key={g.id}><td>{g.full_name}</td><td>{g.city}</td><td>{g.phone}</td><td>{previewData.stays.filter(s => s.guest_id === g.id).length}</td></tr>)}</tbody></table></div>
                <label><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /> Conferi os clientes, as acomodações e os avisos. Autorizo importar os registros válidos exibidos.</label>
              </>}
              {backup ? <label style={{ display: 'block', marginBottom: 16 }}><input type="checkbox" checked={confirmRestore} onChange={e => setConfirmRestore(e.target.checked)} /> Confirmo substituir os dados locais por este backup. Uma cópia do estado anterior será preservada neste navegador.</label> : <p style={{ marginBottom: 16 }}>A importação adiciona registros. Quando o arquivo antigo não informa a saída, ela será estimada para o dia seguinte e sinalizada nas observações.</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setPreviewData(null)} disabled={isProcessing}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleConfirmImport} disabled={isProcessing || !canImport || (backup ? !confirmRestore : !acknowledged)}>
                  {isProcessing ? 'Salvando...' : backup ? 'Restaurar backup' : 'Confirmar importação'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div style={{ background: 'var(--paper)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#faf8f3', padding: '20px', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <h4 style={{ fontSize: '15px', color: 'var(--ink)', marginBottom: '8px' }}>Exportar Backup JSON Completo</h4>
            <p style={{ fontSize: '12px', color: '#6b7773', marginBottom: '16px' }}>
              Baixa um arquivo JSON com a estrutura total do banco de dados (Hóspedes, Estadias, Quartos e Configurações) compatível para restauração.
            </p>
            <button className="btn btn-primary" onClick={handleExportJSON}>
              <Download size={15} /> Baixar Backup JSON
            </button>
          </div>

          <div style={{ background: '#faf8f3', padding: '20px', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <h4 style={{ fontSize: '15px', color: 'var(--ink)', marginBottom: '8px' }}>Exportar Relatório Excel (.xlsx)</h4>
            <p style={{ fontSize: '12px', color: '#6b7773', marginBottom: '16px' }}>
              Gera planilha com abas separadas de Hóspedes e Hospedagens com colunas formatadas.
            </p>
            <button className="btn btn-secondary" onClick={handleExportExcel}>
              <Download size={15} /> Baixar Planilha Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
