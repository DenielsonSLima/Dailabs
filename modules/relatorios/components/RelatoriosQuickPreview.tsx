import React from 'react';
import { createPortal } from 'react-dom';
// toPng was replaced by html2pdf for real PDF generation

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const RelatoriosQuickPreview: React.FC<Props> = ({ isOpen, onClose, title, children }) => {
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Load PDF library dynamically since we can't install packages easily
  React.useEffect(() => {
    if (isOpen && !window.hasOwnProperty('html2pdf')) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    const node = document.getElementById('print-content-wrapper');
    if (!node) return;

    try {
      setIsDownloading(true);

      const opt = {
        margin: 0,
        filename: `${title.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: {
          scale: 3, // Over-sampled for extreme quality
          useCORS: true,
          letterRendering: true,
          logging: false,
          onclone: (clonedDoc: Document) => {
            // REMOVE elementos visuais do preview que não devem sair no PDF
            const elementsToRemove = clonedDoc.querySelectorAll('.no-print, .page-divide, .page-indicator');
            elementsToRemove.forEach(el => (el as HTMLElement).remove());

            // Limpa o wrapper principal
            const wrapper = clonedDoc.getElementById('print-content-wrapper');
            if (wrapper) {
              wrapper.style.boxShadow = 'none';
              wrapper.style.transform = 'none';
              wrapper.style.backgroundImage = 'none';
              wrapper.style.backgroundColor = '#ffffff';
              wrapper.style.margin = '0';
              wrapper.style.padding = '0';
              wrapper.style.width = '210mm';
            }

            // CRÍTICO: Remove TODOS os SVGs problemáticos (Lucide icons do sidebar, etc.)
            // que causam "Expected number" errors no html2canvas SVG path parser.
            // Mantém apenas SVGs simples como a watermark (que usam <image>, não <path>).
            const allSvgs = clonedDoc.querySelectorAll('svg');
            allSvgs.forEach((svg) => {
              const hasPaths = svg.querySelectorAll('path, circle, line, polyline, polygon, rect').length > 0;
              const isWatermark = svg.getAttribute('width')?.includes('mm');
              const isSafe = svg.getAttribute('data-pdf-safe') === 'true';
              
              if (hasPaths && !isWatermark && !isSafe) {
                (svg as unknown as HTMLElement).remove();
              }
            });

            // CRÍTICO: Remove TODAS as regras de quebra de página CSS dos containers.
            // O html2pdf.js já pagina naturalmente pelo h-[297mm] de cada BaseReportLayout.
            // Se deixarmos break-after-page, ele cria uma quebra EXTRA = página em branco.
            const allContainers = clonedDoc.querySelectorAll('.report-container, .break-after-page');
            allContainers.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.pageBreakAfter = 'auto';
              htmlEl.style.breakAfter = 'auto';
              htmlEl.style.pageBreakBefore = 'auto';
              htmlEl.style.breakBefore = 'auto';
              htmlEl.classList.remove('break-after-page');
              // Garante que o container não tenha margens ou bordas extras
              htmlEl.style.margin = '0';
              htmlEl.style.border = 'none';
            });
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all'] }
      };

      // @ts-ignore
      if (window.html2pdf) {
        // @ts-ignore
        await window.html2pdf().from(node).set(opt).save();
      } else {
        throw new Error('Biblioteca PDF ainda não carregada');
      }
    } catch (err) {
      console.error('Erro ao gerar download:', err);
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] bg-slate-950/95 flex flex-col no-print animate-in fade-in duration-300 print:bg-white print:static print:block print:inset-auto print:h-auto"
      style={{ width: '100vw', height: '100dvh', minHeight: '100dvh' }}
    >
      <style>{`
        @media screen {
          .page-indicator {
            position: absolute;
            right: -100px;
            width: 80px;
            font-size: 8px;
            font-weight: 900;
            color: #64748b;
            text-align: left;
            letter-spacing: 0.1em;
            pointer-events: none;
            opacity: 0.6;
          }
          .page-indicator::before {
            content: '';
            position: absolute;
            left: -20px;
            top: 50%;
            width: 15px;
            height: 1px;
            background: #64748b;
          }
          .page-divide {
            height: 20px;
            background-color: #020617; /* Dark gap to match backdrop */
            width: calc(100% + 40px);
            position: absolute;
            left: -20px;
            z-index: 50;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 10px 15px -10px rgba(0,0,0,0.5), inset 0 -10px 15px -10px rgba(0,0,0,0.5);
            pointer-events: none;
          }
          .page-divide::after {
            content: 'QUEBRA DE PÁGINA (A4)';
            font-size: 7px;
            font-weight: 900;
            color: #334155;
            letter-spacing: 0.4em;
            background: #020617;
            padding: 2px 10px;
            border-radius: 99px;
            border: 1px solid rgba(255,255,255,0.1);
          }
        }
        @media print {
          /* Reset total para a página */
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Oculta TUDO exceto o wrapper do conteúdo */
          #root > *:not(.fixed.inset-0.z-\\[10000\\]),
          body > *:not(.fixed.inset-0.z-\\[10000\\]) {
            display: none !important;
          }
          
          /* Força o modal a se comportar como um bloco normal de topo de página */
          .fixed.inset-0.z-\\[10000\\] {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
            background: white !important;
            z-index: 1 !important;
          }

          .print\\:hidden, .no-print, .page-divide { display: none !important; }
          
          #print-content-wrapper {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-width: none !important;
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            transform: none !important;
          }

          #print-content {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>

      {/* Header - Fixed */}
      <div id="modal-header" className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-[100] no-print">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
            </span>
          </div>
          <div>
            <h2 className="text-white font-black text-sm uppercase tracking-widest">{title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Visualização de Pré-Impressão • <span className="text-indigo-400">Use "Salvar como PDF" no próximo passo</span></p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex flex-col items-center justify-center gap-0.5 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${isDownloading ? 'bg-slate-700 text-slate-400 cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95 shadow-indigo-600/20'}`}
          >
            <div className="flex items-center gap-2">
              {isDownloading ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
              <span>{isDownloading ? 'GERANDO PDF...' : 'BAIXAR PDF'}</span>
            </div>
            <span className="text-[8px] opacity-70 font-bold">GERAR DOCUMENTO DIGITAL</span>
          </button>

          <button
            onClick={onClose}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Document Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-12 flex justify-center bg-slate-950/60 print:bg-white print:p-0 print:overflow-visible custom-scrollbar">
        <div
          id="print-content-wrapper"
          className="relative bg-white shadow-[0_0_80px_rgba(0,0,0,0.8)] w-full max-w-[210mm] min-h-[297mm] transform origin-top scale-90 md:scale-100 transition-transform print:shadow-none print:scale-100 print:max-w-none print:w-full print:rounded-none"
        >
          {/* Physical Page Divide Markers (Visible only on screen) */}
          <div data-html2canvas-ignore className="page-divide no-print" style={{ top: '297mm' }} />
          <div data-html2canvas-ignore className="page-divide no-print" style={{ top: '594mm' }} />
          <div data-html2canvas-ignore className="page-divide no-print" style={{ top: '891mm' }} />
          <div data-html2canvas-ignore className="page-divide no-print" style={{ top: '1188mm' }} />

          {/* Page Indicators (In margin) */}
          <div data-html2canvas-ignore className="page-indicator no-print" style={{ top: '297mm' }}>PÁGINA 2</div>
          <div data-html2canvas-ignore className="page-indicator no-print" style={{ top: '594mm' }}>PÁGINA 3</div>
          <div data-html2canvas-ignore className="page-indicator no-print" style={{ top: '891mm' }}>PÁGINA 4</div>
          <div data-html2canvas-ignore className="page-indicator no-print" style={{ top: '1188mm' }}>PÁGINA 5</div>

          <div id="print-content" className="print:w-full print:h-full">
            {children}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="h-8 bg-slate-900 border-t border-white/5 flex items-center justify-center print:hidden">
        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.3em]">HCV Operating System - Report Generator v4.0</p>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default RelatoriosQuickPreview;
