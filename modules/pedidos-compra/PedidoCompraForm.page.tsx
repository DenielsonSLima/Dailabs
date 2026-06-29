import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PedidosCompraService } from './pedidos-compra.service';
import { invalidatePedidoCompraDetails, invalidatePedidosCompraOverview } from './pedidos-compra.query-invalidation';
import { IPedidoCompra } from './pedidos-compra.types';
import { CorretoresService } from '../cadastros/corretores/corretores.service';
import { FormasPagamentoService } from '../cadastros/formas-pagamento/formas-pagamento.service';
import { ParceirosService } from '../parceiros/parceiros.service';
import { IParceiro } from '../parceiros/parceiros.types';

import FormCardHeader from './components/FormCardHeader';
import FormCardContext from './components/FormCardContext';
import FormCardSupplier from './components/FormCardSupplier';
import FormCardAddress from './components/FormCardAddress';
import FormCardFinance from './components/FormCardFinance';
import FormCardNotes from './components/FormCardNotes';

const PedidoCompraFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const queryClient = useQueryClient();

  // Queries de Catálogos
  const { data: corretores = [] } = useQuery({ queryKey: ['corretores'], queryFn: () => CorretoresService.getAll() });
  const { data: formas = [] } = useQuery({
    queryKey: ['formas_pagamento_compra'],
    queryFn: async () => {
      const all = await FormasPagamentoService.getAll();
      return all.filter((item: any) => item.tipo_movimentacao !== 'RECEBIMENTO');
    }
  });
  const { data: parceiros = [] } = useQuery({ queryKey: ['parceiros_select'], queryFn: () => ParceirosService.getAllForSelect() });

  // Query do Pedido (se houver ID)
  const { data: pedidoOriginal, isLoading: isLoadingPedido } = useQuery({
    queryKey: ['pedido_compra_detalhes', id],
    queryFn: () => PedidosCompraService.getById(id!),
    enabled: !!id
  });

  const [formData, setFormData] = useState<Partial<IPedidoCompra>>({
    status: 'RASCUNHO',
    data_compra: new Date().toISOString().split('T')[0],
    endereco_igual_cadastro: true,
    observacoes: '',
    valor_negociado: 0
  });

  // Sincronizar dados do pedido quando carregado ou por navegação externa (Fipe)
  useEffect(() => {
    if (pedidoOriginal) {
      setFormData(pedidoOriginal);
    } else if (!id && location.state?.vehicleData) {
      // Pré-preenchimento via Consulta Fipe do Dashboard
      const vd = location.state.vehicleData;
      setFormData(prev => ({
        ...prev,
        descricao_veiculo: `${vd.marca} ${vd.modelo} ${vd.anoModelo} (${vd.combustivel})`.toUpperCase(),
        valor_negociado: vd.valorFipe,
        observacoes: `CONSULTA FIPE REALIZADA EM: ${new Date().toLocaleDateString('pt-BR')}\nPlaca: ${vd.placa}\nChassi: ${vd.chassi}\nCódigo Fipe: ${vd.codigoFipe}\nValor Fipe: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vd.valorFipe)}`
      }));
    }
  }, [pedidoOriginal, id, location.state]);

  const isConcluido = !!id && formData.status !== 'RASCUNHO';

  // Mutation de Salvamento
  const saveMutation = useMutation({
    mutationFn: (data: Partial<IPedidoCompra>) => PedidosCompraService.save(data),
    onSuccess: (result) => {
      invalidatePedidosCompraOverview(queryClient);
      invalidatePedidoCompraDetails(queryClient, result.id);
      if (!id && result.status === 'RASCUNHO') {
        navigate(`/pedidos-compra/${result.id}/adicionar-veiculo`);
        return;
      }
      navigate(`/pedidos-compra/${result.id}`);
    },
    onError: (err: any) => {
      alert("Erro ao salvar: " + err.message);
    }
  });


  const handleUpdate = (updates: Partial<IPedidoCompra>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handlePartnerChange = (p: IParceiro) => {
    const updates: Partial<IPedidoCompra> = { fornecedor_id: p.id };

    if (formData.endereco_igual_cadastro) {
      Object.assign(updates, {
        cep: p.cep, logradouro: p.logradouro, numero: p.numero,
        bairro: p.bairro, cidade: p.cidade, uf: p.uf, complemento: p.complemento
      });
    }
    handleUpdate(updates);
  };

  const handleToggleAddress = (checked: boolean) => {
    const updates: Partial<IPedidoCompra> = { endereco_igual_cadastro: checked };

    if (checked && formData.fornecedor_id) {
      const p = parceiros.find(x => x.id === formData.fornecedor_id);
      if (p) {
        Object.assign(updates, {
          cep: p.cep, logradouro: p.logradouro, numero: p.numero,
          bairro: p.bairro, cidade: p.cidade, uf: p.uf, complemento: p.complemento
        });
      }
    } else if (!checked) {
      Object.assign(updates, {
        cep: '', logradouro: '', numero: '',
        bairro: '', cidade: '', uf: '', complemento: ''
      });
    }
    handleUpdate(updates);
  };

  const handleSubmit = async () => {
    if (!formData.fornecedor_id) {
      alert("Selecione o fornecedor.");
      return;
    }

    if (!formData.forma_pagamento_id) {
      alert("Selecione a Forma de Pagamento deste pedido nas Condições Financeiras.");
      return;
    }

    if (isConcluido) {
      if (!confirm("Este pedido já está CONCLUÍDO. Alterar os dados cadastrais agora pode causar divergências com o financeiro já gerado. Deseja continuar?")) {
        return;
      }
    }

    saveMutation.mutate(formData);
  };

  const isLoading = isLoadingPedido && !!id;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-40 animate-pulse">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Sincronizando Módulos...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <FormCardHeader
        id={id}
        isSaving={saveMutation.isPending}
        isLocked={false}
        onBack={() => navigate(-1)}
        onSave={handleSubmit}
      />

      {isConcluido && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex items-center space-x-4 animate-in zoom-in-95 shadow-sm">
          <div className="w-12 h-12 bg-amber-200 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Pedido em Modo de Edição Pós-Finalização</p>
            <p className="text-xs font-medium text-amber-700 leading-relaxed">
              As alterações feitas aqui atualizarão o cabeçalho do pedido, mas <span className="font-bold">não alteram</span> títulos financeiros ou entradas de estoque que já foram processadas.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <FormCardContext
          formData={formData}
          corretores={corretores}
          onChange={handleUpdate}
          disabled={false}
        />

        <FormCardSupplier
          formData={formData}
          parceiros={parceiros}
          onChange={handlePartnerChange}
          disabled={false}
        />

        <FormCardAddress
          formData={formData}
          onToggle={handleToggleAddress}
          onChange={handleUpdate}
          disabled={false}
        />

        <FormCardFinance
          formData={formData}
          formas={formas}
          onChange={handleUpdate}
          disabled={false}
        />

        <FormCardNotes
          formData={formData}
          onChange={handleUpdate}
          disabled={false}
        />
      </div>
    </div>
  );
};

export default PedidoCompraFormPage;
