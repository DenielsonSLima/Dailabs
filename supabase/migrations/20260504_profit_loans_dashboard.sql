
-- Atualização do Lucro Mensal no Dashboard para incluir Empréstimos/Acréscimos Manuais
-- Data: 2026-05-04

CREATE OR REPLACE FUNCTION public.get_caixa_metrics(p_data_inicio date, p_data_fim date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_org_id UUID;
    v_total_ativos_estoque numeric;
    v_qtd_veiculos_estoque integer;
    v_saldo_disponivel numeric;
    v_total_recebiveis numeric;
    v_total_passivo_circulante numeric;
    v_total_despesas_fixas numeric;
    v_total_despesas_variaveis numeric;
    v_total_outros_debitos numeric;
    v_total_entradas numeric;
    v_total_saidas numeric;
    v_total_compras numeric;
    v_total_vendas_recebido numeric;
    v_total_custo_vendas numeric;
    v_lucro_adicionais numeric;
    v_data_fim_limit timestamp with time zone;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1;
    IF v_org_id IS NULL THEN RETURN '{}'::jsonb; END IF;

    v_data_fim_limit := (p_data_fim + interval '1 day') - interval '1 microsecond';

    SELECT COALESCE(SUM(
        CASE 
            WHEN c.data_saldo_inicial > v_data_fim_limit THEN 0
            ELSE 
                c.saldo_atual 
                - COALESCE((SELECT SUM(t.valor) FROM public.fin_transacoes t WHERE t.conta_origem_id = c.id AND t.tipo = 'ENTRADA' AND t.data_pagamento > v_data_fim_limit AND t.tipo_transacao != 'ESTORNO'), 0)
                + COALESCE((SELECT SUM(t.valor) FROM public.fin_transacoes t WHERE t.conta_origem_id = c.id AND t.tipo = 'SAIDA' AND t.data_pagamento > v_data_fim_limit AND t.tipo_transacao != 'ESTORNO'), 0)
        END
    ), 0) INTO v_saldo_disponivel 
    FROM public.fin_contas_bancarias c WHERE organization_id = v_org_id AND ativo = true;

    SELECT COALESCE(SUM(COALESCE(valor_custo, 0) + COALESCE(valor_custo_servicos, 0)), 0), COUNT(id)
    INTO v_total_ativos_estoque, v_qtd_veiculos_estoque
    FROM public.est_veiculos ev
    WHERE organization_id = v_org_id 
      AND ev.created_at <= v_data_fim_limit
      AND NOT EXISTS (
          SELECT 1 FROM public.venda_pedidos vp 
          WHERE vp.veiculo_id = ev.id 
            AND vp.status = 'CONCLUIDO' 
            AND vp.data_venda::date <= p_data_fim
      );
    
    SELECT COALESCE(SUM(
        GREATEST(0, 
            tit.valor_total 
            + COALESCE((SELECT SUM(valor) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao = 'ACRESCIMO_TITULO' AND data_pagamento <= v_data_fim_limit), 0)
            - COALESCE((SELECT SUM(valor) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao = 'DESCONTO_TITULO' AND data_pagamento <= v_data_fim_limit), 0)
            - COALESCE((SELECT SUM(
                CASE 
                    WHEN tipo = 'ENTRADA' THEN valor 
                    ELSE -valor 
                END
              ) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao NOT IN ('DESCONTO_TITULO', 'ACRESCIMO_TITULO', 'EMPRESTIMO_CONCEDIDO') AND data_pagamento <= v_data_fim_limit), 0)
        )
    ), 0)
    INTO v_total_recebiveis
    FROM public.fin_titulos tit
    WHERE organization_id = v_org_id 
      AND tipo = 'RECEBER' 
      AND status != 'CANCELADO'
      AND created_at <= v_data_fim_limit;

    SELECT COALESCE(SUM(
        GREATEST(0, 
            tit.valor_total 
            + COALESCE((SELECT SUM(valor) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao = 'ACRESCIMO_TITULO' AND data_pagamento <= v_data_fim_limit), 0)
            - COALESCE((SELECT SUM(valor) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao = 'DESCONTO_TITULO' AND data_pagamento <= v_data_fim_limit), 0)
            - COALESCE((SELECT SUM(
                CASE 
                    WHEN tipo = 'SAIDA' THEN valor 
                    ELSE -valor 
                END
              ) FROM public.fin_transacoes WHERE titulo_id = tit.id AND tipo_transacao NOT IN ('DESCONTO_TITULO', 'ACRESCIMO_TITULO', 'EMPRESTIMO_CONCEDIDO') AND data_pagamento <= v_data_fim_limit), 0)
        )
    ), 0)
    INTO v_total_passivo_circulante
    FROM public.fin_titulos tit
    WHERE organization_id = v_org_id 
      AND tipo = 'PAGAR' 
      AND status != 'CANCELADO'
      AND created_at <= v_data_fim_limit;

    SELECT COALESCE(SUM(t.valor), 0) INTO v_total_entradas
    FROM public.fin_transacoes t JOIN public.fin_titulos tit ON t.titulo_id = tit.id
    WHERE tit.organization_id = v_org_id 
      AND t.tipo = 'ENTRADA'
      AND tit.origem_tipo <> 'TRANSFERENCIA'
      AND tit.status != 'CANCELADO'
      AND t.tipo_transacao != 'ESTORNO'
      AND t.data_pagamento::date BETWEEN p_data_inicio AND p_data_fim;

    SELECT COALESCE(SUM(t.valor), 0) INTO v_total_saidas
    FROM public.fin_transacoes t JOIN public.fin_titulos tit ON t.titulo_id = tit.id
    WHERE tit.organization_id = v_org_id 
      AND t.tipo = 'SAIDA'
      AND tit.origem_tipo <> 'TRANSFERENCIA'
      AND tit.status != 'CANCELADO'
      AND t.tipo_transacao != 'ESTORNO'
      AND t.data_pagamento::date BETWEEN p_data_inicio AND p_data_fim;

    SELECT COALESCE(SUM(t.valor), 0) INTO v_total_despesas_fixas
    FROM public.fin_transacoes t JOIN public.fin_titulos tit ON t.titulo_id = tit.id
    WHERE tit.organization_id = v_org_id AND tit.tipo = 'PAGAR' AND tit.origem_tipo IN ('RECORRENTE', 'DESPESA', 'DESPESA_FIXA', 'FIXA')
      AND tit.status != 'CANCELADO'
      AND t.tipo_transacao != 'ESTORNO'
      AND t.data_pagamento::date BETWEEN p_data_inicio AND p_data_fim;

    SELECT COALESCE(SUM(t.valor), 0) INTO v_total_despesas_variaveis
    FROM public.fin_transacoes t JOIN public.fin_titulos tit ON t.titulo_id = tit.id
    WHERE tit.organization_id = v_org_id AND tit.tipo = 'PAGAR' AND tit.origem_tipo IN ('DESPESA_VARIAVEL', 'DESPESA_VEICULO', 'VARIAVEL')
      AND tit.status != 'CANCELADO'
      AND t.tipo_transacao != 'ESTORNO'
      AND t.data_pagamento::date BETWEEN p_data_inicio AND p_data_fim;

    SELECT COALESCE(SUM(t.valor), 0) INTO v_total_outros_debitos
    FROM public.fin_transacoes t JOIN public.fin_titulos tit ON t.titulo_id = tit.id
    WHERE tit.organization_id = v_org_id AND tit.tipo = 'PAGAR' AND tit.origem_tipo = 'OUTRO_DEBITO'
      AND tit.status != 'CANCELADO'
      AND t.tipo_transacao != 'ESTORNO'
      AND t.data_pagamento::date BETWEEN p_data_inicio AND p_data_fim;

    SELECT COALESCE(SUM(valor_negociado), 0) INTO v_total_compras FROM public.cmp_pedidos
    WHERE organization_id = v_org_id AND status = 'CONCLUIDO' AND (created_at::date BETWEEN p_data_inicio AND p_data_fim);

    SELECT COALESCE(SUM(v.valor_venda), 0), COALESCE(SUM(COALESCE(c.valor_custo, 0) + COALESCE(c.valor_custo_servicos, 0)), 0)
    INTO v_total_vendas_recebido, v_total_custo_vendas
    FROM public.venda_pedidos v
    LEFT JOIN public.est_veiculos c ON v.veiculo_id = c.id
    WHERE v.organization_id = v_org_id AND v.status = 'CONCLUIDO' AND v.data_venda::date BETWEEN p_data_inicio AND p_data_fim;

    SELECT COALESCE(SUM(
        tit.valor_total 
        - COALESCE((
            SELECT SUM(tr.valor) 
            FROM public.fin_transacoes tr 
            WHERE tr.titulo_id = tit.id 
              AND tr.tipo_transacao = 'EMPRESTIMO_CONCEDIDO' 
              AND tr.tipo = 'SAIDA'
          ), 0)
    ), 0)
    INTO v_lucro_adicionais
    FROM public.fin_titulos tit
    WHERE tit.organization_id = v_org_id 
      AND tit.origem_tipo = 'MANUAL'
      AND tit.status != 'CANCELADO'
      AND tit.data_vencimento::date BETWEEN p_data_inicio AND p_data_fim;

    RETURN jsonb_build_object(
        'patrimonio_liquido', (v_saldo_disponivel + v_total_ativos_estoque + v_total_recebiveis) - v_total_passivo_circulante,
        'saldo_disponivel', v_saldo_disponivel,
        'total_ativos_estoque', v_total_ativos_estoque,
        'qtd_veiculos_estoque', v_qtd_veiculos_estoque,
        'total_recebiveis', v_total_recebiveis,
        'total_passivo_circulante', v_total_passivo_circulante,
        'total_despesas_fixas', v_total_despesas_fixas,
        'total_despesas_variaveis', v_total_despesas_variaveis,
        'total_outros_debitos', v_total_outros_debitos,
        'total_entradas', v_total_entradas,
        'total_saidas', v_total_saidas,
        'total_compras', v_total_compras,
        'total_vendas_recebido', v_total_vendas_recebido,
        'total_custo_vendas', v_total_custo_vendas,
        'lucro_mensal', (v_total_vendas_recebido - v_total_custo_vendas + v_lucro_adicionais) - (v_total_despesas_fixas + v_total_despesas_variaveis + v_total_outros_debitos),
        'lucro_gerado', (v_total_vendas_recebido - v_total_custo_vendas + v_lucro_adicionais) - (v_total_despesas_fixas + v_total_despesas_variaveis + v_total_outros_debitos),
        'lucro_realizado', v_total_entradas - v_total_saidas,
        'lucro_pendente', v_total_recebiveis,
        'margem_lucro', CASE WHEN (v_total_vendas_recebido + v_lucro_adicionais) > 0 THEN (((v_total_vendas_recebido - v_total_custo_vendas + v_lucro_adicionais) - (v_total_despesas_fixas + v_total_despesas_variaveis + v_total_outros_debitos)) / (v_total_vendas_recebido + v_lucro_adicionais)) * 100 ELSE 0 END
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_performance_overview(p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_org_id UUID;
    v_vendas_valor NUMERIC := 0;
    v_vendas_qtd INTEGER := 0;
    v_compras_valor NUMERIC := 0;
    v_compras_qtd INTEGER := 0;
    v_lucro_bruto NUMERIC := 0;
    v_margem_media NUMERIC := 0;
    v_despesas_veiculos NUMERIC := 0;
    v_retiradas_socios NUMERIC := 0;
    v_contas_pagar_pendente NUMERIC := 0;
    v_contas_receber_pendente NUMERIC := 0;
    v_saldo_bancario NUMERIC := 0;
    v_total_entradas NUMERIC := 0;
    v_total_saidas NUMERIC := 0;
    v_lucro_adicionais NUMERIC := 0;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1;
    IF v_org_id IS NULL THEN RETURN null; END IF;

    SELECT 
        COALESCE(SUM(v.valor_venda), 0),
        COUNT(*),
        COALESCE(SUM(v.valor_venda - (COALESCE(e.valor_custo, 0) + COALESCE(e.valor_custo_servicos, 0))), 0),
        COALESCE(AVG(CASE WHEN (COALESCE(e.valor_custo, 0) + COALESCE(e.valor_custo_servicos, 0)) > 0 
            THEN ((v.valor_venda - (COALESCE(e.valor_custo, 0) + COALESCE(e.valor_custo_servicos, 0))) / (COALESCE(e.valor_custo, 0) + COALESCE(e.valor_custo_servicos, 0))) * 100 
            ELSE 0 END), 0)
    INTO v_vendas_valor, v_vendas_qtd, v_lucro_bruto, v_margem_media
    FROM public.venda_pedidos v
    LEFT JOIN public.est_veiculos e ON v.veiculo_id = e.id
    WHERE v.organization_id = v_org_id AND v.status = 'CONCLUIDO' AND v.data_venda BETWEEN p_start_date AND p_end_date;

    SELECT COALESCE(SUM(
        tit.valor_total 
        - COALESCE((
            SELECT SUM(tr.valor) 
            FROM public.fin_transacoes tr 
            WHERE tr.titulo_id = tit.id 
              AND tr.tipo_transacao = 'EMPRESTIMO_CONCEDIDO' 
              AND tr.tipo = 'SAIDA'
          ), 0)
    ), 0)
    INTO v_lucro_adicionais
    FROM public.fin_titulos tit
    WHERE tit.organization_id = v_org_id 
      AND tit.origem_tipo = 'MANUAL'
      AND tit.status != 'CANCELADO'
      AND tit.data_vencimento BETWEEN p_start_date::date AND p_end_date::date;

    v_lucro_bruto := v_lucro_bruto + v_lucro_adicionais;

    SELECT COALESCE(SUM(valor_negociado), 0), COUNT(*)
    INTO v_compras_valor, v_compras_qtd
    FROM public.cmp_pedidos
    WHERE organization_id = v_org_id AND status = 'CONCLUIDO' AND data_compra BETWEEN p_start_date AND p_end_date;

    SELECT COALESCE(SUM(valor_total), 0)
    INTO v_despesas_veiculos
    FROM public.est_veiculos_despesas
    WHERE organization_id = v_org_id AND data BETWEEN p_start_date AND p_end_date;

    SELECT COALESCE(SUM(valor), 0)
    INTO v_retiradas_socios
    FROM public.fin_retiradas
    WHERE organization_id = v_org_id AND data BETWEEN p_start_date AND p_end_date;

    SELECT COALESCE(SUM(valor_total + COALESCE(valor_acrescimo, 0) - COALESCE(valor_pago, 0) - COALESCE(valor_desconto, 0)), 0) 
    INTO v_contas_pagar_pendente
    FROM public.fin_titulos WHERE organization_id = v_org_id AND tipo = 'PAGAR' AND status NOT IN ('PAGO', 'CANCELADO');
    
    SELECT COALESCE(SUM(valor_total + COALESCE(valor_acrescimo, 0) - COALESCE(valor_pago, 0) - COALESCE(valor_desconto, 0)), 0) 
    INTO v_contas_receber_pendente
    FROM public.fin_titulos WHERE organization_id = v_org_id AND tipo = 'RECEBER' AND status NOT IN ('PAGO', 'CANCELADO');

    SELECT COALESCE(SUM(saldo_atual), 0) INTO v_saldo_bancario 
    FROM public.fin_contas_bancarias WHERE organization_id = v_org_id AND ativo = true;

    SELECT 
        COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'ENTRADA'), 0),
        COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'SAIDA'), 0)
    INTO v_total_entradas, v_total_saidas
    FROM public.fin_transacoes t
    JOIN public.fin_titulos tit ON t.titulo_id = tit.id
    WHERE tit.organization_id = v_org_id 
      AND t.data_pagamento BETWEEN p_start_date AND p_end_date
      AND tit.status != 'CANCELADO'
      AND t.tipo_transacao != 'ESTORNO';

    RETURN jsonb_build_object(
        'total_vendas_valor', v_vendas_valor,
        'total_vendas_qtd', v_vendas_qtd,
        'total_compras_valor', v_compras_valor,
        'total_compras_qtd', v_compras_qtd,
        'lucro_bruto', v_lucro_bruto,
        'margem_media', v_margem_media,
        'ticket_medio_venda', CASE WHEN v_vendas_qtd > 0 THEN v_vendas_valor / v_vendas_qtd ELSE 0 END,
        'despesas_veiculos', v_despesas_veiculos,
        'retiradas_socios', v_retiradas_socios,
        'contas_pagar_pendente', v_contas_pagar_pendente,
        'contas_receber_pendente', v_contas_receber_pendente,
        'saldo_contas_bancarias', v_saldo_bancario,
        'total_entradas', v_total_entradas,
        'total_saidas', v_total_saidas
    );
END;
$function$;
