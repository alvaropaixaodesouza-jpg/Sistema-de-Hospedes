const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');

function setup({ cloud = false, cloudStore = {} } = {}) {
  const memory = new Map();
  let failWrites = false;
  const cache = new Map();
  const localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => { if (failWrites) throw new Error('QuotaExceededError'); memory.set(key, value); } };
  function load(filename) {
    const file = path.resolve(filename);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const context = {
      exports, console, crypto: webcrypto, localStorage,
      require: name => {
        if (name === './supabase') return { isSupabaseConfigured: cloud, supabase: {} };
        if (name === './cloudStore') return { cloudStore };
        if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
        return require(name);
      }
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context, { filename: file });
    return exports;
  }
  return { service: load('src/lib/storageStore.ts').dataService, imports: load('src/lib/importData.ts'), memory, failWrites: () => { failWrites = true; } };
}
const guest = { full_name: 'Teste Recepção', cpf: '11144477735', phone: '71999999999' };
const stay = guest_id => ({ guest_id, room_id: 'room-103', status: 'reservada', check_in_expected: '2030-10-01T14:00:00-03:00', check_out_expected: '2030-10-03T12:00:00-03:00', party_size: 2, agreed_amount: 300 });

test('CPF duplicado é bloqueado na criação e edição, permitindo editar o próprio cadastro', async () => {
  const { service } = setup();
  const first = await service.saveGuest(guest);
  await assert.rejects(service.saveGuest({ ...guest, cpf: '111.444.777-35' }), /CPF/);
  await service.saveGuest({ id: first.id, full_name: 'Nome corrigido' });
  const second = await service.saveGuest({ ...guest, cpf: undefined });
  await assert.rejects(service.saveGuest({ id: second.id, cpf: guest.cpf }), /CPF/);
});

test('reserva valida capacidade, manutenção, limpeza, datas e sobreposição inclusive em alteração parcial', async () => {
  const { service } = setup();
  const g = await service.saveGuest(guest);
  await assert.rejects(service.saveStay({ ...stay(g.id), party_size: 10 }), /capacidade|comporta/);
  await assert.rejects(service.saveStay({ ...stay(g.id), room_id: 'room-106' }), /manutenção/);
  await assert.rejects(service.saveStay({ ...stay(g.id), room_id: 'room-105', status: 'hospedado' }), /limpeza/);
  await assert.rejects(service.saveStay({ ...stay(g.id), check_in_expected: 'inválida' }), /datas/);
  const first = await service.saveStay(stay(g.id));
  await assert.rejects(service.saveStay(stay(g.id)), /Conflito/);
  const next = await service.saveStay({ ...stay(g.id), check_in_expected: first.check_out_expected, check_out_expected: '2030-10-04T12:00:00-03:00' });
  await assert.rejects(service.saveStay({ id: next.id, check_in_expected: first.check_in_expected }), /Conflito/);
});

test('ciclo reserva, acompanhantes, pagamento e checkout preserva histórico e libera para limpeza', async () => {
  const { service } = setup();
  const g = await service.saveGuest(guest);
  const reservation = await service.saveStay({ ...stay(g.id), companions: [{ full_name: 'Acompanhante' }] });
  assert.equal(reservation.companions[0].stay_id, reservation.id);
  await service.saveStay({ id: reservation.id, status: 'hospedado' });
  await service.savePayment({ stay_id: reservation.id, amount: 150 });
  await service.saveStay({ id: reservation.id, status: 'finalizada' });
  assert.equal((await service.fetchRooms()).find(r => r.id === reservation.room_id).status, 'limpeza');
  assert.equal((await service.getGuestById(g.id)).total_stays_count, 1);
  assert.equal((await service.fetchStays({ guestId: g.id }))[0].payments[0].amount, 150);
});

test('backup restaura todos os registros e preserva cópia anterior; rejeita vínculos quebrados', async () => {
  const { service, memory } = setup();
  const g = await service.saveGuest(guest);
  const reservation = await service.saveStay({ ...stay(g.id), companions: [{ full_name: 'Acompanhante' }] });
  await service.savePayment({ stay_id: reservation.id, amount: 150 });
  const original = JSON.parse(await service.exportFullDataJSON());
  await service.saveGuest({ ...guest, full_name: 'Posterior', cpf: undefined });
  await service.restoreBackup(original);
  const restored = JSON.parse(await service.exportFullDataJSON());
  for (const key of ['guests', 'stays', 'rooms', 'payments', 'config', 'auditLogs', 'importHistory']) assert.deepEqual(restored[key], original[key]);
  assert.ok(memory.has('pousada_hospedes_v2_store_before_restore'));
  const bad = structuredClone(original); bad.payments[0].stay_id = 'inexistente';
  const before = memory.get('pousada_hospedes_v2_store');
  await assert.rejects(service.restoreBackup(bad), /pagamento/);
  assert.equal(memory.get('pousada_hospedes_v2_store'), before);
});

test('JSON antigo e planilha repetida mantêm hóspede e todas as visitas vinculadas', async () => {
  const { service, imports } = setup();
  const batch = imports.normalizeLegacy({ guests: [{ id: 'old-g', name: 'Hóspede Antigo', cpf: guest.cpf, phone: guest.phone }], stays: [{ id: 'old-s', guestId: 'old-g', arrivalDate: '2020-01-01', arrivalTime: '14:00', room: 'Quarto Antigo', partySize: 2 }] });
  await service.importDataBatch({ ...batch, filename: 'antigo.json' });
  const saved = (await service.fetchStays({})).find(s => s.id === 'old-s');
  assert.equal(saved.guest.full_name, 'Hóspede Antigo');
  assert.equal(saved.room.number_name, 'Quarto Antigo');
  assert.match(saved.notes, /estimada/);
  assert.equal((await service.importDataBatch({ ...batch, filename: 'antigo.json' })).importedStaysCount, 0);
  const sheet = imports.normalizeRows([{ CPF: guest.cpf, Nome: 'Mesmo Hóspede', Chegada: '01/01/2021', Quarto: 'A' }, { CPF: guest.cpf, Nome: 'Mesmo Hóspede', Chegada: '03/01/2021', Quarto: 'A' }]);
  assert.equal(sheet.guests.length, 1);
  assert.equal(sheet.stays[0].guest_id, sheet.stays[1].guest_id);
  await service.importDataBatch({ ...sheet, filename: 'planilha.csv' });
  assert.ok(Date.parse(sheet.stays[0].check_out_expected) > Date.parse(sheet.stays[0].check_in_expected));
});

test('falha no armazenamento não retorna sucesso nem substitui conteúdo corrompido', async () => {
  const app = setup();
  await app.service.fetchRooms();
  app.failWrites();
  await assert.rejects(app.service.saveGuest(guest), /QuotaExceededError/);
  app.memory.set('pousada_hospedes_v2_store', 'corrompido');
  await assert.rejects(app.service.fetchRooms(), /nenhum dado foi substituído/);
  assert.equal(app.memory.get('pousada_hospedes_v2_store'), 'corrompido');
});

test('Supabase indisponível não faz fallback para registros locais', async () => {
  const unavailable = async () => { throw new Error('Banco indisponível'); };
  const { service, memory } = setup({ cloud: true, cloudStore: { guests: unavailable, stays: unavailable, rooms: unavailable, payments: unavailable, saveStay: unavailable, savePayment: unavailable } });
  for (const call of [() => service.fetchGuests({}), () => service.fetchStays({}), () => service.fetchRooms(), () => service.fetchPayments(), () => service.saveStay({}), () => service.savePayment({})]) await assert.rejects(call(), /Banco indisponível/);
  assert.equal(memory.size, 0);
});

test('Excel original preserva endereço, documento alternativo, valor e acompanhantes', () => {
  const { imports } = setup();
  const batch = imports.normalizeRows([{ Nome:'Pessoa teste', 'CPF / documento':'123456789', Telefone:'(71) 90000-0000', Endereço:'Rua teste', Número:'0', Bairro:'Centro', 'Cidade / origem informada':'Saubara', CEP:'00000-001', 'Contato de emergência':'Contato 123', Acompanhantes:'Pessoa B (000.000.000-00), Pessoa C', 'Valor informado':'R$ 1.234,50', Entrada:'12/09/2026', Saída:'14/09/2026', 'Quarto / unidade':'Quarto 01' }]);
  assert.equal(batch.guests[0].street,'Rua teste');
  assert.equal(batch.guests[0].alt_doc_number,'123456789');
  assert.equal(batch.guests[0].cpf,'');
  assert.match(batch.guests[0].preferences,/Contato de emergência/);
  assert.equal(batch.stays[0].agreed_amount,1234.5);
  assert.equal(batch.stays[0].companions.length,2);
  assert.equal(batch.stays[0].party_size,3);
});

test('Excel não inventa ano, não descarta cliente e informa estadias ambíguas', () => {
  const { imports } = setup();
  const batch = imports.normalizeRows([
    {Nome:'A',Entrada:'16/01',Quarto:'A'},
    {Nome:'B',Entrada:'01/01/2026',Saída:'31/12/2025',Quarto:'A'},
    {Nome:'C',Entrada:'01/01/2026',Quarto:'04/06'},
    {Nome:'D',Entrada:'01/01/2026',Quarto:'A','Valor informado':'R$ 250,00 / R$ 0,00'}
  ]);
  assert.equal(batch.guests.length,4); assert.equal(batch.stays.length,0);
  assert.equal(batch.warnings.filter(w=>w.includes('não incluída')).length,4);
  assert.match(batch.guests[0].preferences,/16\/01/);
});

test('lote com hash pode ser repetido, e outro lote não colide com IDs de linhas', async () => {
  const { service, imports } = setup();
  const batch = imports.normalizeRows([{Nome:'Cliente A',CPF:guest.cpf,Entrada:'01/01/2020',Quarto:'A'}]);
  const params={...batch,batchKey:'a'.repeat(64),filename:'a.xlsx'};
  assert.equal((await service.importDataBatch(params)).importedStaysCount,1);
  assert.equal((await service.importDataBatch(params)).importedStaysCount,0);
  const other=imports.normalizeRows([{Nome:'Cliente B',Entrada:'02/01/2020',Quarto:'B'}]);
  assert.equal((await service.importDataBatch({...other,batchKey:'b'.repeat(64),filename:'b.xlsx'})).importedStaysCount,1);
});

test('importação cloud chama RPC e nunca salva cópia local', async () => {
  let called;
  const {service,memory}=setup({cloud:true,cloudStore:{importDataBatch:async p=>{called=p;return {importedGuestsCount:1,importedStaysCount:0};}}});
  const params={filename:'teste.xlsx',batchKey:'c'.repeat(64),guests:[],stays:[]};
  assert.equal((await service.importDataBatch(params)).importedGuestsCount,1);
  assert.equal(called,params);assert.equal(memory.size,0);
});

test('configurações e tipos persistem no modo local e no backup', async () => {
  const {service}=setup();const c=await service.fetchConfig();
  await service.saveConfig({...c,name:'Pousada teste',default_checkin_time:'15:30'});
  assert.equal((await service.fetchConfig()).default_checkin_time,'15:30');
  await assert.rejects(service.saveConfig({...c,default_checkout_time:'25:00'}),/Horário/);
  await service.saveRoomType({name:'Teste',default_price:123});
  assert.equal((await service.fetchRoomTypes()).length,1);
  const backup=JSON.parse(await service.exportFullDataJSON());
  await service.restoreBackup(backup);
  assert.equal((await service.fetchRoomTypes())[0].name,'Teste');
});

test('seletor Excel fica habilitado no Supabase para recepção e bloqueado para consulta', () => {
  const React = require('react'); const {renderToStaticMarkup} = require('react-dom/server');
  for(const [role,disabled] of [['recepcao',false],['consulta',true]]) {
    const exports={};
    const source=ts.transpileModule(fs.readFileSync('src/components/data/DataImportExportView.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
    vm.runInNewContext(source,{exports,require:name=>{
      if(name.includes('context/AuthContext'))return {useAuth:()=>({user:{active:true,role}})};
      if(name.includes('lib/supabase'))return {isSupabaseConfigured:true};
      if(name.startsWith('.'))return {};
      return require(name);
    }});
    const html=renderToStaticMarkup(React.createElement(exports.DataImportExportView,{onNotify:()=>{}}));
    const input=html.match(/<input[^>]+type="file"[^>]*>/)[0];
    assert.equal(input.includes('disabled'),disabled);
    assert.ok(input.includes('.xlsx,.csv'));
  }
});

test('datas operacionais de timestamps UTC respeitam Bahia', async () => {
  const {service}=setup({cloud:true,cloudStore:{stays:async()=>[{id:'s',check_in_expected:'2030-10-02T01:00:00Z',check_out_expected:'2030-10-02T15:00:00Z'}]}});
  assert.equal((await service.fetchStays({date:'2030-10-01'})).length,1);
});
