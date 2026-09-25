import { isSupabaseConfigured } from '../../lib/supabase';
import { normalizeLegacy, normalizeRows, ImportBatch } from '../../lib/importData';
import { validateSnapshot, Snapshot } from '../../lib/validation';
import React, { useState } from 'react';
import { dataService } from '../../lib/storageStore';
import * as XLSX from 'xlsx';
import { Database, Upload, Download, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const DataImportExportView: React.FC<{ onNotify: (msg: string, type?: 'success' | 'error') => void }> = ({ onNotify }) => {
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

  const parseSelectedFile = async (file: File) => {
    setIsProcessing(true);
    setPreviewData(null);
    setBackup(null);
    setConfirmRestore(false);
    try {
      if (file.name.toLowerCase().endsWith('.json')) {
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
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        setPreviewData(normalizeRows(rows));

      }
    } catch (err: any) {
      onNotify(`Erro ao processar o arquivo: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !selectedFile) return;
    setIsProcessing(true);
    try {
      if (backup) {
        if (!confirmRestore) throw new Error('Confirme a substituição dos dados para restaurar.');
        await dataService.restoreBackup(backup);
        onNotify('Backup restaurado com hóspedes, hospedagens, quartos, pagamentos e configurações.');
      } else {
      const result = await dataService.importDataBatch({
        filename: selectedFile.name,
        ...previewData
      });
      onNotify(`Importação concluída! ${result.importedGuestsCount} hóspede(s) novo(s) e ${result.importedStaysCount} estadia(s) importadas.`);
      }
      setBackup(null);
      setPreviewData(null);
      setSelectedFile(null);
    } catch (err: any) {
      onNotify(`Falha na gravação da importação: ${err.message}`, 'error');
    } finally {
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
      onNotify('Erro ao exportar JSON.', 'error');
    }
  };

  const handleExportExcel = async () => {
    try {
      const { data: guests } = await dataService.fetchGuests({ pageSize: 10000 });
      const stays = await dataService.fetchStays({});

      const guestSheetData = guests.map(g => ({
        'Código': g.internal_code,
        'Nome Completo': g.full_name,
        'CPF': g.cpf || '',
        'Telefone': g.phone || '',
        'Cidade': g.city || '',
        'Estado': g.state || '',
        'Visitas Realizadas': g.total_stays_count || 0
      }));

      const staySheetData = stays.map(s => ({
        'Hóspede': s.guest?.full_name || '',
        'Código Hóspede': s.guest?.internal_code || '',
        'Quarto': s.room?.number_name || '',
        'Entrada': s.check_in_expected,
        'Saída': s.check_out_expected,
        'Nº Hóspedes': s.party_size,
        'Valor Combinado': s.agreed_amount,
        'Situação': s.status
      }));

      const wb = XLSX.utils.book_new();
      const wsGuests = XLSX.utils.json_to_sheet(guestSheetData);
      const wsStays = XLSX.utils.json_to_sheet(staySheetData);

      XLSX.utils.book_append_sheet(wb, wsGuests, 'Hóspedes');
      XLSX.utils.book_append_sheet(wb, wsStays, 'Hospedagens');

      XLSX.writeFile(wb, `relatorio-pousada-${new Date().toISOString().slice(0, 10)}.xlsx`);
      onNotify('Planilha Excel exportada com sucesso.');
    } catch (err: any) {
      onNotify('Erro ao exportar Excel.', 'error');
    }
  };

  return (
    <div className="data-import-export-container">
      {/* Section Toolbar */}
      <div className="section-toolbar">
        <div className="toolbar-title-group">
          <h2>Módulo de Dados: Importação & Exportação</h2>
          <p>Importe arquivos do protótipo antigo em HTML/JSON ou planilhas Excel/CSV com mapeamento prévio</p>
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

      {/* Content */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isSupabaseConfigured && <p role="status">A importação e a restauração por arquivo estão disponíveis somente no modo local. A exportação do Supabase está disponível na aba de backups.</p>}
          {/* File Selector */}
          <div style={{ background: 'var(--paper)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '2px dashed #cfd5d1', textAlign: 'center' }}>
            <Upload size={36} color="var(--accent)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', color: 'var(--ink)' }}>Selecione o arquivo para importação</h3>
            <p style={{ fontSize: '12px', color: '#6b7773', margin: '6px 0 16px' }}>
              Suporta backup JSON do protótipo (ex.: <code>backup-hospedes.json</code>) ou planilhas Excel (.xlsx) / CSV.
            </p>
            <input
              type="file"
              accept=".json,.xlsx,.csv"
              onChange={handleFileChange}
              disabled={isProcessing || isSupabaseConfigured}
              style={{ display: 'inline-block' }}
            />
          </div>

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

              {backup ? <label style={{ display: 'block', marginBottom: 16 }}><input type="checkbox" checked={confirmRestore} onChange={e => setConfirmRestore(e.target.checked)} /> Confirmo substituir os dados locais por este backup. Uma cópia do estado anterior será preservada neste navegador.</label> : <p style={{ marginBottom: 16 }}>A importação adiciona registros. Quando o arquivo antigo não informa a saída, ela será estimada para o dia seguinte e sinalizada nas observações.</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setPreviewData(null)} disabled={isProcessing}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleConfirmImport} disabled={isProcessing || (!!backup && !confirmRestore)}>
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
