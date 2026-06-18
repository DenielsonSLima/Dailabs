
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { SociosService } from '../../../../ajustes/socios/socios.service';
import { ContasBancariasService } from '../../../../ajustes/contas-bancarias/contas.service';
import { RetiradasService } from '../retiradas.service';
import { IRetirada, TipoRetirada } from '../retiradas.types';

interface Props {
  editItem?: IRetirada | null;
  onClose: () => void;
  onSuccess: () => void;
}

const RetiradaForm: React.FC<Props> = ({ editItem, onClose, onSuccess }) => {
  const [socios, setSocios] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [valorFormatado, setValorFormatado] = useState(
    editItem ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editItem.valor) : 'R$ 0,00'
  );

  const [formData, setFormData] = useState({
    id: editItem?.id || '',
    data: editItem?.data ? new Date(editItem.data).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    socio_id: editItem?.socio_id || '',
    conta_origem_id: editItem?.conta_origem_id || '',
    valor: editItem?.valor || 0,
    descricao: editItem?.descricao || '',
    tipo: (editItem?.tipo as TipoRetirada) || 'DISTRIBUICAO_LUCRO'
  });

  useEffect(() => {
    Promise.all([
      SociosService.getAll(),
      ContasBancariasService.getAll()
    ]).then(([sData, cData]) => {
      setSocios(sData.filter(s => s.ativo));
      const activeContas = cData.filter(c => c.ativo);
      setContas(activeContas);
      if (activeContas.length === 1) {
        setFormData(prev => ({ ...prev, conta_origem_id: activeContas[0].id }));
      }
    });
  }, []);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    const numericValue = Number(value) / 100;
    setValorFormatado(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue));
    setFormData(prev => ({ ...prev, valor: numericValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.socio_id || !formData.conta_origem_id || formData.valor <= 0) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSaving(true);
    try {
      await RetiradasService.save(formData);
      onSuccess();
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  // Travar scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const content = (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100">
        <div className="p-8 border-b border-slate-50 bg-amber-600 text-white">
          <h3 className="text-xl font-black uppercase tracking-tighter">Lançar Retirada de Sócio</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Abatimento direto do saldo bancário selecionado</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Data</label>
              <input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-[#111827] outline-none focus:ring-2 focus:ring-amber-500" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Valor</label>
              <input type="text" value={valorFormatado} onChange={handleCurrencyChange} className="w-full bg-white border-2 border-amber-100 rounded-2xl px-5 py-3.5 text-lg font-black text-amber-600 outline-none focus:border-amber-500 text-center" required />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Sócio Beneficiário</label>
            <select required value={formData.socio_id} onChange={e => setFormData({ ...formData, socio_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-[#111827] outline-none appearance-none">
              <option value="">Selecione o sócio...</option>
              {socios.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Tipo de Retirada</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setFormData({ ...formData, tipo: 'PRO_LABORE' })} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${formData.tipo === 'PRO_LABORE' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>Pró-Labore</button>
              <button type="button" onClick={() => setFormData({ ...formData, tipo: 'DISTRIBUICAO_LUCRO' })} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${formData.tipo === 'DISTRIBUICAO_LUCRO' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>Lucros</button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Conta Bancária de Saída</label>
            <select required value={formData.conta_origem_id} onChange={e => setFormData({ ...formData, conta_origem_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-[#111827] outline-none appearance-none">
              <option value="">Selecione a conta...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.banco_nome} - {c.titular} | Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_atual || 0)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Descrição / Motivo da Retirada</label>
            <input type="text" value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })} placeholder="Ex: Retirada ref. lucro venda Corolla..." className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-[#111827] outline-none focus:ring-2 focus:ring-amber-500" required />
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 font-black text-xs uppercase bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all">Cancelar</button>
            <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:bg-amber-700 transition-all flex items-center justify-center">
              {isSaving ? 'Gravando...' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default RetiradaForm;
