
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PedidosVendaService } from './pedidos-venda.service';
import { PedidosVendaRealtime } from './pedidos-venda.realtime';
import {
  invalidatePedidoVendaDetails,
  invalidatePedidoVendaFinancial,
  invalidatePedidoVendaFullChange,
  invalidatePedidosVendaOverview,
} from './pedidos-venda.query-invalidation';
import { IPedidoVenda, IVendaPagamento } from './pedidos-venda.types';
import { EstoqueService } from '../estoque/estoque.service';
import ConfirmModal from '../../components/ConfirmModal';

// Componentes Reestruturados (Ordem Linear)
import HeaderVenda from './components/details/HeaderVenda';
import InfoVendaCompradorHeader from './components/details/InfoVendaCompradorHeader';
import VendaPartnersResultKpis from './components/details/VendaPartnersResultKpis';
import VendaAnalyticsKpis from './components/details/VendaAnalyticsKpis';
import VeiculosVendaList from './components/details/VeiculosVendaList';
import FinancialCard from './components/details/FinancialCard';
import ObservationsCard from './components/details/ObservationsCard';
import ModalConfirmacaoVenda from './components/details/ModalConfirmacaoVenda';

const PedidoVendaDetalhesPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [pedido, setPedido] = useState<IPedidoVenda | null>(null);
  const [veiculosDisponiveis, setVeiculosDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [unlinkVehicleId, setUnlinkVehicleId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    loadData();
    EstoqueService.getAll({ page: 1, limit: 200, statusTab: 'DISPONIVEL' })
      .then(data => setVeiculosDisponiveis(data.data || []));
    const sub = PedidosVendaRealtime.subscribe(() => loadData(true));
    return () => { sub.unsubscribe(); };
  }, [id]);

  async function loadData(silent = false) {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const data = await PedidosVendaService.getById(id);
      if (!data) {
        showNotification('error', 'Pedido não encontrado.');
        navigate('/pedidos-venda');
        return;
      }
      setPedido(data);

      // Se o veículo for consignado e o pedido ainda for rascunho sem forma de pagamento, sugere consignação
      if (data && data.status === 'RASCUNHO' && !data.forma_pagamento_id) {
        const isConsignado = data.veiculo?.pedido_compra?.forma_pagamento?.nome?.toLowerCase().includes('consignação') ||
          data.veiculo?.pedido_compra?.forma_pagamento?.nome?.toLowerCase().includes('consignacao');

        if (isConsignado) {
          // Busca o ID da forma de pagamento Consignação via Service
          const fpConsigId = await PedidosVendaService.getConsignacaoFormaPagamento();
          if (fpConsigId) {
            await PedidosVendaService.save({ id: data.id, forma_pagamento_id: fpConsigId });
            loadData(true);
          }
        }
      }
    } catch (error: any) {
      console.error('Falha ao carregar pedido de venda:', error);
      showNotification('error', 'Erro ao carregar dados do pedido: ' + (error.message || 'Erro desconhecido'));
      if (!silent) {
        if (id !== 'novo') {
          setTimeout(() => navigate('/pedidos-venda'), 3000);
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // CÁLCULOS FINANCEIROS DE VALIDAÇÃO
  const valorVenda = pedido?.valor_venda || 0;
  const veiculoEfetivo: any = (pedido as any)?.veiculo || ((pedido as any)?.veiculos?.[0] ?? null);
  const hasVeiculoVinculado = !!pedido?.veiculo_id || !!veiculoEfetivo?.id;
  const valorVendaEfetivo = valorVenda > 0 ? valorVenda : (veiculoEfetivo?.valor_venda || 0);

  const isConsignado = pedido?.is_consignado || false;
  const valorCustoEfetivo = (veiculoEfetivo?.valor_custo || 0) + (veiculoEfetivo?.valor_custo_servicos || 0);
  const valorFinanceiroEfetivo = isConsignado ? Math.max(0, valorVendaEfetivo - valorCustoEfetivo) : valorVendaEfetivo;

  // Permitir confirmar se houver dados mínimos para faturamento
  // A composição de recebimentos pode ser estruturada no fluxo de confirmação.
  const isFinanceiroOK = hasVeiculoVinculado && valorVendaEfetivo > 0 && !!pedido?.forma_pagamento_id;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLinkVehicle = async (vId: string) => {
    if (!pedido) return;

    const veiculoSelecionado = (veiculosDisponiveis as any[]).find(v => v.id === vId);
    const isVeiculoConsignado = veiculoSelecionado?.pedido_compra?.forma_pagamento?.nome?.toLowerCase().includes('consigna') || false;

    // VERIFICAÇÃO DE CONSIGNAÇÃO NO VÍNCULO
    const isPedidoConsignacao = pedido.forma_pagamento?.nome?.toLowerCase().includes('consigna');
    if (isPedidoConsignacao && !isVeiculoConsignado) {
      showNotification('error', 'Este pedido está configurado como venda em Consignação. Selecione um veículo consignado.');
      return;
    }

    setActionLoading(true);
    try {
      const updates: any = { id: pedido.id, veiculo_id: vId, is_consignado: isVeiculoConsignado };
      if ((pedido.valor_venda || 0) <= 0 && veiculoSelecionado?.valor_venda) {
        updates.valor_venda = veiculoSelecionado.valor_venda;
      }
      await PedidosVendaService.save(updates);
      invalidatePedidoVendaFullChange(queryClient, pedido.id);
      loadData(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkVehicle = async (vId: string) => {
    if (!pedido) return;
    setUnlinkVehicleId(vId);
  };

  const confirmUnlinkVehicle = async () => {
    if (!pedido || !unlinkVehicleId) return;
    setActionLoading(true);
    try {
      await PedidosVendaService.save({ id: pedido.id, veiculo_id: null } as any);
      setUnlinkVehicleId(null);
      invalidatePedidoVendaFullChange(queryClient, pedido.id);
      loadData(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPayments = async (payments: Partial<IVendaPagamento>[]) => {
    if (!pedido) return;
    setActionLoading(true);
    try {
      for (const p of payments) {
        await PedidosVendaService.savePayment(p);
      }
      showNotification('success', `${payments.length} recebimento(s) lançado(s) com sucesso!`);
      invalidatePedidoVendaDetails(queryClient, pedido.id);
      invalidatePedidosVendaOverview(queryClient);
      invalidatePedidoVendaFinancial(queryClient);
      loadData(true);
    } catch (e) {
      showNotification('error', 'Erro ao processar recebimentos.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePayment = async (payId: string) => {
    setActionLoading(true);
    try {
      await PedidosVendaService.deletePayment(payId);
      showNotification('success', 'Lançamento estornado com sucesso.');
      invalidatePedidoVendaDetails(queryClient, pedido?.id);
      invalidatePedidosVendaOverview(queryClient);
      invalidatePedidoVendaFinancial(queryClient);
      loadData(true);
    } catch (e) {
      showNotification('error', 'Erro ao excluir lançamento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSale = async (params: { condicao: any, contaId?: string }) => {
    if (!pedido) return;
    if (!isFinanceiroOK) {
      showNotification('error', 'Para faturar, informe veículo, valor de venda e forma de recebimento.');
      return;
    }

    // VERIFICAÇÃO DUPLA DE CONSIGNAÇÃO ANTES DE FATURAR
    const isPedidoConsignacao = pedido.forma_pagamento?.nome?.toLowerCase().includes('consigna');
    const isVeiculoConsignado = pedido.is_consignado;

    if (isPedidoConsignacao && !isVeiculoConsignado) {
      showNotification('error', 'Não é possível faturar uma venda em Consignação com um veículo de estoque próprio.');
      setShowConfirm(false);
      return;
    }

    setActionLoading(true);
    try {
      const veiculoIdEfetivo = pedido.veiculo_id || veiculoEfetivo?.id;

      // SEMPRE incluir veiculo_id e valor_venda atualizados para garantir
      // que o confirmSale receberá os dados corretos para baixar o veículo
      const pedidoParaFaturar = { ...pedido, valor_venda: valorVendaEfetivo, veiculo_id: veiculoIdEfetivo };

      if (((pedido.valor_venda || 0) !== valorVendaEfetivo && valorVendaEfetivo > 0) || (!pedido.veiculo_id && veiculoIdEfetivo)) {
        await PedidosVendaService.save({ id: pedido.id, valor_venda: valorVendaEfetivo, veiculo_id: veiculoIdEfetivo });
      }

      await PedidosVendaService.confirmSale({
        pedido: pedidoParaFaturar,
        condicao: params.condicao,
        contaBancariaId: params.contaId
      });

      // Feedback Detalhado sobre o Financeiro
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();

      // Busca os títulos criados via Service para verificar datas
      const titulos = await PedidosVendaService.getTitulosByPedidoId(pedido.id);
      const temVencimentoForaDoMes = titulos?.some(t => {
        const d = new Date(t.data_vencimento);
        return d.getMonth() !== mesAtual || d.getFullYear() !== anoAtual;
      });

      if (temVencimentoForaDoMes) {
        showNotification('success', 'Venda faturada! Financeiro gerado. Verifique a aba "Outros Meses" ou "Futuros" no Contas a Receber.');
      } else {
        showNotification('success', 'Venda faturada! Lançamento financeiro gerado com sucesso.');
      }

      setShowConfirm(false);
      invalidatePedidoVendaFullChange(queryClient, pedido.id);
      loadData(true);
    } catch (e: any) {
      showNotification('error', "Erro ao faturar venda: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!pedido) return;
    setActionLoading(true);
    try {
      await PedidosVendaService.delete(pedido.id);
      invalidatePedidoVendaFullChange(queryClient, pedido.id);
      navigate('/pedidos-venda');
    } catch (e: any) {
      showNotification('error', "Erro ao excluir venda: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !pedido) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Sincronizando Venda...</p>
      </div>
    );
  }

  return (
    <div className="pb-32 space-y-6 animate-in fade-in duration-500 max-w-screen-2xl mx-auto px-4 md:px-6">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[300] px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right duration-300 border backdrop-blur-md ${toast.type === 'success' ? 'bg-slate-900/95 text-white border-emerald-500/50' : 'bg-rose-600 text-white border-rose-400/50'
          }`}>
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* 1. Header de Comando */}
      <HeaderVenda
        pedido={pedido}
        onBack={() => navigate('/pedidos-venda')}
        onEdit={() => navigate(`/pedidos-venda/editar/${pedido.id}`)}
        onConfirm={() => setShowConfirm(true)}
        onDelete={() => setShowDelete(true)}
        loadingAction={actionLoading}
        canConfirm={isFinanceiroOK}
      />

      {/* 2. Dados do Comprador e Vendedor */}
      <InfoVendaCompradorHeader pedido={pedido} />

      {/* 3. KPIs Individuais de Sócios */}
      <VendaPartnersResultKpis pedido={pedido} />

      {/* 4. KPIs de Rentabilidade Gerais */}
      <VendaAnalyticsKpis pedido={pedido} />

      {/* 5. Ativo Negociado (Padrão Grid Fixo 380px) */}
      <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 md:p-8">
        <VeiculosVendaList
          pedido={pedido}
          veiculosDisponiveis={veiculosDisponiveis}
          onLink={handleLinkVehicle}
          onUnlink={handleUnlinkVehicle}
          isConcluido={pedido.status === 'CONCLUIDO'}
          actionLoading={actionLoading}
        />
      </section>

      {/* 6. Gestão Financeira (Recebimentos) */}
      <section>
        <FinancialCard
          pedido={pedido}
          valorVendaEfetivo={valorFinanceiroEfetivo}
          onAddPayments={handleAddPayments}
          onDeletePayment={handleDeletePayment}
          isSaving={actionLoading}
        />
      </section>

      {/* 7. Notas e Observações */}
      <ObservationsCard
        observacoes={pedido.observacoes}
        onSave={async (v) => {
          await PedidosVendaService.save({ id: pedido.id, observacoes: v });
          invalidatePedidoVendaDetails(queryClient, pedido.id);
          loadData(true);
        }}
        isSaving={actionLoading}
      />

      {/* Modais de Fluxo */}
      {showConfirm && (
        <ModalConfirmacaoVenda
          pedido={pedido}
          valorVendaEfetivo={valorFinanceiroEfetivo}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirmSale}
          isLoading={actionLoading}
        />
      )}

      <ConfirmModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteSale}
        title="Excluir Pedido de Venda?"
        message="Esta ação apagará o pedido de venda e todos os vínculos relacionados, incluindo veículo, recebimentos e lançamentos financeiros vinculados."
        confirmText="Sim, Excluir"
        variant="danger"
        isLoading={actionLoading}
      />

      <ConfirmModal
        isOpen={!!unlinkVehicleId}
        onClose={() => setUnlinkVehicleId(null)}
        onConfirm={confirmUnlinkVehicle}
        title="Remover Veículo do Pedido?"
        message="O veículo será desvinculado desta venda e voltará para a lista de disponíveis."
        confirmText="Remover"
        cancelText="Cancelar"
        variant="info"
        isLoading={actionLoading}
      />
    </div>
  );
};

export default PedidoVendaDetalhesPage;
