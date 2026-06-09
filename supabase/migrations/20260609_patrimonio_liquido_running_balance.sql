-- Migration: Colunas de Saldo do Patrimônio Líquido e Tipo de Lançamento na Conciliação Patrimonial
-- Data: 2026-06-09
-- Objetivo: Prover funções no banco de dados para calcular o Patrimônio Líquido retroativo em qualquer timestamp e listar transações de conciliação enriquecidas com o saldo do PL na data correspondente e a descrição amigável do tipo.

CREATE OR REPLACE FUNCTION public.get_patrimonio_liquido_at_date(p_org_id UUID, p_date timestamp with time zone)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_saldo_disponivel numeric;
    v_total_ativos_estoque numeric;
    v_total_recebiveis numeric;
    v_total_passivo_circulante numeric;
BEGIN
    -- 1. Saldo Bancário Real no timestamp p_date
    SELECT COALESCE(SUM(
        CASE 
            WHEN c.data_saldo_inicial > p_date THEN 0
            ELSE 
                c.saldo_atual 
                - COALESCE((SELECT SUM(t.valor) FROM public.fin_transacoes t WHERE t.conta_origem_id = c.id AND t.tipo = 'ENTRADA' AND t.data_pagamento > p_date AND t.tipo_transacao != 'ESTORNO'), 0)
                + COALESCE((SELECT SUM(t.valor) FROM public.fin_transacoes t WHERE t.conta_origem_id = c.id AND t.tipo = 'SAIDA' AND t.data_pagamento > p_date AND t.tipo_transacao != 'ESTORNO'), 0)
        END
    ), 0) INTO v_saldo_disponivel 
    FROM public.fin_contas_bancarias c WHERE organization_id = p_org_id AND ativo = true;

    -- 2. Ativos em Estoque no timestamp p_date
    SELECT COALESCE(SUM(COALESCE(valor_custo, 0) + COALESCE(valor_custo_servicos, 0)), 0)
    INTO v_total_ativos_estoque
    FROM public.est_veiculos ev
    WHERE organization_id = p_org_id 
      AND ev.created_at <= p_date
      AND NOT EXISTS (
          SELECT 1 FROM public.venda_pedidos vp 
          WHERE vp.veiculo_id = ev.id 
            AND vp.status = 'CONCLUIDO' 
            AND vp.data_venda::timestamp <= p_date
      );

    -- 3. Contas a Receber (Subtraindo descontos) no timestamp p_date
    SELECT COALESCE(SUM(
        GREATEST(0, 
            tit.valor_total 
            + COALESCE((SELECT SUM(valor) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao = 'ACRESCIMO_TITULO' AND data_pagamento <= p_date), 0)
            - COALESCE((SELECT SUM(valor) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao = 'DESCONTO_TITULO' AND data_pagamento <= p_date), 0)
            - COALESCE((SELECT SUM(
                CASE 
                    WHEN tipo = 'ENTRADA' THEN valor 
                    ELSE -valor 
                END
              ) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao NOT IN ('DESCONTO_TITULO', 'ACRESCIMO_TITULO', 'EMPRESTIMO_CONCEDIDO') AND data_pagamento <= p_date), 0)
        )
    ), 0)
    INTO v_total_recebiveis
    FROM public.fin_titulos tit
    WHERE organization_id = p_org_id 
      AND tipo = 'RECEBER' 
      AND status != 'CANCELADO'
      AND created_at <= p_date;

    -- 4. Contas a Pagar (Subtraindo descontos) no timestamp p_date
    SELECT COALESCE(SUM(
        GREATEST(0, 
            tit.valor_total 
            + COALESCE((SELECT SUM(valor) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao = 'ACRESCIMO_TITULO' AND data_pagamento <= p_date), 0)
            - COALESCE((SELECT SUM(valor) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao = 'DESCONTO_TITULO' AND data_pagamento <= p_date), 0)
            - COALESCE((SELECT SUM(
                CASE 
                    WHEN tipo = 'SAIDA' THEN valor 
                    ELSE -valor 
                END
              ) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao NOT IN ('DESCONTO_TITULO', 'ACRESCIMO_TITULO', 'EMPRESTIMO_CONCEDIDO') AND data_pagamento <= p_date), 0)
        )
    ), 0)
    INTO v_total_passivo_circulante
    FROM public.fin_titulos tit
    WHERE organization_id = p_org_id 
      AND tipo = 'PAGAR' 
      AND status != 'CANCELADO'
      AND created_at <= p_date;

    RETURN (v_saldo_disponivel + v_total_ativos_estoque + v_total_recebiveis) - v_total_passivo_circulante;
END;
$$;

-- Função principal RPC para buscar as transações com saldo de PL e tipo amigável
CREATE OR REPLACE FUNCTION public.get_conciliacao_patrimonial_transacoes(p_data_inicio date, p_data_fim date)
RETURNS TABLE (
    id UUID,
    data_pagamento timestamp with time zone,
    valor numeric,
    tipo text,
    tipo_transacao text,
    descricao text,
    origem_tipo text,
    categoria_nome text,
    parceiro_nome text,
    tipo_descricao text,
    patrimonio_liquido numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_org_id UUID;
    v_data_fim_limit timestamp with time zone;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1;
    IF v_org_id IS NULL THEN RETURN; END IF;

    v_data_fim_limit := (p_data_fim + interval '1 day') - interval '1 microsecond';

    RETURN QUERY
    SELECT 
        t.id,
        t.data_pagamento,
        t.valor,
        t.tipo::text,
        t.tipo_transacao::text,
        t.descricao,
        tit.origem_tipo::text,
        cat.nome::text AS categoria_nome,
        parc.nome::text AS parceiro_nome,
        CASE 
            WHEN tit.origem_tipo = 'PEDIDO_COMPRA' THEN 'Compra de Veículo'
            WHEN tit.origem_tipo = 'PEDIDO_VENDA' THEN 'Venda de Veículo'
            WHEN tit.origem_tipo = 'DESPESA_VEICULO' THEN 'Despesa de Veículo'
            WHEN tit.origem_tipo = 'DESPESA_FIXA' THEN 'Despesa Fixa'
            WHEN tit.origem_tipo = 'DESPESA_VARIAVEL' THEN 'Despesa Variável'
            WHEN tit.origem_tipo = 'OUTRO_CREDITO' THEN 'Outro Crédito'
            WHEN tit.origem_tipo = 'OUTRO_DEBITO' THEN 'Outro Débito'
            WHEN tit.origem_tipo = 'MANUAL' THEN 'Lançamento Manual'
            ELSE COALESCE(tit.origem_tipo::text, 'Geral')
        END AS tipo_descricao,
        public.get_patrimonio_liquido_at_date(v_org_id, t.data_pagamento) AS patrimonio_liquido
    FROM public.fin_transacoes t
    LEFT JOIN public.fin_titulos tit ON t.titulo_id = tit.id
    LEFT JOIN public.fin_categorias cat ON tit.categoria_id = cat.id
    LEFT JOIN public.parceiros parc ON tit.parceiro_id = parc.id
    WHERE tit.organization_id = v_org_id
      AND tit.status != 'CANCELADO'
      AND t.data_pagamento::date BETWEEN p_data_inicio AND p_data_fim
    ORDER BY t.data_pagamento ASC, t.id ASC;
END;
$$;
