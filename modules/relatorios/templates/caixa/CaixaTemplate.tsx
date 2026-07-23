import React from 'react';
import BaseReportLayout from '../BaseReportLayout';
import { IEmpresa } from '../../../ajustes/empresa/empresa.types';
import { IAnotacao } from '../../../financeiro/submodules/anotacoes/anotacoes.types';

interface Props {
    data: any;
    empresa?: IEmpresa;
    watermark?: any; // Config object
    periodo?: string;
    anotacoes?: IAnotacao[];
}

const CaixaTemplate: React.FC<Props> = ({ data, empresa, watermark, periodo, anotacoes = [] }) => {
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
    const fmtK = (v: number) => {
        if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
        if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
        return v.toFixed(0);
    };

    const kpis = [
        { label: 'Patrimônio Líquido', val: data.patrimonio_liquido, color: '#4f46e5', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
        { label: 'Saldo Disponível', val: data.saldo_disponivel, color: '#10b981', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { label: 'Ativos (Estoque)', val: data.total_ativos_estoque, color: '#3b82f6', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', sub: `${data.qtd_veiculos_estoque ?? 0} veículos` },
        { label: 'Contas a Receber', val: data.total_recebiveis, color: '#f59e0b', icon: 'M9 14l6-6m-5.5 .5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
        { label: 'Contas a Pagar', val: data.total_passivo_circulante, color: '#f43f5e', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
        { label: 'Lucro do Mês', val: data.lucro_mensal, color: '#6366f1', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
        { label: 'Vendas (Recebido)', val: data.total_vendas_recebido, color: '#06b6d4', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { label: 'Compra (Vendidos)', val: data.total_custo_vendas, color: '#64748b', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
        { label: 'Despesas Fixas', val: data.total_despesas_fixas, color: '#e11d48', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        { label: 'Despesas Variáveis', val: data.total_despesas_variaveis, color: '#e11d48', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    ];

    const history = data.history || [];
    const maxVal = Math.max(...history.flatMap((m: any) => [m.faturado, m.custo, m.despesas]), 100000);

    const allVehicles: any[] = [];
    const vehicleMap = new Map();
    const partnerTotalsMap = new Map<string, number>();

    (data.socios || []).forEach((socio: any) => {
        let socioTotalValue = 0;
        const shortName = socio.nome ? socio.nome.split(' ')[0] : 'Sócio';

        (socio.veiculos || []).forEach((v: any) => {
            if (!v || !v.id) return;
            socioTotalValue += (v.valor || 0);

            if (!vehicleMap.has(v.id)) {
                vehicleMap.set(v.id, { ...v, partners: [] });
                allVehicles.push(vehicleMap.get(v.id));
            }
            vehicleMap.get(v.id).partners.push({
                nome: shortName,
                valor: v.valor,
                percent: v.valor_total_custo > 0 ? (v.valor / v.valor_total_custo) * 100 : 0
            });
        });
        partnerTotalsMap.set(shortName, socioTotalValue);
    });
    const sortedVehicles = allVehicles.sort((a, b) => (a.modelo || '').localeCompare(b.modelo || ''));
    const partnerTotals = Array.from(partnerTotalsMap.entries()).map(([nome, total]) => ({ nome, total }));
    const totalEstoque = partnerTotals.reduce((acc, pt) => acc + pt.total, 0);

    const vehicleChunks: any[][] = [];
    for (let i = 0; i < sortedVehicles.length; i += 4) {
        vehicleChunks.push(sortedVehicles.slice(i, i + 4));
    }
    const hasAnotacoes = anotacoes && anotacoes.length > 0;
    const totalPagesCalculated = 3 + vehicleChunks.length + (hasAnotacoes ? 1 : 0);

    return (
        <div className="report-container" style={{ backgroundColor: '#f8fafc' }}>
            <style>{`
        @media print {
          .page-break { page-break-before: always; }
        }
        .report-card { background: white; border-radius: 1.5rem; border: 1px solid #e2e8f0; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
        .kpi-card { padding: 1rem; border-radius: 1rem; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 0.75rem; }
        .kpi-card-main { background: #4f46e5; border-color: #4338ca; color: white; }
        .kpi-icon { width: 2rem; height: 2rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; shrink-0; }
        .chart-container { height: 250px; position: relative; border-left: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; margin-left: 2rem; margin-top: 2rem; }
        .y-axis { position: absolute; left: -2.5rem; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; font-size: 8px; font-weight: bold; color: #94a3b8; text-align: right; width: 2rem; }
        .bars-area { position: absolute; inset: 0; display: flex; align-items: flex-end; }
        .bar-group { flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 4px; padding: 0 10px; height: 100%; position: relative; }
        .bar { width: 15px; border-top-left-radius: 2px; border-top-right-radius: 2px; position: relative; }
        .bar-label { position: absolute; bottom: -1.5rem; font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 100%; text-align: center; }
        .profit-line { position: absolute; inset: 0; pointer-events: none; }
        .vehicle-card { background: white; border: 1px solid #e2e8f0; border-radius: 1.25rem; margin-bottom: 1rem; overflow: hidden; display: flex; }
        .vehicle-info { padding: 1.5rem; border-right: 1px solid #f1f5f9; flex: 1; display: flex; gap: 1rem; align-items: center; }
        .vehicle-equity { width: 180px; padding: 1.5rem; background: #f8fafc; text-align: center; border-right: 1px solid #f1f5f9; display: flex; flex-direction: column; justify-content: center; }
        .vehicle-partners { width: 240px; padding: 1.5rem; display: flex; flex-direction: column; justify-content: center; gap: 0.5rem; }
        .partner-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: #f8fafc; border-radius: 0.75rem; font-size: 10px; }
      `}</style>

            <BaseReportLayout title="Relatório Financeiro & Patrimônio" empresa={empresa} watermark={watermark} subtitle={periodo} pageNumber={1} totalPages={totalPagesCalculated} isManualPagination={true}>
                <div style={{ padding: '0.4rem 1.5rem 1rem 1.5rem' }}>
                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', width: '100%', marginBottom: '1rem' }}>
                        {kpis.map((k, i) => (
                            <div key={i} className={`kpi-card ${i < 2 ? 'kpi-card-main' : ''}`} style={{ marginBottom: 0, minWidth: 0 }}>
                                <div className="kpi-icon" style={{ backgroundColor: i < 2 ? 'rgba(255,255,255,0.2)' : `${k.color}15`, color: i < 2 ? 'white' : k.color }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={i < 2 ? '#FFFFFF' : k.color} strokeWidth={3} data-pdf-safe="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d={k.icon} />
                                    </svg>
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <p style={{ fontSize: '7px', fontWeight: 'black', textTransform: 'uppercase', color: i < 2 ? 'rgba(255,255,255,0.8)' : '#94a3b8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</p>
                                    <h4 style={{ fontSize: '11px', fontWeight: 'black', margin: 0 }}>{fmt(k.val)}</h4>
                                    {k.sub && <span style={{ fontSize: '6px', fontWeight: 'bold', color: i < 2 ? 'rgba(255,255,255,0.7)' : '#94a3b8', textTransform: 'uppercase', display: 'block', marginTop: '1px' }}>{k.sub}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div className="report-card" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', margin: 0 }}>Desempenho Trimestral</h3>
                                    <p style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '1px 0 0 0' }}>Histórico de faturamento, custos e lucro</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <div style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: '#4f46e5' }}></div>
                                        <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Faturado</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <div style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: '#f59e0b' }}></div>
                                        <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Custo</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <div style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: '#f43f5e' }}></div>
                                        <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Despesas</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
                                        <div style={{ width: '12px', height: '2px', borderRadius: '1px', backgroundColor: '#10b981' }}></div>
                                        <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Lucro</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ position: 'relative', height: '150px', borderLeft: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', marginLeft: '2.5rem' }}>
                                <div style={{ position: 'absolute', left: '-2.8rem', top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '7px', fontWeight: 'bold', color: '#cbd5e1', textAlign: 'right', width: '2.5rem' }}>
                                    <span>{fmtK(maxVal)}</span>
                                    <span>{fmtK(maxVal * 0.75)}</span>
                                    <span>{fmtK(maxVal * 0.5)}</span>
                                    <span>{fmtK(maxVal * 0.25)}</span>
                                    <span>0</span>
                                </div>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                                    {history.map((m: any, i: number) => {
                                        const hF = Math.max((m.faturado / maxVal) * 100, 0);
                                        const hC = Math.max((m.custo / maxVal) * 100, 0);
                                        const hD = Math.max((m.despesas / maxVal) * 100, 0);
                                        return (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative', padding: '0 10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', maxWidth: '60px', height: '100%', justifyContent: 'center', paddingBottom: '18px' }}>
                                                    <div style={{ flex: 1, height: `${hF}%`, background: '#4f46e5', borderTopLeftRadius: '2px', borderTopRightRadius: '2px', minHeight: hF > 0 ? '3px' : '0', position: 'relative' }}>
                                                        {hF > 5 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#818cf8', borderTopLeftRadius: '2px', borderTopRightRadius: '2px' }}></div>}
                                                    </div>
                                                    <div style={{ flex: 1, height: `${hC}%`, background: '#f59e0b', borderTopLeftRadius: '2px', borderTopRightRadius: '2px', minHeight: hC > 0 ? '3px' : '0', position: 'relative' }}>
                                                        {hC > 5 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#fbbf24', borderTopLeftRadius: '2px', borderTopRightRadius: '2px' }}></div>}
                                                    </div>
                                                    <div style={{ flex: 1, height: `${hD}%`, background: '#f43f5e', borderTopLeftRadius: '2px', borderTopRightRadius: '2px', minHeight: hD > 0 ? '3px' : '0', position: 'relative' }}>
                                                        {hD > 5 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#fda4af', borderTopLeftRadius: '2px', borderTopRightRadius: '2px' }}></div>}
                                                    </div>
                                                </div>
                                                <div style={{ position: 'absolute', bottom: '0', fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>{m.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {history.length > 0 && (() => {
                                    const profitMax = Math.max(...history.map((m: any) => Math.abs(m.lucro || 0)), 50000);
                                    const svgWidth = 350;
                                    const svgHeight = 150;
                                    const dots = history.map((m: any, i: number) => {
                                        const xPercent = (i + 0.5) / history.length;
                                        const yPercent = Math.max(0.05, Math.min(0.85, 1 - ((m.lucro || 0) / profitMax) * 0.7 - 0.15));
                                        return { x: xPercent * svgWidth, y: yPercent * svgHeight, px: xPercent * 100, py: yPercent * 100, value: m.lucro || 0 };
                                    });
                                    let pathData = `M ${dots[0].x},${dots[0].y}`;
                                    for (let i = 0; i < dots.length - 1; i++) {
                                        const curr = dots[i];
                                        const next = dots[i + 1];
                                        const cp1x = curr.x + (next.x - curr.x) / 3;
                                        const cp2x = curr.x + (next.x - curr.x) * 2 / 3;
                                        pathData += ` C ${cp1x},${curr.y} ${cp2x},${next.y} ${next.x},${next.y}`;
                                    }
                                    return (
                                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 5 }}>
                                                <path d={pathData} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            {dots.map((dot, i) => (
                                                <React.Fragment key={`profit-${i}`}>
                                                    <div style={{ position: 'absolute', left: `${dot.px}%`, top: `${dot.py}%`, width: '8px', height: '8px', background: '#064e3b', borderRadius: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, border: '2px solid #10b981', boxShadow: '0 0 4px rgba(16,185,129,0.3)' }}></div>
                                                    <div style={{ position: 'absolute', left: `${dot.px}%`, top: `calc(${dot.py}% - 14px)`, transform: 'translateX(-50%)', fontSize: '8px', fontWeight: 'black', color: '#10b981', whiteSpace: 'nowrap', zIndex: 11 }}>{fmtK(dot.value)}</div>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="report-card" style={{ marginBottom: 0 }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Saldos em Conta</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {(data.contas || []).slice(0, 4).map((c: any) => (
                                    <div key={c.id} style={{ padding: '0.5rem', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '1.5rem', height: '1.5rem', background: c.cor_cartao || '#6366f1', borderRadius: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 'black' }}>
                                                {(c.banco_nome || '').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ fontSize: '9px', fontWeight: 'black', margin: 0, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.banco_nome}</p>
                                                <p style={{ fontSize: '6px', color: '#94a3b8', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.titular || 'Titular não informado'}</p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '10px', fontWeight: 'black', margin: 0 }}>{fmt(c.saldo_atual)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                                <span style={{ fontSize: '8px', fontWeight: 'black', color: '#94a3b8', textTransform: 'uppercase' }}>Disponível</span>
                                <span style={{ fontSize: '14px', fontWeight: 'black', color: '#4f46e5' }}>{fmt(data.saldo_disponivel)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </BaseReportLayout>

            <BaseReportLayout title="Contas Pendentes (A Pagar e A Receber)" empresa={empresa} watermark={watermark} subtitle={periodo} pageNumber={2} totalPages={totalPagesCalculated} isManualPagination={true}>
                <div style={{ padding: '0.4rem 2rem 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '2px solid #f43f5e', paddingBottom: '0.5rem' }}>
                            <div style={{ width: '1.5rem', height: '1.5rem', background: '#fff1f2', borderRadius: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '0.8rem', height: '0.8rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '12px', fontWeight: 'black', textTransform: 'uppercase', color: '#e11d48', margin: 0 }}>Contas a Pagar</h3>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '9px' }}>
                            <thead>
                                <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                                    <th style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: '8px', fontWeight: 'black', width: '15%' }}>Vencimento</th>
                                    <th style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: '8px', fontWeight: 'black', width: '45%' }}>Descrição</th>
                                    <th style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: '8px', fontWeight: 'black', width: '20%' }}>Veículo Relacionado</th>
                                    <th style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: '8px', fontWeight: 'black', width: '20%', textAlign: 'right' }}>Valor em Aberto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {((data.contasPendentes || []) as any[]).filter(t => t.tipo === 'PAGAR').map((c, idx) => {
                                    const v = (c.valor_total || 0) + (c.valor_acrescimo || 0) - (c.valor_pago || 0) - (c.valor_desconto || 0);
                                    const veiculoLabel = c.veiculo ? `${c.veiculo.modelo} (${c.veiculo.placa || ''})` : '—';
                                    return (
                                        <tr key={idx} style={{ background: '#fff5f5' }}>
                                            <td style={{ padding: '6px 8px', fontWeight: 'black', color: '#0f172a', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }}>{c.data_vencimento ? new Date(c.data_vencimento).toLocaleDateString('pt-BR') : '—'}</td>
                                            <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#334155' }}>{c.descricao || 'Pagamento sem descrição'}</td>
                                            <td style={{ padding: '6px 8px', color: '#64748b', fontWeight: 'bold' }}>{veiculoLabel}</td>
                                            <td style={{ padding: '6px 8px', fontWeight: 'black', color: '#e11d48', textAlign: 'right', borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>{fmt(v)}</td>
                                        </tr>
                                    );
                                })}
                                {((data.contasPendentes || []) as any[]).filter(t => t.tipo === 'PAGAR').length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                            Nenhuma conta a pagar no período
                                        </td>
                                    </tr>
                                )}
                                {((data.contasPendentes || []) as any[]).filter(t => t.tipo === 'PAGAR').length > 0 && (
                                    <tr style={{ background: '#ffe4e6' }}>
                                        <td colSpan={3} style={{ padding: '8px', textAlign: 'right', fontWeight: 'black', color: '#e11d48', fontSize: '9px', textTransform: 'uppercase', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', border: '1px solid #fecdd3', borderRight: 'none' }}>
                                            Total a Pagar:
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'black', color: '#e11d48', fontSize: '11px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', border: '1px solid #fecdd3', borderLeft: 'none' }}>
                                            {fmt(((data.contasPendentes || []) as any[]).filter(t => t.tipo === 'PAGAR').reduce((acc, c) => acc + ((c.valor_total || 0) + (c.valor_acrescimo || 0) - (c.valor_pago || 0) - (c.valor_desconto || 0)), 0))}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
                            <div style={{ width: '1.5rem', height: '1.5rem', background: '#ecfdf5', borderRadius: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '0.8rem', height: '0.8rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '12px', fontWeight: 'black', textTransform: 'uppercase', color: '#059669', margin: 0 }}>Contas a Receber</h3>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '9px' }}>
                            <thead>
                                <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                                    <th style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: '8px', fontWeight: 'black', width: '15%' }}>Vencimento</th>
                                    <th style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: '8px', fontWeight: 'black', width: '45%' }}>Descrição</th>
                                    <th style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: '8px', fontWeight: 'black', width: '20%' }}>Veículo Relacionado</th>
                                    <th style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: '8px', fontWeight: 'black', width: '20%', textAlign: 'right' }}>Valor em Aberto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {((data.contasPendentes || []) as any[]).filter(t => t.tipo === 'RECEBER').map((c, idx) => {
                                    const v = (c.valor_total || 0) + (c.valor_acrescimo || 0) - (c.valor_pago || 0) - (c.valor_desconto || 0);
                                    const veiculoLabel = c.veiculo ? `${c.veiculo.modelo} (${c.veiculo.placa || ''})` : '—';
                                    return (
                                        <tr key={idx} style={{ background: '#f0fdf4' }}>
                                            <td style={{ padding: '6px 8px', fontWeight: 'black', color: '#0f172a', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }}>{c.data_vencimento ? new Date(c.data_vencimento).toLocaleDateString('pt-BR') : '—'}</td>
                                            <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#334155' }}>{c.descricao || 'Recebimento sem descrição'}</td>
                                            <td style={{ padding: '6px 8px', color: '#64748b', fontWeight: 'bold' }}>{veiculoLabel}</td>
                                            <td style={{ padding: '6px 8px', fontWeight: 'black', color: '#059669', textAlign: 'right', borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>{fmt(v)}</td>
                                        </tr>
                                    );
                                })}
                                {((data.contasPendentes || []) as any[]).filter(t => t.tipo === 'RECEBER').length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                            Nenhuma conta a receber no período
                                        </td>
                                    </tr>
                                )}
                                {((data.contasPendentes || []) as any[]).filter(t => t.tipo === 'RECEBER').length > 0 && (
                                    <tr style={{ background: '#dcfce7' }}>
                                        <td colSpan={3} style={{ padding: '8px', textAlign: 'right', fontWeight: 'black', color: '#059669', fontSize: '9px', textTransform: 'uppercase', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', border: '1px solid #bbf7d0', borderRight: 'none' }}>
                                            Total a Receber:
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'black', color: '#059669', fontSize: '11px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', border: '1px solid #bbf7d0', borderLeft: 'none' }}>
                                            {fmt(((data.contasPendentes || []) as any[]).filter(t => t.tipo === 'RECEBER').reduce((acc, c) => acc + ((c.valor_total || 0) + (c.valor_acrescimo || 0) - (c.valor_pago || 0) - (c.valor_desconto || 0)), 0))}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </BaseReportLayout>

            {vehicleChunks.filter(chunk => chunk.length > 0).map((chunk, chunkIdx) => (
                <BaseReportLayout
                    key={chunkIdx}
                    title="Detalhamento de Veículos"
                    empresa={empresa}
                    watermark={watermark}
                    subtitle={periodo}
                    pageNumber={3 + chunkIdx}
                    totalPages={totalPagesCalculated}
                    isManualPagination={true}
                >
                    <div style={{ padding: '0.5rem 2rem 2rem 2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {chunk.map((row: any, ridx: number) => (
                                <div key={ridx} className="vehicle-row" style={{ display: 'flex', gap: '1rem', padding: '0.5rem', borderRadius: '1rem', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                                    <div className="vehicle-model" style={{ flex: 1, padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            {row.marca_logo && <img src={row.marca_logo} style={{ width: '20px', height: '20px', objectFit: 'contain' }} alt="" />}
                                            <div>
                                                <span style={{ fontSize: '7px', fontWeight: 'black', color: '#6366f1', textTransform: 'uppercase' }}>{row.marca || row.montadora}</span>
                                                <h4 style={{ fontSize: '12px', fontWeight: 'black', color: '#0f172a', margin: 0 }}>{row.modelo}</h4>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '8px', fontWeight: 'black', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{row.ano_fabricacao}/{row.ano_modelo}</span>
                                            {row.motorizacao && <span style={{ fontSize: '8px', fontWeight: 'black', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{row.motorizacao}</span>}
                                            {row.cambio && <span style={{ fontSize: '8px', fontWeight: 'black', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{row.cambio}</span>}
                                            {row.combustivel && <span style={{ fontSize: '8px', fontWeight: 'black', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{row.combustivel}</span>}
                                        </div>
                                    </div>
                                    <div className="vehicle-equity" style={{ width: '150px', padding: '1rem' }}>
                                        <span style={{ fontSize: '7px', fontWeight: 'black', color: '#94a3b8', textTransform: 'uppercase' }}>Equity Custo</span>
                                        <p style={{ fontSize: '13px', fontWeight: 'black', color: '#0f172a', margin: 0 }}>{fmt(row.valor_total_custo)}</p>
                                    </div>
                                    <div className="vehicle-partners" style={{ width: '220px', padding: '0.75rem', gap: '4px' }}>
                                        {row.partners.map((p: any, pidx: number) => (
                                            <div key={pidx} className="partner-row" style={{ padding: '0.25rem 0.5rem', borderRadius: '0.5rem' }}>
                                                <span style={{ fontSize: '9px', fontWeight: 'black' }}>{p.nome}</span>
                                                <span style={{ fontSize: '9px', fontWeight: 'black' }}>{fmt(p.valor)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </BaseReportLayout>
            ))}

            <BaseReportLayout
                title="Visão Consolidada de Equity"
                empresa={empresa}
                watermark={watermark}
                subtitle={periodo}
                pageNumber={3 + vehicleChunks.length}
                totalPages={totalPagesCalculated}
                isManualPagination={true}
            >
                <div style={{ padding: '2rem' }}>
                    <div style={{ padding: '2rem', background: '#0f172a', borderRadius: '1.5rem', color: 'white', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 'black', textTransform: 'uppercase', margin: 0 }}>Visão Consolidada</h4>
                                <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>Capital Alocado por Sócio em Todo Estoque</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Valor Total dos Carros</p>
                                <h4 style={{ fontSize: '18px', fontWeight: 'black', color: '#10b981', margin: 0 }}>{fmt(totalEstoque)}</h4>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                            {partnerTotals.map((pt, i) => {
                                const percentage = totalEstoque > 0 ? ((pt.total / totalEstoque) * 100).toFixed(1) : '0.0';
                                return (
                                    <div key={i} style={{ flex: '1', minWidth: '140px', padding: '1.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '8px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 'black', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px' }}>{pt.nome}</span>
                                            <span style={{ fontSize: '8px', fontWeight: 'black', color: '#cbd5e1', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{percentage}%</span>
                                        </div>
                                        <span style={{ fontSize: '16px', fontWeight: 'black', width: '100%', textAlign: 'center' }}>{fmt(pt.total)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </BaseReportLayout>

            {hasAnotacoes && (
                <BaseReportLayout
                    empresa={empresa}
                    watermark={watermark}
                    title="Anotações do Período"
                    subtitle={periodo}
                    pageNumber={4 + vehicleChunks.length}
                    totalPages={totalPagesCalculated}
                    isManualPagination={true}
                >
                    <div style={{ padding: '2rem' }}>
                        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '4px', height: '24px', background: '#7c3aed', borderRadius: '2px' }} />
                            <div>
                                <h4 style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', color: '#1e293b', margin: 0 }}>Anotações</h4>
                                <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1px', margin: '2px 0 0' }}>Registros informativos — sem movimentação financeira</p>
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                            <thead>
                                <tr style={{ background: '#7c3aed' }}>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '8px', width: '100px' }}>Data</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '8px' }}>Descrição</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '8px', width: '120px' }}>Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {anotacoes.map((a, i) => {
                                    const [y, m, d] = a.data.split('T')[0].split('-');
                                    const dateFormatted = `${d}/${m}/${y}`;
                                    return (
                                        <tr key={a.id} style={{ background: i % 2 === 0 ? '#f8f9ff' : 'white', borderBottom: '1px solid #e8e0ff' }}>
                                            <td style={{ padding: '8px 12px', fontWeight: '700', color: '#7c3aed', fontSize: '9px' }}>{dateFormatted}</td>
                                            <td style={{ padding: '8px 12px', color: '#334155', fontWeight: '500', fontSize: '10px' }}>{a.descricao}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: a.valor !== null ? '#059669' : '#cbd5e1', fontSize: '10px' }}>
                                                {a.valor !== null
                                                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(a.valor)
                                                    : '—'
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {anotacoes.some(a => a.valor !== null) && (
                                <tfoot>
                                    <tr style={{ background: '#ede9fe', borderTop: '2px solid #7c3aed' }}>
                                        <td colSpan={2} style={{ padding: '8px 12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '8px', color: '#7c3aed' }}>Total com Valor</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '900', color: '#059669', fontSize: '11px' }}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                anotacoes.filter(a => a.valor !== null).reduce((acc, a) => acc + (a.valor || 0), 0)
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        <p style={{ fontSize: '8px', color: '#94a3b8', marginTop: '16px', fontStyle: 'italic' }}>* Estes registros são informativos e não representam movimentação financeira real.</p>
                    </div>
                </BaseReportLayout>
            )}
        </div>
    );
};

export default CaixaTemplate;
