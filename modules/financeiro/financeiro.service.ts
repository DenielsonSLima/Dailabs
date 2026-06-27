import { supabase } from '../../lib/supabase';
import { ITitulo, IExtratoFiltros, IExtratoResponse, IExtratoTotals, IHistoricoFiltros, IHistoricoResponse, IHistoricoTotals, ILancarDespesaPayload } from './financeiro.types';
import { TitulosService } from './services/titulos.service';
import { ExtratoService } from './services/extrato.service';
import { TransferenciasService } from './services/transferencias.service';
import { DashboardService } from './services/dashboard.service';
import { CategoriasService } from './services/categorias.service';
import { HistoricoService } from './services/historico.service';

/**
 * SERVIÇO FACHADA (Facade)
 * Redireciona chamadas para os micro-serviços da pasta `services`
 * Mantém total compatibilidade com os importadores atuais.
 */
export const FinanceiroService = {
  // ── TITULOS & DESPESAS ──
  getTitulos: TitulosService.getTitulos,
  baixarTitulo: TitulosService.baixarTitulo,
  recalcularTitulo: TitulosService.recalcularTitulo,
  lancarDespesa: TitulosService.lancarDespesa,
  previewCronograma: TitulosService.previewCronograma,
  getTitulosByPedidoId: TitulosService.getTitulosByPedidoId,

  // ── EXTRATOS BANCARIOS ──
  getExtrato: ExtratoService.getExtrato,
  getExtratoTotals: ExtratoService.getExtratoTotals,
  getExtratoPorConta: ExtratoService.getExtratoPorConta,
  getContasBancarias: ExtratoService.getContasBancarias,

  // ── TRANSFERENCIAS ──
  realizarTransferencia: TransferenciasService.realizarTransferencia,

  // ── DASHBOARDS & KPIS ──
  getKpis: DashboardService.getKpis,
  getPendencias: DashboardService.getPendencias,

  // ── CATEGORIAS ──
  getCategorias: CategoriasService.getCategorias,
  saveCategoria: CategoriasService.saveCategoria,

  // ── HISTORICO UNIFICADO ──
  getHistoricoGeral: HistoricoService.getHistoricoGeral,
  getHistoricoTotals: HistoricoService.getHistoricoTotals,

  // ── REALTIME (MANTIDO CENTRAL) ──
  subscribeToTable(table: 'fin_titulos' | 'fin_transacoes' | 'fin_transferencias' | 'fin_retiradas', onUpdate: () => void) {
    return supabase
      .channel(`financeiro_${table}_sync`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table
      }, () => {
        console.log(`[Realtime] Update detected on ${table}`);
        onUpdate();
      })
      .subscribe();
  }
};
