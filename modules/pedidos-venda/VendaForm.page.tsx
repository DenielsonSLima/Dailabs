import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PedidosVendaService } from './pedidos-venda.service';
import { invalidatePedidoVendaDetails, invalidatePedidosVendaOverview } from './pedidos-venda.query-invalidation';
import { IPedidoVenda } from './pedidos-venda.types';
import { CorretoresService } from '../cadastros/corretores/corretores.service';
import { FormasPagamentoService } from '../cadastros/formas-pagamento/formas-pagamento.service';
import { ParceirosService } from '../parceiros/parceiros.service';
import { IParceiro } from '../parceiros/parceiros.types';


// Cards Modulares
import FormVendaHeader from './components/FormVendaHeader';
import FormVendaContext from './components/FormVendaContext';
import FormVendaClient from './components/FormVendaClient';
import FormVendaAddress from './components/FormVendaAddress';
import FormVendaFinance from './components/FormVendaFinance';
import FormVendaNotes from './components/FormVendaNotes';

const VendaFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  // Queries de Catálogos
  const { data: corretores = [] } = useQuery({ queryKey: ['corretores'], queryFn: () => CorretoresService.getAll() });
  const { data: parceiros = [] } = useQuery({ queryKey: ['parceiros_select'], queryFn: () => ParceirosService.getAllForSelect() });

  const { data: formas = [] } = useQuery({
    queryKey: ['formas_pagamento_venda'],
    queryFn: async () => {
      const all = await FormasPagamentoService.getAll();
      return all.filter((item: any) => item.tipo_movimentacao !== 'PAGAMENTO');
    }
  });

  // Query do Pedido (se houver ID)
  const { data: pedidoOriginal, isLoading: isLoadingPedido } = useQuery({
    queryKey: ['pedido_venda_detalhes', id],
    queryFn: () => PedidosVendaService.getById(id!),
    enabled: !!id
  });

  const [formData, setFormData] = useState<Partial<IPedidoVenda>>({
    status: 'RASCUNHO',
    data_venda: new Date().toISOString().split('T')[0],
    endereco_igual_cadastro: true,
    observacoes: '',
    valor_venda: 0
  });

  const formasFiltradas = useMemo(() => {
    if (!formas.length) return [];

    // Se um veículo já estiver vinculado e não for de consignação, esconder "Consignação"
    if (formData.veiculo_id && !formData.is_consignado) {
      return formas.filter((f: any) => !f.nome.toLowerCase().includes('consigna'));
    }

    return formas;
  }, [formas, formData.veiculo_id, formData.is_consignado]);

  // Sincronizar dados do pedido quando carregado
  useEffect(() => {
    if (pedidoOriginal) {
      setFormData(pedidoOriginal);
    }
  }, [pedidoOriginal]);

  const isLocked = !!id && formData.status !== 'RASCUNHO';

  // Mutation de Salvamento
  const saveMutation = useMutation({
    mutationFn: (data: Partial<IPedidoVenda>) => PedidosVendaService.save(data),
    onSuccess: (result) => {
      invalidatePedidosVendaOverview(queryClient);
      invalidatePedidoVendaDetails(queryClient, result.id);
      navigate(`/pedidos-venda/${result.id}`);
    },
    onError: (err: any) => {
      alert("Erro ao salvar: " + err.message);
    }
  });

  const handleUpdate = (updates: Partial<IPedidoVenda>) => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, ...updates }));
  };


  const handleClientChange = (pId: string) => {
    if (isLocked) return;
    const p = parceiros.find(x => x.id === pId);
    if (!p) return;

    const updates: Partial<IPedidoVenda> = { cliente_id: p.id };

    if (formData.endereco_igual_cadastro) {
      Object.assign(updates, {
        cep: p.cep, logradouro: p.logradouro, numero: p.numero,
        bairro: p.bairro, cidade: p.cidade, uf: p.uf, complemento: p.complemento
      });
    }
    handleUpdate(updates);
  };

  const handleToggleAddress = (checked: boolean) => {
    if (isLocked) return;
    const updates: Partial<IPedidoVenda> = { endereco_igual_cadastro: checked };

    if (checked && formData.cliente_id) {
      const p = parceiros.find(x => x.id === formData.cliente_id);
      if (p) {
        Object.assign(updates, {
          cep: p.cep, logradouro: p.logradouro, numero: p.numero,
          bairro: p.bairro, cidade: p.cidade, uf: p.uf, complemento: p.complemento
        });
      }
    }
    handleUpdate(updates);
  };

  const handleSubmit = async () => {
    if (isLocked) return;
    if (!formData.cliente_id) {
      alert("Por favor, selecione o comprador.");
      return;
    }


    saveMutation.mutate(formData);
  };

  const isLoading = isLoadingPedido && !!id;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Preparando Pedido...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <FormVendaHeader
        id={id}
        isSaving={saveMutation.isPending}
        isLocked={isLocked}
        onBack={() => navigate(-1)}
        onSave={handleSubmit}
      />

      <div className={`space-y-8 ${isLocked ? 'opacity-75 pointer-events-none' : ''}`}>
        <FormVendaContext
          formData={formData}
          corretores={corretores}
          onChange={handleUpdate}
          disabled={isLocked}
        />


        <FormVendaClient
          formData={formData}
          parceiros={parceiros}
          onChange={handleClientChange}
          disabled={isLocked}
        />

        <FormVendaAddress
          formData={formData}
          onToggle={handleToggleAddress}
          onChange={handleUpdate}
          disabled={isLocked}
        />

        <FormVendaFinance
          formData={formData}
          formas={formasFiltradas}
          onChange={handleUpdate}
          disabled={isLocked}
        />

        <FormVendaNotes
          formData={formData}
          onChange={handleUpdate}
          disabled={isLocked}
        />
      </div>
    </div>
  );
};

export default VendaFormPage;
