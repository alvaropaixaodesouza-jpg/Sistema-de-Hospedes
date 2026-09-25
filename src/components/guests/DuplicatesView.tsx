import React, { useEffect, useState } from 'react';
import { dataService } from '../../lib/storageStore';
import { normalizeSearchText } from '../../lib/formatters';
import { Guest } from '../../types';
import { useDataRefresh } from '../../lib/useDataRefresh';
export function DuplicatesView({ onSelect }: { onSelect: (g: Guest) => void }) {
  const [guests,setGuests] = useState<Guest[]>([]);
  const [error,setError] = useState('');
  const load = () => dataService.fetchGuests({pageSize:Number.MAX_SAFE_INTEGER}).then(r=> {setGuests(r.data);setError('');}).catch(e=>setError(e.message));
  useEffect(()=>{void load();},[]); useDataRefresh(load);
  const groups = new Map<string,Guest[]>();
  guests.forEach(g=> {const key=normalizeSearchText(g.full_name); groups.set(key,[...(groups.get(key)||[]),g]);});
  const matches=[...groups.values()].filter(g=>g.length>1);
  return <section className="pms-card"><h2>Possíveis duplicidades</h2><p>Cadastros com o mesmo nome normalizado. Pessoas com nomes iguais podem ser diferentes; confira documentos antes de editar.</p>{error && <p role="alert">{error}</p>}{!error && !matches.length && <p>Nenhuma duplicidade de nome encontrada.</p>}{matches.map((group,i)=><div key={i}>{group.map(g=><button className="btn btn-secondary" key={g.id} onClick={()=>onSelect(g)}>{g.full_name} — {g.internal_code} — {g.phone}</button>)}</div>)}</section>;
}
