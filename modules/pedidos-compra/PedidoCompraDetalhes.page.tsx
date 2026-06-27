
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PedidosCompraService } from './pedidos-compra.service';
import { PedidosCompraRealtime } from './pedidos-compra.realtime';
import {
  invalidatePedidoCompraDetails,
  invalidatePedidoCompraFinancial,
  invalidatePedidoCompraFullChange,
  invalidatePedidosCompraOverview,
  invalidatePedidosCompraStock,
} from './pedidos-compra.query-invalidation';
import { IPedidoCompra, IPedidoPagamento } from './pedidos-compra.types';
import { EmpresaService } from '../ajustes/empresa/empresa.service';
import { MarcaDaguaService } from '../ajustes/marca-dagua/marca-dagua.service';
import { CaracteristicasService } from '../cadastros/caracteristicas/caracteristicas.service';
import { OpcionaisService } from '../cadastros/opcionais/opcionais.service';
import ConfirmModal from '../../components/ConfirmModal';

// Componentes Reestruturados
import HeaderPedido from './components/details/HeaderPedido';
import InfoNegociacaoHeader from './components/details/InfoNegociacaoHeader';
import PurchasePartnersResultKpis from './components/details/PurchasePartnersResultKpis';
import OrderCostKpis from './components/details/OrderCostKpis';
import VeiculosPedidoList from './components/details/VeiculosPedidoList';
import CardPaymentData from './components/details/CardPaymentData';
import CardAnnotations from './components/details/CardAnnotations';
import ModalConfirmacaoFinanceira from './components/details/ModalConfirmacaoFinanceira';

// Componentes de Impressão e Preview
import PurchaseOrderPrint from './components/details/PurchaseOrderPrint';
import InternalAnalysisPrint from './components/details/InternalAnalysisPrint';
import QuickPreviewModal from './components/details/QuickPreviewModal';

const PedidoCompraDetalhesPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  // Controle de Preview e Toast
  const [previewType, setPreviewType] = useState<'supplier' | 'internal' | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [unlinkTargetId, setUnlinkTargetId] = useState<string | null>(null);

  // Queries
  const { data: pedido, isLoading: isLoadingPedido } = useQuery({
    queryKey: ['pedido_compra_detalhes', id],
    queryFn: () => PedidosCompraService.getById(id!),
    enabled: !!id
  });

  const { data: empresa } = useQuery({ queryKey: ['empresa_dados'], queryFn: () => EmpresaService.getDadosEmpresa() });
  const { data: watermark } = useQuery({ queryKey: ['marca_dagua'], queryFn: () => MarcaDaguaService.getConfig() });
  const { data: allCaracteristicas = [] } = useQuery({ queryKey: ['caracteristicas_all'], queryFn: () => CaracteristicasService.getAll() });
  const { data: allOpcionais = [] } = useQuery({ queryKey: ['opcionais_all'], queryFn: () => OpcionaisService.getAll() });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Real-time Subscription
  useEffect(() => {
    if (!id) return;
    const sub = PedidosCompraRealtime.subscribe(() => {
      invalidatePedidoCompraDetails(queryClient, id);
    });
    return () => { sub.unsubscribe(); };
  }, [id, queryClient]);

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: (params: { condicao: any, contaId?: string }) =>
      PedidosCompraService.confirmOrder({
        pedido: { ...pedido, valor_negociado: valorMasterPedido },
        condicao: params.condicao,
        contaBancariaId: params.contaId
      }),
    onSuccess: (titulos) => {
      let successMsg = 'Pedido confirmado! Veículo agora disponível no estoque.';
      if (titulos && titulos.length > 0) {
        const vencimento = new Date(titulos[0].data_vencimento);
        const vencimentoStr = vencimento.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        successMsg = `Pedido confirmado! Lançamento criado para ${vencimentoStr}.`;
      }
      showNotification('success', successMsg);
      setShowConfirm(false);
      invalidatePedidoCompraFullChange(queryClient, id);
    },
    onError: (e: any) => showNotification('error', "Erro ao confirmar entrada: " + e.message)
  });

  const reopenMutation = useMutation({
    mutationFn: () => PedidosCompraService.reopenOrder(id!),
    onSuccess: () => {
      showNotification('success', 'Pedido reaberto com sucesso.');
      setShowReopen(false);
      invalidatePedidoCompraFullChange(queryClient, id);
    },
    onError: () => showNotification('error', 'Erro ao reabrir pedido.')
  });

  const deleteMutation = useMutation({
    mutationFn: () => PedidosCompraService.delete(id!),
    onSuccess: () => {
      navigate('/pedidos-compra');
      invalidatePedidoCompraFullChange(queryClient, id);
    },
    onError: () => showNotification('error', 'Erro ao excluir pedido.')
  });

  const savePaymentMutation = useMutation({
    mutationFn: async (payments: Partial<IPedidoPagamento>[]) => {
      for (const p of payments) {
        await PedidosCompraService.savePayment(p);
      }
    },
    onSuccess: (_, variables) => {
      showNotification('success', `${variables.length} pagamento(s) lançado(s) com sucesso!`);
      invalidatePedidoCompraDetails(queryClient, id);
      invalidatePedidosCompraOverview(queryClient);
      invalidatePedidoCompraFinancial(queryClient);
    },
    onError: () => showNotification('error', 'Erro ao processar pagamentos.')
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (payId: string) => PedidosCompraService.deletePayment(payId),
    onSuccess: () => {
      showNotification('success', 'Lançamento removido com sucesso.');
      invalidatePedidoCompraDetails(queryClient, id);
      invalidatePedidosCompraOverview(queryClient);
      invalidatePedidoCompraFinancial(queryClient);
    },
    onError: () => showNotification('error', 'Erro ao excluir lançamento.')
  });

  const unlinkVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) => PedidosCompraService.unlinkVehicle(vehicleId),
    onSuccess: () => {
      setUnlinkTargetId(null);
      invalidatePedidoCompraDetails(queryClient, id);
      invalidatePedidosCompraOverview(queryClient);
      invalidatePedidosCompraStock(queryClient);
    },
    onError: () => showNotification('error', 'Erro ao desvincular veículo.')
  });

  const saveNotesMutation = useMutation({
    mutationFn: (v: string) => PedidosCompraService.save({ id: pedido?.id, observacoes: v }),
    onSuccess: () => invalidatePedidoCompraDetails(queryClient, id),
    onError: () => showNotification('error', 'Erro ao salvar observações.')
  });

  // CÁLCULOS FINANCEIROS DE VALIDAÇÃO
  const totalCustoVeiculos = (pedido?.veiculos || []).reduce((acc, v) => acc + (v.valor_custo || 0), 0);
  const totalPagamentosLancados = (pedido?.pagamentos || []).reduce((acc, p) => acc + p.valor, 0);

  const isConsignacao = pedido?.forma_pagamento?.nome?.toLowerCase().includes('consigna') || false;

  const valorMasterPedido = totalCustoVeiculos > 0 ? totalCustoVeiculos : (pedido?.valor_negociado || 0);
  const isFinanceiroOK = totalCustoVeiculos > 0 && (isConsignacao || Math.abs(totalCustoVeiculos - totalPagamentosLancados) < 0.05);

  const handleDownloadPDF = () => window.print();

  if (isLoadingPedido || !pedido) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Sincronizando Pedido...</p>
      </div>
    );
  }

  const actionLoading = confirmMutation.isPending || reopenMutation.isPending ||
    deleteMutation.isPending || savePaymentMutation.isPending ||
    deletePaymentMutation.isPending || unlinkVehicleMutation.isPending ||
    saveNotesMutation.isPending;

  return (
    <div className="pb-32 space-y-8 animate-in fade-in duration-500 max-w-screen-2xl mx-auto px-4">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[300] px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right duration-300 border backdrop-blur-md ${toast.type === 'success' ? 'bg-slate-900/95 text-white border-emerald-500/50' : 'bg-rose-600 text-white border-rose-400/50'
          }`}>
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <HeaderPedido
        pedido={pedido}
        onBack={() => navigate('/pedidos-compra')}
        onEdit={() => navigate(`/pedidos-compra/editar/${pedido.id}`)}
        onConfirm={() => {
          if (isConsignacao) {
            confirmMutation.mutate({ condicao: { nome: 'AVULSO', qtd_parcelas: 1, dias_primeira_parcela: 0, dias_entre_parcelas: 0 } });
          } else {
            setShowConfirm(true);
          }
        }}
        onReopen={() => setShowReopen(true)}
        onDelete={() => setShowDelete(true)}
        onPrintSupplier={() => setPreviewType('supplier')}
        onPrintInternal={() => setPreviewType('internal')}
        loadingAction={actionLoading}
        canConfirm={isFinanceiroOK}
      />

      <InfoNegociacaoHeader pedido={pedido} />
      <PurchasePartnersResultKpis pedido={pedido} />
      <OrderCostKpis pedido={pedido} isConsignacao={isConsignacao} />

      <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
        <VeiculosPedidoList
          pedido={pedido}
          onUnlink={setUnlinkTargetId}
          isConcluido={pedido.status === 'CONCLUIDO'}
        />
      </section>

      {!isConsignacao && (
        <section>
          <CardPaymentData
            pedido={pedido}
            totalAquisicaoReferencia={valorMasterPedido}
            onAddPayment={(p) => savePaymentMutation.mutate(p)}
            onDeletePayment={(pid) => deletePaymentMutation.mutate(pid)}
            isSaving={actionLoading}
          />
        </section>
      )}

      <CardAnnotations
        initialValue={pedido.observacoes}
        onSave={(v) => saveNotesMutation.mutate(v)}
        isSaving={saveNotesMutation.isPending}
      />

      {empresa && (
        <QuickPreviewModal
          isOpen={!!previewType}
          onClose={() => setPreviewType(null)}
          onDownload={handleDownloadPDF}
          title={previewType === 'supplier' ? 'Pedido para Fornecedor' : 'Análise Estratégica Interna'}
        >
          {previewType === 'supplier' ? (
            <PurchaseOrderPrint
              pedido={pedido}
              empresa={empresa}
              watermark={watermark}
              allCaracteristicas={allCaracteristicas}
              allOpcionais={allOpcionais}
            />
          ) : (
            <InternalAnalysisPrint
              pedido={pedido}
              empresa={empresa}
              watermark={watermark}
              allCaracteristicas={allCaracteristicas}
              allOpcionais={allOpcionais}
            />
          )}
        </QuickPreviewModal>
      )}

      <div className="hidden print:block">
        {empresa && (
          <>
            <PurchaseOrderPrint
              pedido={pedido}
              empresa={empresa}
              watermark={watermark}
              allCaracteristicas={allCaracteristicas}
              allOpcionais={allOpcionais}
            />
            <InternalAnalysisPrint
              pedido={pedido}
              empresa={empresa}
              watermark={watermark}
              allCaracteristicas={allCaracteristicas}
              allOpcionais={allOpcionais}
            />
          </>
        )}
      </div>

      {showConfirm && (
        <ModalConfirmacaoFinanceira
          pedido={{ ...pedido, valor_negociado: valorMasterPedido }}
          onClose={() => setShowConfirm(false)}
          onConfirm={(params) => confirmMutation.mutate(params)}
          isLoading={confirmMutation.isPending}
        />
      )}

      <ConfirmModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Excluir Pedido?"
        message="Esta ação apagará o pedido e todos os vínculos relacionados, incluindo veículo, pagamentos e lançamentos financeiros vinculados."
        confirmText="Sim, Excluir"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!unlinkTargetId}
        onClose={() => setUnlinkTargetId(null)}
        onConfirm={() => unlinkVehicleMutation.mutate(unlinkTargetId!)}
        title="Remover Veículo?"
        message="O veículo será desvinculado deste contrato."
        isLoading={unlinkVehicleMutation.isPending}
      />

      <ConfirmModal
        isOpen={showReopen}
        onClose={() => setShowReopen(false)}
        onConfirm={() => reopenMutation.mutate()}
        title="Reabrir Pedido de Compra?"
        message="Deseja reabrir este pedido para edição? O status voltará para Rascunho."
        confirmText="Sim, Reabrir"
        cancelText="Voltar"
        variant="info"
        isLoading={reopenMutation.isPending}
      />
    </div>
  );
};

export default PedidoCompraDetalhesPage;
