import React from 'react';
import { maskCNPJ } from '../../../utils/formatters';

interface Props {
  empresa: any;
  watermark: any;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isManualPagination?: boolean;
  pageNumber?: number;
  totalPages?: number;
}

const BaseReportLayout: React.FC<Props> = ({
  empresa,
  watermark,
  title,
  subtitle,
  children,
  isManualPagination = false,
  pageNumber,
  totalPages
}) => {
  // Criamos um SVG virtual que tem exatamente o tamanho de uma folha A4 (210x297mm)
  const svgWatermark = `
    <svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
      <g opacity="0.08">
        <image 
          href="${watermark?.logo_url}" 
          x="${105 - ((watermark?.tamanho || 60) * 0.75)}" 
          y="${148.5 - ((watermark?.tamanho || 60) * 0.75)}" 
          width="${(watermark?.tamanho || 60) * 1.5}" 
          height="${(watermark?.tamanho || 60) * 1.5}" 
          preserveAspectRatio="xMidYMid meet" 
        />
      </g>
    </svg>
  `.trim();

  const watermarkDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgWatermark)}`;

  const renderHeader = () => (
    <header className="p-10 flex items-stretch border-b-2 border-slate-900 bg-white">
      <div className="flex-[1.4] flex gap-12 items-center">
        {empresa?.logo_url && (
          <div className="shrink-0 w-32 h-32 flex items-center justify-center bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
            <img src={empresa.logo_url} className="max-h-full max-w-full object-contain" alt="Logo" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
            {empresa?.nome_fantasia || 'NEXUS ERP'}
          </h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2 leading-relaxed">
            {empresa?.logradouro}, {empresa?.numero} - {empresa?.bairro}
            <br />
            {empresa?.cidade} / {empresa?.uf} - {empresa?.cep}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-slate-400 font-bold mt-2">
            <span className="whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded border border-slate-100 italic">CNPJ: {maskCNPJ(empresa?.cnpj, 'N/A')}</span>
          </div>
        </div>
      </div>

      <div className="w-[1.5px] bg-slate-900 mx-6 self-stretch shrink-0 opacity-80" />

      <div className="flex-1 text-right flex flex-col justify-center">
        <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-tight mb-1">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[9px] font-black text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded inline-block mb-1 self-end">
            {subtitle}
          </p>
        )}
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
          Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </header>
  );

  const renderFooter = () => (
    <footer className="px-10 py-6 border-t border-slate-100 flex justify-between items-center bg-white relative z-20">
      <div className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.3em]">
        Nexus Operating Core • Protocolo Digital Auditável
      </div>
      <div className="text-right flex flex-col items-end gap-1">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">SISTEMA DE GESTÃO INTEGRADA</p>
        {pageNumber && totalPages && (
          <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
            PÁGINA {pageNumber} DE {totalPages}
          </span>
        )}
      </div>
    </footer>
  );

  return (
    <div className={`report-container html2pdf__page-break relative bg-white text-slate-900 flex flex-col font-sans print:p-0 print:border-0 ${isManualPagination ? 'w-[210mm] min-h-[297mm] h-[297mm]' : 'min-h-[297mm]'}`}>

      {/* Cabeçalho de Estilo - Capturado pelo PDF */}
      <style>{`
        @media print, all {
          .report-container {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .report-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          thead { display: table-header-group !important; }
          tfoot { display: table-footer-group !important; }
          
          .print-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          table {
            page-break-inside: auto;
          }

          .break-after-page {
            break-after: page;
            page-break-after: always;
          }

          /* MARCA D'ÁGUA: Única e Sincronizada */
          .watermark-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 0;
            pointer-events: none;
            background-image: url("${watermarkDataUrl}");
            background-size: 100% 297mm;
            background-repeat: repeat-y;
            background-position: top center;
          }
        }
      `}</style>

      {/* Marca d'água Injetada (Sem duplicação no container) */}
      {watermark?.logo_url && (
        <div className="watermark-overlay absolute inset-0 pointer-events-none" />
      )}

      {isManualPagination ? (
        <>
          {renderHeader()}
          <div style={{ height: '15px' }} className="bg-white w-full" />
          <main className="relative z-10 w-full flex-1 px-10 pt-0 pb-4 overflow-hidden">
            {children}
          </main>
          <div style={{ height: '10px' }} className="bg-white w-full" />
          {renderFooter()}
        </>
      ) : (
        <table className="report-table relative z-10 w-full">
          <thead>
            <tr>
              <td className="p-0 border-0">
                {renderHeader()}
                {/* Espaçador ampliado para evitar sobreposição no topo da página 2+ */}
                <div style={{ height: '60px' }} className="bg-white w-full" />
              </td>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="p-10 pt-0 border-0">
                <main className="relative z-10 w-full min-h-[100px]">
                  {children}
                </main>
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr>
              <td className="p-0 border-0">
                {/* Espaçador de segurança para o rodapé não encostar no conteúdo */}
                <div style={{ height: '60px' }} className="bg-white w-full" />
                {renderFooter()}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
};

export default BaseReportLayout;