import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ContasBancariasService } from '../../../../ajustes/contas-bancarias/contas.service';
import { SociosService } from '../../../../ajustes/socios/socios.service';
import { OutrosDebitosService } from '../outros-debitos.service';
import { CondicoesPagamentoService } from '../../../../cadastros/condicoes-pagamento/condicoes-pagamento.service';
import { ITituloDebito } from '../outros-debitos.types';

interface ISocioSplit {
  socio_id: string;
  nome: string;
  porcentagem: number;
  valor: number;
}

interface Props {
  editData?: ITituloDebito;
  onClose: () => void;
  onSuccess: () => void;
}

const DebitoForm: React.FC<Props> = ({ editData, onClose, onSuccess }) => {
  const isEditing = !!editData;
  const [contas, setContas] = useState<any[]>([]);
  const [sociosDisponiveis, setSociosDisponiveis] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [valorFormatado, setValorFormatado] = useState(
    editData ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editData.valor_total) : 'R$ 0,00'
  );
  const [dividirSocios, setDividirSocios] = useState(true);
  const [sociosVinculados, setSociosVinculados] = useState<ISocioSplit[]>([]);

  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [formaPagamentoId, setFormaPagamentoId] = useState('');
  const [condicoes, setCondicoes] = useState<any[]>([]);
  const [condicaoId, setCondicaoId] = useState('');
  const [loadingCondicoes, setLoadingCondicoes] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    data_lancamento: today,
    data_vencimento: editData?.data_vencimento || today,
    descricao: editData?.descricao || '',
    valor_total: editData?.valor_total || 0,
    conta_id: '',
    documento_ref: editData?.documento_ref || '',
  });

  const isVista = useMemo(() => {
    if (!formaPagamentoId) return false;
    const forma = formasPagamento.find(f => f.id === formaPagamentoId);
    if (!forma) return false;
    const nome = forma.nome.toUpperCase();
    return nome.includes('PIX') || nome.includes('DINHEIRO') || forma.destino_lancamento === 'CAIXA';
  }, [formaPagamentoId, formasPagamento]);

  const isPrazo = useMemo(() => {
    if (!formaPagamentoId) return false;
    const forma = formasPagamento.find(f => f.id === formaPagamentoId);
    if (!forma) return false;
    const nome = forma.nome.toUpperCase();
    return nome.includes('PRAZO') || forma.destino_lancamento === 'CONTAS_PAGAR' || forma.destino_lancamento === 'CONTAS_RECEBER';
  }, [formaPagamentoId, formasPagamento]);

  useEffect(() => {
    Promise.all([
      ContasBancariasService.getAll(),
      SociosService.getAll(),
      OutrosDebitosService.getFormasPagamento(),
    ]).then(([cData, sData, fData]) => {
      const activeContas = cData.filter(c => c.ativo);
      setContas(activeContas);
      if (activeContas.length === 1) {
        setFormData(prev => ({ ...prev, conta_id: activeContas[0].id }));
      }
      const ativos = sData.filter((s: any) => s.ativo);
      setSociosDisponiveis(ativos);
      setFormasPagamento(fData || []);

      // Auto-seleciona todos os sócios com divisão igualitária
      if (!isEditing && ativos.length > 0) {
        const count = ativos.length;
        const basePercent = Math.floor((100 / count) * 100) / 100;
        const leftoverPercent = parseFloat((100 - basePercent * count).toFixed(2));
        const autoSocios: ISocioSplit[] = ativos.map((s: any, i: number) => ({
          socio_id: s.id,
          nome: s.nome,
          porcentagem: i === count - 1 ? parseFloat((basePercent + leftoverPercent).toFixed(2)) : basePercent,
          valor: 0,
        }));
        setSociosVinculados(autoSocios);
      }
    });
  }, []);

  // Busca condições quando forma muda (apenas para prazo)
  useEffect(() => {
    if (formaPagamentoId && isPrazo) {
      setLoadingCondicoes(true);
      CondicoesPagamentoService.getByFormaPagamento(formaPagamentoId).then(data => {
        const ativas = data.filter((c: any) => c.ativo !== false);
        setCondicoes(ativas);
        if (ativas.length === 1) setCondicaoId(ativas[0].id);
        else setCondicaoId('');
        setLoadingCondicoes(false);
      });
    } else {
      setCondicoes([]);
      setCondicaoId('');
    }
  }, [formaPagamentoId, isPrazo]);

  // Recalculate valores when valor_total changes
  useEffect(() => {
    if (sociosVinculados.length > 0 && formData.valor_total > 0) {
      const count = sociosVinculados.length;
      const novosValores = sociosVinculados.map((s, i) => {
        const v = i === count - 1 ?
          parseFloat((formData.valor_total - sociosVinculados.slice(0, -1).reduce((acc, prev) => acc + parseFloat(((prev.porcentagem / 100) * formData.valor_total).toFixed(2)), 0)).toFixed(2)) :
          parseFloat(((s.porcentagem / 100) * formData.valor_total).toFixed(2));
        return { ...s, valor: v };
      });
      if (JSON.stringify(novosValores) !== JSON.stringify(sociosVinculados)) {
        setSociosVinculados(novosValores);
      }
    }
  }, [formData.valor_total]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const numericValue = Number(value) / 100;

    if (isNaN(numericValue)) return;

    setValorFormatado(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue)
    );
    setFormData(prev => ({ ...prev, valor_total: numericValue }));
  };

  const toggleSocio = (socio: any) => {
    const exists = sociosVinculados.some(s => s.socio_id === socio.id);
    if (exists) {
      setSociosVinculados(sociosVinculados.filter(s => s.socio_id !== socio.id));
    } else {
      setSociosVinculados([...sociosVinculados, {
        socio_id: socio.id,
        nome: socio.nome,
        porcentagem: 0,
        valor: 0
      }]);
    }
  };

  const dividirIgualmente = () => {
    if (sociosVinculados.length === 0 || formData.valor_total <= 0) return;
    const count = sociosVinculados.length;

    const baseValue = Math.floor((formData.valor_total / count) * 100) / 100;
    const leftoverValue = parseFloat((formData.valor_total - (baseValue * count)).toFixed(2));

    const basePercent = Math.floor((100 / count) * 100) / 100;
    const leftoverPercent = parseFloat((100 - (basePercent * count)).toFixed(2));

    const novos = sociosVinculados.map((s, i) => {
      const v = i === count - 1 ? parseFloat((baseValue + leftoverValue).toFixed(2)) : baseValue;
      const p = i === count - 1 ? parseFloat((basePercent + leftoverPercent).toFixed(2)) : basePercent;
      return { ...s, valor: v, porcentagem: p };
    });
    setSociosVinculados(novos);
  };

  const updateSocioPorcentagem = (socioId: string, value: string) => {
    let pNum = parseFloat(value || '0');
    if (isNaN(pNum)) pNum = 0;

    const totalOutros = sociosVinculados.filter(s => s.socio_id !== socioId).reduce((acc, s) => acc + s.porcentagem, 0);
    if (pNum + totalOutros > 100) pNum = parseFloat((100 - totalOutros).toFixed(2));

    const novoValor = parseFloat(((pNum / 100) * formData.valor_total).toFixed(2));

    setSociosVinculados(sociosVinculados.map(s =>
      s.socio_id === socioId ? { ...s, porcentagem: pNum, valor: novoValor } : s
    ));
  };

  const updateSocioValor = (socioId: string, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let vNum = Number(cleaned) / 100;
    if (isNaN(vNum)) vNum = 0;

    const totalOutros = sociosVinculados.filter(s => s.socio_id !== socioId).reduce((acc, s) => acc + s.valor, 0);
    if (vNum + totalOutros > formData.valor_total) vNum = parseFloat((formData.valor_total - totalOutros).toFixed(2));

    const novaPorcentagem = formData.valor_total > 0 ? parseFloat(((vNum / formData.valor_total) * 100).toFixed(2)) : 0;

    setSociosVinculados(sociosVinculados.map(s =>
      s.socio_id === socioId ? { ...s, valor: vNum, porcentagem: novaPorcentagem } : s
    ));
  };

  const totalPorcentagem = parseFloat(sociosVinculados.reduce((acc, s) => acc + s.porcentagem, 0).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isEditing) {
      if (!formData.descricao.trim()) { setFormError('Informe a descrição.'); return; }
      setIsSaving(true);
      try {
        await OutrosDebitosService.update(editData!.id, {
          descricao: formData.descricao,
          data_vencimento: formData.data_vencimento,
          documento_ref: formData.documento_ref,
          socios: sociosVinculados.map(s => ({
            socio_id: s.socio_id,
            valor: s.valor,
            porcentagem: s.porcentagem
          }))
        });
        onSuccess();
      } catch (err: any) {
        setFormError('Erro ao atualizar: ' + err.message);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (formData.valor_total <= 0) { setFormError('Informe um valor maior que zero.'); return; }
    if (!formData.descricao.trim()) { setFormError('Informe a descrição / motivo do débito.'); return; }
    if (isVista && !formData.conta_id) { setFormError('Selecione a conta de saída para pagamento imediato.'); return; }
    if (isPrazo && !condicaoId) { setFormError('Selecione a condição de pagamento.'); return; }
    if (dividirSocios && sociosVinculados.length === 0) { setFormError('Selecione pelo menos um sócio para dividir.'); return; }
    if (dividirSocios && totalPorcentagem < 99.99) { setFormError('A soma das porcentagens deve totalizar 100%. Ajuste as participações.'); return; }

    // Data de vencimento: à vista = data de lançamento; prazo = data escolhida
    const dataVenc = isVista ? formData.data_lancamento : formData.data_vencimento;

    setIsSaving(true);
    try {
      const resp = await OutrosDebitosService.save({
        descricao: formData.descricao,
        valor_total: formData.valor_total,
        data_vencimento: dataVenc,
        conta_id: isVista ? (formData.conta_id || null) : null,
        documento_ref: formData.documento_ref,
        socios: dividirSocios ? sociosVinculados.map(s => ({
          socio_id: s.socio_id,
          valor: s.valor,
          porcentagem: s.porcentagem,
        })) : undefined,
      });

      // Baixa imediata somente se for à vista
      if (isVista && formData.conta_id && formaPagamentoId && resp?.id) {
        await OutrosDebitosService.baixarDebito(resp.id, {
          valor: formData.valor_total,
          data_pagamento: formData.data_lancamento,
          conta_id: formData.conta_id,
          forma_pagamento_id: formaPagamentoId
        });
      }

      onSuccess();
    } catch (err: any) {
      setFormError('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const gradients = [
    'from-indigo-500 to-blue-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-purple-500 to-violet-500',
  ];

  // Travar scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const content = (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-slate-50 bg-rose-600 text-white shrink-0">
          <h3 className="text-xl font-black uppercase tracking-tighter">{isEditing ? 'Editar Débito' : 'Lançar Débito'}</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">
            {isEditing ? 'Alterar dados do débito lançado' : 'Empréstimos, financiamentos e saídas extraordinárias'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">

          {/* Erro Inline */}
          {formError && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-4 animate-in slide-in-from-top-2 duration-200">
              <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-xs font-bold leading-relaxed">{formError}</p>
              <button type="button" onClick={() => setFormError(null)} className="ml-auto text-rose-400 hover:text-rose-600 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* 1. Descrição */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
              Descrição / Motivo
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={e => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
              placeholder="Ex: Empréstimo bancário, financiamento, devolução cliente..."
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-[#111827] outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          {/* 2. Valor + Data de Lançamento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Valor Total</label>
              <input
                type="text"
                value={valorFormatado}
                onChange={handleCurrencyChange}
                className="w-full bg-white border-2 border-rose-100 rounded-2xl px-5 py-3.5 text-lg font-black text-rose-600 outline-none focus:border-rose-500 text-center"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Data de Lançamento</label>
              <input
                type="date"
                value={formData.data_lancamento}
                onChange={e => setFormData({ ...formData, data_lancamento: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-[#111827] outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
          </div>

          {/* 3. Forma de Pagamento */}
          {!isEditing && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Forma de Pagamento <span className="text-slate-300">(opcional — sem seleção = Pendente)</span></label>
              <select
                value={formaPagamentoId}
                onChange={e => { setFormaPagamentoId(e.target.value); setFormData(p => ({ ...p, conta_id: '' })); }}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-[#111827] outline-none appearance-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">Deixar pendente...</option>
                {formasPagamento.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          )}

          {/* 4a. À Vista: Conta de Saída */}
          {!isEditing && isVista && (
            <div className="bg-rose-50 border border-rose-100 p-5 rounded-3xl animate-in slide-in-from-top-2 duration-200">
              <label className="block text-[10px] font-black text-rose-600 uppercase mb-3">Conta de Saída</label>
              <select
                required
                value={formData.conta_id}
                onChange={e => setFormData({ ...formData, conta_id: e.target.value })}
                className="w-full bg-white border border-rose-200 rounded-xl px-4 py-3 text-sm font-bold text-[#111827] outline-none appearance-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">Selecione a conta...</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.banco_nome} - {c.titular} | Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_atual || 0)}</option>)}
              </select>
              <p className="text-[9px] text-rose-400 font-bold mt-2">Pagamento registrado na data de lançamento.</p>
            </div>
          )}

          {/* 4b. A Prazo: Condição + Data de Vencimento */}
          {!isEditing && isPrazo && (
            <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-[10px] font-black text-amber-700 uppercase mb-2 flex justify-between">
                  Condição de Pagamento
                  {loadingCondicoes && <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />}
                </label>
                <select
                  required
                  value={condicaoId}
                  onChange={e => setCondicaoId(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm font-bold text-[#111827] outline-none appearance-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">{loadingCondicoes ? 'Buscando...' : 'Selecione a condição...'}</option>
                  {condicoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-amber-700 uppercase mb-2">Data de Vencimento</label>
                <input
                  type="date"
                  required
                  value={formData.data_vencimento}
                  onChange={e => setFormData({ ...formData, data_vencimento: e.target.value })}
                  className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 font-bold text-[#111827] outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Documento Referência */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
              Documento / Referência <span className="text-slate-300">(opcional)</span>
            </label>
            <input
              type="text"
              value={formData.documento_ref}
              onChange={e => setFormData({ ...formData, documento_ref: e.target.value })}
              placeholder="Ex: Contrato-1234, NF-5678..."
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-[#111827] outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Divisão entre Sócios */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Divisão entre Sócios</h3>
                <p className="text-[10px] text-slate-500 font-medium">Selecione os sócios responsáveis pelo débito</p>
              </div>
            </div>
          </div>

          {/* Partner Split Section */}
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Progress Bar */}
            {sociosVinculados.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-4 text-white">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50">Alocado</p>
                    <h4 className="text-xl font-black tracking-tight">
                      {totalPorcentagem.toFixed(1)}<span className="text-xs text-indigo-400 ml-0.5">%</span>
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50">Livre</p>
                    <h4 className={`text-xl font-black tracking-tight ${(100 - totalPorcentagem) <= 0.01 ? 'text-slate-600' : 'text-emerald-400'}`}>
                      {Math.max(0, 100 - totalPorcentagem).toFixed(1)}<span className="text-xs opacity-50 ml-0.5">%</span>
                    </h4>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  {sociosVinculados.map((s, i) => (
                    <div
                      key={s.socio_id}
                      className={`h-full bg-gradient-to-r ${gradients[i % gradients.length]}`}
                      style={{ width: `${s.porcentagem}%`, transition: 'width 0.3s ease' }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {sociosVinculados.length >= 2 && (
              <button
                type="button"
                onClick={dividirIgualmente}
                className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-indigo-200/50 transition-all"
              >
                ⚡ Dividir Igualmente
              </button>
            )}

            {/* Partner List */}
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
              {sociosDisponiveis.map((socio) => {
                const vinculado = sociosVinculados.find(v => v.socio_id === socio.id);

                return (
                  <div
                    key={socio.id}
                    className={`border-2 rounded-2xl p-4 transition-all duration-200 ${vinculado
                      ? 'bg-white border-indigo-100 shadow-lg'
                      : 'bg-slate-50/50 border-slate-100 opacity-60 hover:opacity-100'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSocio(socio)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${vinculado
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'border-slate-200 bg-white hover:border-indigo-400'
                            }`}
                        >
                          {vinculado && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </button>
                        <p className={`text-xs font-black uppercase tracking-tight truncate ${vinculado ? 'text-slate-900' : 'text-slate-400'}`}>
                          {socio.nome}
                        </p>
                      </div>

                      {vinculado && (
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="relative">
                            <input
                              type="text"
                              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vinculado.valor)}
                              onChange={(e) => updateSocioValor(socio.id, e.target.value)}
                              className="w-28 bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-right shadow-sm"
                            />
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={vinculado.porcentagem === 0 ? '' : vinculado.porcentagem.toString()}
                              onChange={(e) => updateSocioPorcentagem(socio.id, e.target.value)}
                              className="w-16 bg-indigo-50/50 border border-indigo-100 rounded-xl py-1.5 pl-2 pr-6 text-[10px] font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-400 opacity-50">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-slate-500 font-black text-xs uppercase bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-4 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:bg-rose-700 transition-all flex items-center justify-center"
            >
              {isSaving ? 'Gravando...' : isEditing ? 'Salvar Alterações' : 'Confirmar Débito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default DebitoForm;
