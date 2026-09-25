import React, { useEffect, useState } from 'react';
import { dataService } from '../../lib/storageStore';
import { RoomType } from '../../types';
import { useAuth } from '../../context/AuthContext';
export function AuxiliaryView() {
  const { user } = useAuth();
  const [types,setTypes]=useState<RoomType[]>([]);
  const [editing,setEditing]=useState<string | undefined>();
  const [name,setName]=useState(''); const [price,setPrice]=useState('0');
  const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const load=()=>dataService.fetchRoomTypes().then(setTypes).catch(e=>setMessage(e.message));
  useEffect(()=>{void load();},[]);
  const save=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);try{await dataService.saveRoomType({id:editing,name,default_price:Number(price)});setEditing(undefined);setName('');setPrice('0');setMessage('Tipo salvo. Disponível no cadastro de quartos.');await load();}catch(e:any){setMessage(e.message);}finally{setBusy(false);}};
  return <section className="pms-card"><h2>Tipos de acomodação</h2>{message && <p role="status">{message}</p>}
    <form onSubmit={save}><label>Nome<input className="form-control" required value={name} onChange={e=>setName(e.target.value)} /></label><label>Preço de referência (R$)<input className="form-control" type="number" min="0" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)} /></label><button className="btn btn-primary" disabled={busy || user?.role === 'consulta'}>{editing ? 'Salvar alteração' : 'Adicionar tipo'}</button>{editing && <button type="button" className="btn btn-secondary" onClick={()=>{setEditing(undefined);setName('');setPrice('0');}}>Cancelar edição</button>}</form>
    <ul>{types.map(t=><li key={t.id}>{t.name} — R$ {Number(t.default_price).toFixed(2)} <button className="btn btn-secondary" onClick={()=>{setEditing(t.id);setName(t.name);setPrice(String(t.default_price));}}>Editar</button></li>)}</ul>
    <h3>Formas de pagamento disponíveis</h3><p>Pix, Dinheiro, Cartão de Crédito, Cartão de Débito e Transferência Bancária. Selecione uma dessas formas ao registrar o pagamento.</p>
  </section>;
}
