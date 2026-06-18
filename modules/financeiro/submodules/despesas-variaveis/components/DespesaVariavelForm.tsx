import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { DespesasVariaveisService } from '../despesas-variaveis.service';
import { ContasBancariasService } from '../../../../ajustes/contas-bancarias/contas.service';
import { FormasPagamentoService } from '../../../../cadastros/formas-pagamento/formas-pagamento.service';
import { TiposDespesasService } from '../../../../cadastros/tipos-despesas/tipos-despesas.service';
import { IGrupoDespesa } from '../../../../cadastros/tipos-despesas/tipos-despesas.types';
import { ITituloVariavel } from '../despesas-variaveis.types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  tituloEditando?: ITituloVariavel | null;
}

const DespesaVariavelForm: React.FC<Props> = ({ onClose, onSuccess, tituloEditando }) => {
  const [grupos, setGrupos] = useState<IGrupoDespesa[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [formas, setFormas] = useState<any[]>([]);
  const [formaSelecionada, setFormaSelecionada] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [valorFormatado, setValorFormatado] = useState('R$ 0,00');
  const [isAddingGrupo, setIsAddingGrupo] = useState(false);
  const [isAddingCategoria, setIsAddingCategoria] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const [formData, setFormData] = useState({
    data_vencimento: new Date().toISOString().split('T')[0],
    descricao: '',
    valor_total: 0,
    grupo_id: '',
    categoria_id: '',
    documento_ref: '',

    // Novos campos
    pago_avista: false,
    qtd_parcelas: 1,
    dias_intervalo: 30, // Padrão mensal
    conta_id: '',
    forma_pagamento_id: '',
  });

  useEffect(() => {
    if (tituloEditando && grupos.length > 0) {
      let grupoId = tituloEditando.grupo_id || '';

      if (!grupoId && tituloEditando.categoria_id) {
        const grupoRelacionado = grupos.find(g =>
          g.categorias?.some((c: any) => c.id === tituloEditando.categoria_id)
        );
        if (grupoRelacionado) grupoId = grupoRelacionado.id;
      }

      setFormData(prev => ({
        ...prev,
        data_vencimento: tituloEditando.data_vencimento,
        descricao: tituloEditando.descricao,
        valor_total: tituloEditando.valor_total,
        grupo_id: grupoId,
        categoria_id: tituloEditando.categoria_id || '',
        documento_ref: tituloEditando.documento_ref || '',
      }));
      setValorFormatado(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tituloEditando.valor_total));
    }
  }, [tituloEditando, grupos]);

  useEffect(() => {
    async function loadData() {
      const [gruposData, cData, fData] = await Promise.all([
        TiposDespesasService.getByTipo('VARIAVEL'),
        ContasBancariasService.getAll(),
        FormasPagamentoService.getAll()
      ]);
      setGrupos(gruposData || []);
      
      const activeContas = cData.filter(c => c.ativo);
      setContas(activeContas);
      if (activeContas.length === 1) {
        setFormData(prev => ({ ...prev, conta_id: activeContas[0].id }));
      }
      
      setFormas(fData.filter(f => f.ativo && f.destino_lancamento !== 'CONSIGNACAO'));
    }
    loadData();
  }, []);

  useEffect(() => {
    if (formData.forma_pagamento_id && formas.length > 0) {
      const forma = formas.find(f => f.id === formData.forma_pagamento_id);
      setFormaSelecionada(forma || null);

      if (forma) {
        const isAvista = forma.destino_lancamento === 'CAIXA';
        setFormData(prev => ({
          ...prev,
          pago_avista: isAvista,
          qtd_parcelas: (isAvista || !forma.permite_parcelamento) ? 1 : prev.qtd_parcelas
        }));
      }
    } else {
      setFormaSelecionada(null);
    }
  }, [formData.forma_pagamento_id, formas]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Remove tudo que não for dígito
    const digits = val.replace(/\D/g, '');

    if (digits === '') {
      setValorFormatado('R$ 0,00');
      setFormData(prev => ({ ...prev, valor_total: 0 }));
      return;
    }

    const parsed = parseInt(digits, 10) / 100;

    setValorFormatado(new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parsed));

    setFormData(prev => ({ ...prev, valor_total: parsed }));
  };

  const handleAddGrupo = async () => {
    if (!newItemName) return;
    try {
      await TiposDespesasService.saveGrupo({
        nome: newItemName.toUpperCase(),
        tipo: 'VARIAVEL'
      });
      const novosGrupos = await TiposDespesasService.getByTipo('VARIAVEL');
      setGrupos(novosGrupos);
      const grupoCriado = novosGrupos.find(g => g.nome === newItemName.toUpperCase());
      if (grupoCriado) {
        setFormData(prev => ({ ...prev, grupo_id: grupoCriado.id, categoria_id: '' }));
      }
      setIsAddingGrupo(false);
      setNewItemName('');
    } catch (err: any) {
      alert('Erro ao criar grupo: ' + err.message);
    }
  };

  const handleAddCategoria = async () => {
    if (!newItemName || !formData.grupo_id) return;
    try {
      await TiposDespesasService.saveCategoria({
        nome: newItemName.toUpperCase(),
        grupo_id: formData.grupo_id
      });
      const novosGrupos = await TiposDespesasService.getByTipo('VARIAVEL');
      setGrupos(novosGrupos);
      const categoriasDesteGrupo = novosGrupos.find(g => g.id === formData.grupo_id)?.categorias || [];
      const catCriada = categoriasDesteGrupo.find(c => c.nome === newItemName.toUpperCase());
      if (catCriada) {
        setFormData(prev => ({ ...prev, categoria_id: catCriada.id }));
      }
      setIsAddingCategoria(false);
      setNewItemName('');
    } catch (err: any) {
      alert('Erro ao criar categoria: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoria_id || formData.valor_total <= 0 || !formData.descricao) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!tituloEditando) {
      if (!formData.forma_pagamento_id) {
        alert('Informe a Forma de Pagamento.');
        return;
      }

      if (formData.pago_avista && !formData.conta_id) {
        alert('Para pagamentos à vista, informe a Conta Bancária / Caixa Origem.');
        return;
      }

      if (!formData.pago_avista && formData.qtd_parcelas <= 0) {
        alert('A quantidade de parcelas deve ser maior que zero.');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (tituloEditando) {
        await DespesasVariaveisService.update(tituloEditando.id, formData);
      } else {
        await DespesasVariaveisService.save(formData);
      }
      onSuccess();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  const categoriasDoGrupo = grupos.find(g => g.id === formData.grupo_id)?.categorias || [];

  // Travar scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const content = (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-50 bg-orange-600 text-white shrink-0">
          <h3 className="text-xl font-black uppercase tracking-tighter">{tituloEditando ? 'Editar Despesa Variável' : 'Lançar Despesa Variável'}</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">
            Gastos operacionais e eventuais
          </p>
        </div>

        {/* Form Scrollable Area */}
        <div className="overflow-y-auto shrink p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Grupo e Categoria */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex justify-between items-center">
                  Grupo
                  <button
                    type="button"
                    onClick={() => { setIsAddingGrupo(true); setNewItemName(''); }}
                    className="text-orange-600 hover:text-orange-700 font-black text-[9px] uppercase tracking-widest flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Novo
                  </button>
                </label>
                <select
                  required
                  value={formData.grupo_id}
                  onChange={e => setFormData({ ...formData, grupo_id: e.target.value, categoria_id: '' })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selecione o grupo...</option>
                  {grupos.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex justify-between items-center">
                  Categoria (Subgrupo)
                  {formData.grupo_id && (
                    <button
                      type="button"
                      onClick={() => { setIsAddingCategoria(true); setNewItemName(''); }}
                      className="text-orange-600 hover:text-orange-700 font-black text-[9px] uppercase tracking-widest flex items-center"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Novo
                    </button>
                  )}
                </label>
                <select
                  required
                  value={formData.categoria_id}
                  onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}
                  disabled={!formData.grupo_id}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  <option value="">Selecione a categoria...</option>
                  {categoriasDoGrupo.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                Descrição / Motivo
              </label>
              <input
                type="text"
                value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
                placeholder="Ex: Combustível, Material de limpeza, Manutenção..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                Valor Total Previsto
              </label>
              <input
                type="text"
                value={valorFormatado}
                onChange={handleCurrencyChange}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-2xl font-black text-orange-600 outline-none focus:border-orange-500 text-center transition-all"
                required
              />
            </div>

            {/* Forma de Pagamento */}
            {!tituloEditando && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                  Forma de Movimentação / Pagamento
                </label>
                <select
                  required
                  value={formData.forma_pagamento_id}
                  onChange={e => setFormData({ ...formData, forma_pagamento_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
                >
                  <option value="">Selecione a forma de pagamento...</option>
                  {formas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
            )}

            {/* Campos Dinâmicos (Parcelado vs À Vista) */}
            {(formaSelecionada || tituloEditando) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                    {(formData.pago_avista && !tituloEditando) ? 'Data de Pagamento' : (tituloEditando ? 'Vencimento' : 'Primeiro Vencimento')}
                  </label>
                  <input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={e => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                {!formData.pago_avista && !tituloEditando && formaSelecionada?.permite_parcelamento && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                      Qtd. de Parcelas
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={formaSelecionada?.qtd_max_parcelas || 120}
                      value={formData.qtd_parcelas}
                      onChange={e => setFormData({ ...formData, qtd_parcelas: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {!formData.pago_avista && formData.qtd_parcelas > 1 && !tituloEditando && formaSelecionada?.permite_parcelamento && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                  Intervalo entre Parcelas (Dias)
                </label>
                <select
                  value={formData.dias_intervalo}
                  onChange={e => setFormData({ ...formData, dias_intervalo: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                >
                  <option value={30}>Mensal (30 dias)</option>
                  <option value={15}>Quinzenal (15 dias)</option>
                  <option value={7}>Semanal (7 dias)</option>
                  <option value={365}>Anual (365 dias)</option>
                </select>
              </div>
            )}

            {formData.pago_avista && !tituloEditando && (
              <div className="space-y-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div>
                  <label className="block text-[10px] font-black text-emerald-700 uppercase mb-2 ml-1">
                    Conta Bancária / Caixa Origem
                  </label>
                  <select
                    required={formData.pago_avista}
                    value={formData.conta_id}
                    onChange={e => setFormData({ ...formData, conta_id: e.target.value })}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-3 text-sm font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                  >
                    <option value="">Selecione a conta...</option>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.banco_nome} - {c.titular} | Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_atual || 0)}</option>)}
                  </select>
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
                placeholder="Ex: NF-1234, Cupom Fiscal..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 pb-2">
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
                className={`flex-1 py-4 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center ${formData.pago_avista ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
              >
                {isSaving ? 'Gravando...' : (tituloEditando ? 'Salvar Alterações' : (formData.pago_avista ? 'Liquidar Lançamento' : 'Confirmar Lançamento'))}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Add Modal */}
      {(isAddingGrupo || isAddingCategoria) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100 p-8">
            <h4 className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-2">
              {isAddingGrupo ? 'Novo Grupo' : 'Nova Categoria'}
            </h4>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">
              {isAddingGrupo ? 'Para despesas variáveis' : `Para o grupo: ${grupos.find(g => g.id === formData.grupo_id)?.nome}`}
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                  Nome do {isAddingGrupo ? 'Grupo' : 'Subgrupo'}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="EX: MANUTENÇÃO, LIMPEZA..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-orange-500 uppercase"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => { setIsAddingGrupo(false); setIsAddingCategoria(false); setNewItemName(''); }}
                  className="flex-1 py-3.5 text-slate-500 font-black text-[10px] uppercase bg-slate-50 rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={isAddingGrupo ? handleAddGrupo : handleAddCategoria}
                  className="flex-1 py-3.5 text-white font-black text-[10px] uppercase tracking-widest bg-orange-600 rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all"
                >
                  Cadastrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default DespesaVariavelForm;
