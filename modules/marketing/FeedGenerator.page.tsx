import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EstoqueService } from '../estoque/estoque.service';
import { EmpresaService } from '../ajustes/empresa/empresa.service';
import { StorageService } from '../../lib/storage.service';
import { supabase } from '../../lib/supabase';
import MarketingVehicleSelection from './components/MarketingVehicleSelection';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Carrega uma URL (ou data-URL) e retorna uma HTMLImageElement pronta para uso no canvas */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
            // Fallback: tenta sem crossOrigin
            const img2 = new Image();
            img2.onload = () => resolve(img2);
            img2.onerror = reject;
            img2.src = src;
        };
        img.src = src;
    });
}

/** Converte uma URL em base64 via fetch (garante CORS bypass no preview e export) */
async function urlToBase64(url: string): Promise<string> {
    if (!url) return '';
    if (url.startsWith('data:')) return url;

    // Se a URL for externa (não for do Supabase Storage local), usamos o proxy para evitar CORS no canvas
    const isExternal = !url.includes('supabase.co/storage/v1/object/public');
    const finalUrl = isExternal 
        ? `https://hlmhlltmgwxlibklyrzc.supabase.co/functions/v1/proxy-image?url=${encodeURIComponent(url)}`
        : url;

    try {
        const response = await fetch(finalUrl, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Falha ao converter URL para base64:', e);
        // Retorna string vazia para links externos que falharam, evitando "tainted canvas"
        return isExternal ? '' : url;
    }
}

/** Desenha uma imagem cobrindo o slot com object-fit: cover e ajuste de posição Y (%) */
function drawCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number, dy: number, dw: number, dh: number,
    offsetYPercent: number = 0
) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const slotRatio = dw / dh;

    let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;

    if (imgRatio > slotRatio) {
        // imagem mais larga: ajusta largura
        srcW = img.naturalHeight * slotRatio;
        srcX = (img.naturalWidth - srcW) / 2;
    } else {
        // imagem mais alta: ajusta altura
        srcH = img.naturalWidth / slotRatio;
        // aplica offset Y
        const maxOffset = img.naturalHeight - srcH;
        const offset = maxOffset * (0.5 + offsetYPercent / 100);
        srcY = Math.max(0, Math.min(maxOffset, offset));
    }

    ctx.drawImage(img, srcX, srcY, srcW, srcH, dx, dy, dw, dh);
}

// ─── Componente Principal ───────────────────────────────────────────────────────

const FeedGeneratorPage: React.FC = () => {
    const navigate = useNavigate();
    // Seleção
    const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>('');
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
    const [imageOffsets, setImageOffsets] = useState<number[]>([0, 0]);
    const [showPrice, setShowPrice] = useState(true);
    // Removido imageScales e editMode conforme solicitado

    // Versões base64 das fotos (para preview e export)
    const [base64Photos, setBase64Photos] = useState<(string | null)[]>([null, null]);
    const [base64Frame, setBase64Frame] = useState<string | null>(null);
    const [base64Logo, setBase64Logo] = useState<string | null>(null);

    // Exportação
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('');

    // Upload de moldura
    const [isUploadingFrame, setIsUploadingFrame] = useState(false);
    const frameInputRef = useRef<HTMLInputElement>(null);

    // Drag nas fotos
    const [isDragging, setIsDragging] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [startY, setStartY] = useState(0);
    const [startOffset, setStartOffset] = useState(0);

    const feedRef = useRef<HTMLDivElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    // Cache de imagens carregadas (evita recarregar a cada frame de drag)
    const cachedPhotosRef = useRef<(HTMLImageElement | null)[]>([null]);
    const cachedFrameRef = useRef<HTMLImageElement | null>(null);
    const cachedLogoRef = useRef<HTMLImageElement | null>(null);
    const rafRef = useRef<number | null>(null);

    // ─── Queries ────────────────────────────────────────────────────────────────

    const { data: estoque } = useQuery({
        queryKey: ['estoque_simples'],
        queryFn: () => EstoqueService.getAll({ limit: 100, page: 1, statusTab: 'TODOS' })
    });

    const { data: veiculo } = useQuery({
        queryKey: ['veiculo_story', selectedVeiculoId],
        queryFn: () => selectedVeiculoId ? EstoqueService.getById(selectedVeiculoId) : Promise.resolve(null),
        enabled: !!selectedVeiculoId
    });

    const { data: configEmpresa, refetch: refetchConfig } = useQuery({
        queryKey: ['config_empresa_story'],
        queryFn: () => EmpresaService.getDadosEmpresa()
    });

    // ─── URL ativa da moldura ────────────────────────────────────────────────────

    const activeFrameUrl = configEmpresa?.feed_frame_url ?? null;

    // ─── Efeitos de sincronização ────────────────────────────────────────────────

    // Sincronizar fotos base64 ao trocar veículo/seleção
    useEffect(() => {
        if (veiculo?.fotos && selectedPhotos.length === 0) {
            const urls = veiculo.fotos.slice(0, 1).map(f => f.url);
            setSelectedPhotos(urls);
        }
    }, [veiculo]);

    // Sincronizar fotos selecionadas → base64
    useEffect(() => {
        let cancelled = false;
        const processPhotos = async () => {
            const newB64 = await Promise.all(
                selectedPhotos.map(async (url) => {
                    if (!url) return null;
                    if (url.startsWith('data:')) return url;
                    return await urlToBase64(url);
                })
            );
            if (!cancelled) {
                // Garante até 2 slots
                const result: (string | null)[] = [null, null];
                newB64.forEach((v, i) => { if (i < 2) result[i] = v; });
                setBase64Photos(result);
            }
        };
        if (selectedPhotos.length > 0) {
            processPhotos();
        } else {
            setBase64Photos([null, null]);
        }
        return () => { cancelled = true; };
    }, [selectedPhotos]);

    // Sincronizar moldura → base64
    useEffect(() => {
        let cancelled = false;
        const loadFrame = async () => {
            if (!activeFrameUrl) {
                if (!cancelled) setBase64Frame(null);
                return;
            }
            if (activeFrameUrl.startsWith('data:')) {
                if (!cancelled) setBase64Frame(activeFrameUrl);
                return;
            }
            const b64 = await urlToBase64(activeFrameUrl);
            if (!cancelled) setBase64Frame(b64);
        };
        loadFrame();
        return () => { cancelled = true; };
    }, [activeFrameUrl]);

    // Sincronizar logo da montadora → base64
    useEffect(() => {
        let cancelled = false;
        const loadLogo = async () => {
            if (!veiculo?.montadora?.logo_url) {
                if (!cancelled) setBase64Logo(null);
                return;
            }
            const b64 = await urlToBase64(veiculo.montadora.logo_url);
            if (!cancelled) setBase64Logo(b64);
        };
        loadLogo();
        return () => { cancelled = true; };
    }, [veiculo?.montadora?.logo_url]);

    // ─── Pré-carregamento das imagens no cache ───────────────────────────────────

    // Pré-carrega fotos base64 → cache
    useEffect(() => {
        let cancelled = false;
        const loadAll = async () => {
            const results: (HTMLImageElement | null)[] = [null, null];
            for (let i = 0; i < selectedPhotos.length; i++) {
                const src = base64Photos[i];
                if (src) {
                    try { results[i] = await loadImage(src); } catch { results[i] = null; }
                }
            }
            if (!cancelled) {
                cachedPhotosRef.current = results;
                scheduleDraw();
            }
        };
        loadAll();
        return () => { cancelled = true; };
    }, [base64Photos]);

    // Pré-carrega moldura → cache
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!base64Frame) { cachedFrameRef.current = null; scheduleDraw(); return; }
            try { const img = await loadImage(base64Frame); if (!cancelled) { cachedFrameRef.current = img; scheduleDraw(); } }
            catch { if (!cancelled) { cachedFrameRef.current = null; scheduleDraw(); } }
        };
        load();
        return () => { cancelled = true; };
    }, [base64Frame]);

    // Pré-carrega logo → cache
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!base64Logo) { cachedLogoRef.current = null; scheduleDraw(); return; }
            try { const img = await loadImage(base64Logo); if (!cancelled) { cachedLogoRef.current = img; scheduleDraw(); } }
            catch { if (!cancelled) { cachedLogoRef.current = null; scheduleDraw(); } }
        };
        load();
        return () => { cancelled = true; };
    }, [base64Logo]);

    // ─── Redraw do preview canvas ────────────────────────────────────────────────

    /** Agenda um redraw via RAF para evitar múltiplos redraws no mesmo frame */
    const scheduleDrawRef = useRef<() => void>(() => { });
    const drawPreview = useCallback(() => {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;   // 720 (renderizado em 360 via CSS — 2x DPI)
        const H = canvas.height;  // 900
        const DPI = 2; // fator de escala para manter coordenadas no espaço lógico 360x640
        const slotH = H / (selectedPhotos.length || 1);

        // Usa canvas offscreen para evitar flash (double-buffer)
        const offscreen = document.createElement('canvas');
        offscreen.width = W;
        offscreen.height = H;
        const octx = offscreen.getContext('2d')!;

        octx.fillStyle = '#0f172a';
        octx.fillRect(0, 0, W, H);

        // Desenha as fotos do cache (síncrono — sem await)
        for (let i = 0; i < selectedPhotos.length; i++) {
            const img = cachedPhotosRef.current[i];
            if (img) {
                drawCover(octx, img, 0, i * slotH, W, slotH, imageOffsets[i]);
            } else {
                octx.fillStyle = '#1e293b';
                octx.fillRect(0, i * slotH, W, slotH);
                // Placeholder
                octx.strokeStyle = 'rgba(255,255,255,0.15)';
                octx.lineWidth = 1.5 * DPI;
                const cx = W / 2;
                const cy = i * slotH + slotH / 2;
                const s = 28 * DPI;
                octx.beginPath();
                octx.roundRect(cx - s, cy - s, s * 2, s * 2, 6 * DPI);
                octx.stroke();
                octx.fillStyle = 'rgba(255,255,255,0.12)';
                octx.font = `bold ${11 * DPI}px system-ui`;
                octx.textAlign = 'center';
                octx.fillText(`FOTO ${i + 1}`, cx, cy + 4 * DPI);
            }
        }

        // Moldura por cima
        const frameImg = cachedFrameRef.current;
        if (frameImg) {
            octx.drawImage(frameImg, 0, 0, W, H);
        }

        // ─── Texto das informações do veículo ─────────────────────────────────

        if (veiculo) {
            const infoY = H - 110 * DPI;
            const px = 22 * DPI;
            let currentY = infoY;

            // Logo + Modelo + Versão (mesma linha) — usa cache síncrono
            const logoImg = cachedLogoRef.current;
            if (logoImg) {
                const boxSize = 32 * DPI;
                const boxX = px;
                const boxY = currentY - boxSize / 2;
                octx.fillStyle = 'rgba(255,255,255,0.95)';
                octx.beginPath();
                octx.roundRect(boxX, boxY, boxSize, boxSize, 8 * DPI);
                octx.fill();
                const pad = 4 * DPI;
                const drawArea = boxSize - pad * 2;
                const iw = logoImg.naturalWidth;
                const ih = logoImg.naturalHeight;
                const ratio = Math.min(drawArea / iw, drawArea / ih);
                const lw = iw * ratio;
                const lh = ih * ratio;
                const lx = boxX + pad + (drawArea - lw) / 2;
                const ly = boxY + pad + (drawArea - lh) / 2;
                octx.drawImage(logoImg, lx, ly, lw, lh);
                const textX = px + boxSize + 10 * DPI;
                octx.fillStyle = '#ffffff';
                octx.font = `bold ${20 * DPI}px "Inter", system-ui`;
                octx.textAlign = 'left';
                const modeloText = (veiculo.modelo?.nome || '').toUpperCase();
                octx.fillText(modeloText, textX, currentY + 8 * DPI);
                if (veiculo.versao?.nome) {
                    const modeloWidth = octx.measureText(modeloText).width;
                    octx.fillStyle = 'rgba(255,255,255,0.65)';
                    octx.font = `600 ${11 * DPI}px "Inter", system-ui`;
                    octx.fillText(veiculo.versao.nome.toUpperCase(), textX + modeloWidth + 8 * DPI, currentY + 8 * DPI);
                }
            } else {
                const textX = px;
                octx.fillStyle = '#ffffff';
                octx.font = `bold ${20 * DPI}px "Inter", system-ui`;
                octx.textAlign = 'left';
                const modeloText = (veiculo.modelo?.nome || '').toUpperCase();
                octx.fillText(modeloText, textX, currentY + 8 * DPI);
                if (veiculo.versao?.nome) {
                    const modeloWidth = octx.measureText(modeloText).width;
                    octx.fillStyle = 'rgba(255,255,255,0.65)';
                    octx.font = `600 ${11 * DPI}px "Inter", system-ui`;
                    octx.fillText(veiculo.versao.nome.toUpperCase(), textX + modeloWidth + 8 * DPI, currentY + 8 * DPI);
                }
            }

            currentY += 26 * DPI;

            // Detalhes técnicos
            const tecnico = [veiculo.motorizacao, veiculo.transmissao, veiculo.combustivel]
                .filter(Boolean).join(' • ');
            if (tecnico) {
                octx.fillStyle = 'rgba(255,255,255,0.70)';
                octx.font = `600 ${10 * DPI}px "Inter", system-ui`;
                octx.fillText(tecnico.toUpperCase(), px, currentY + 14 * DPI);
                currentY += 20 * DPI;
            }

            // Badges: Ano e KM
            const badges = [
                `${veiculo.ano_fabricacao || ''}/${veiculo.ano_modelo || ''}`,
                `${(veiculo.km || 0).toLocaleString('pt-BR')} KM`
            ];
            currentY += 6 * DPI;
            let bx = px;
            for (const badge of badges) {
                octx.font = `bold ${9 * DPI}px "Inter", system-ui`;
                const badgeW = octx.measureText(badge).width + 16 * DPI;
                const badgeH = 20 * DPI;
                octx.strokeStyle = 'rgba(255,255,255,0.30)';
                octx.lineWidth = 1 * DPI;
                octx.fillStyle = 'rgba(255,255,255,0.06)';
                octx.beginPath();
                octx.roundRect(bx, currentY, badgeW, badgeH, 5 * DPI);
                octx.fill();
                octx.stroke();
                octx.fillStyle = '#ffffff';
                octx.fillText(badge.toUpperCase(), bx + 8 * DPI, currentY + 13 * DPI);
                bx += badgeW + 8 * DPI;
            }
        }

        // ─── Preço de Venda ───────────────────────────────────────────────────
        if (showPrice && veiculo?.valor_venda) {
            const px = 22 * DPI;
            const priceY = H - 110 * DPI;
            const priceText = new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL',
                maximumFractionDigits: 0 
            }).format(veiculo.valor_venda);

            octx.textAlign = 'right';
            octx.fillStyle = '#ffffff';
            octx.font = `900 ${28 * DPI}px "Inter", system-ui`;
            octx.fillText(priceText, W - px, priceY + 8 * DPI);
        }

        // Copia offscreen para o canvas visível (atomic — sem flash)
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(offscreen, 0, 0);
    }, [veiculo, imageOffsets, selectedPhotos, showPrice]);

    // Mantém a ref do scheduleDraw sempre atualizada com o drawPreview mais recente
    useEffect(() => {
        scheduleDrawRef.current = () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                drawPreview();
            });
        };
    });

    const scheduleDraw = useCallback(() => scheduleDrawRef.current(), []);

    // Re-desenha o preview sempre que mudar
    useEffect(() => {
        drawPreview();
    }, [drawPreview]);

    // ─── Export via Canvas ───────────────────────────────────────────────────────

    const handleExport = async () => {
        if (selectedPhotos.length < 1 || isExporting) return;

        setIsExporting(true);
        setExportProgress('Preparando imagens...');

        try {
            const EXPORT_W = 1080;
            const EXPORT_H = 1350;

            const canvas = document.createElement('canvas');
            canvas.width = EXPORT_W;
            canvas.height = EXPORT_H;
            const ctx = canvas.getContext('2d')!;

            // Fundo
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

            // Calcula altura por slot dinamicamente
            const NUM_PHOTOS = selectedPhotos.length || 1;
            const SLOT_H = EXPORT_H / NUM_PHOTOS;

            setExportProgress('Desenhando fotos...');

            // Desenha as fotos selecionadas
            for (let i = 0; i < NUM_PHOTOS; i++) {
                const src = base64Photos[i];
                if (src) {
                    try {
                        const img = await loadImage(src);
                        drawCover(ctx, img, 0, i * SLOT_H, EXPORT_W, SLOT_H, imageOffsets[i]);
                    } catch (e) {
                        console.warn(`Erro na foto ${i + 1}:`, e);
                        ctx.fillStyle = '#1e293b';
                        ctx.fillRect(0, i * SLOT_H, EXPORT_W, SLOT_H);
                    }
                } else {
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(0, i * SLOT_H, EXPORT_W, SLOT_H);
                }

                // Linha separadora sutil se houver 2 fotos
                if (NUM_PHOTOS > 1 && i === 0) {
                    ctx.fillStyle = 'rgba(0,0,0,0.25)';
                    ctx.fillRect(0, SLOT_H - 1, EXPORT_W, 2);
                }
            }

            // Desenha a moldura PNG por cima
            if (base64Frame) {
                setExportProgress('Aplicando moldura...');
                try {
                    const frameImg = await loadImage(base64Frame);
                    ctx.drawImage(frameImg, 0, 0, EXPORT_W, EXPORT_H);
                } catch (e) {
                    console.warn('Erro ao carregar moldura para export:', e);
                }
            }

            // ─── Textos de informação do veículo ──────────────────────────────

            if (veiculo) {
                setExportProgress('Adicionando informações...');

                const scale = EXPORT_W / 360; // escala proporcional
                const px = 22 * scale;
                const infoY = EXPORT_H - 110 * scale;



                let currentY = infoY;

                // Logo + Modelo + Versão (mesma linha)
                if (base64Logo) {
                    try {
                        const logoImg = await loadImage(base64Logo);
                        const boxSize = 32 * scale;
                        const boxX = px;
                        const boxY = currentY - boxSize / 2;
                        ctx.fillStyle = 'rgba(255,255,255,0.95)';
                        ctx.beginPath();
                        ctx.roundRect(boxX, boxY, boxSize, boxSize, 8 * scale);
                        ctx.fill();
                        const pad = 4 * scale;
                        const drawArea = boxSize - pad * 2;
                        const iw = logoImg.naturalWidth;
                        const ih = logoImg.naturalHeight;
                        const ratio = Math.min(drawArea / iw, drawArea / ih);
                        const lw = iw * ratio;
                        const lh = ih * ratio;
                        const lx = boxX + pad + (drawArea - lw) / 2;
                        const ly = boxY + pad + (drawArea - lh) / 2;
                        ctx.drawImage(logoImg, lx, ly, lw, lh);
                        // Modelo + Versão lado a lado
                        const textX = px + boxSize + 10 * scale;
                        ctx.fillStyle = '#ffffff';
                        ctx.font = `bold ${20 * scale}px "Inter", system-ui`;
                        ctx.textAlign = 'left';
                        const modeloText = (veiculo.modelo?.nome || '').toUpperCase();
                        ctx.fillText(modeloText, textX, currentY + 8 * scale);
                        if (veiculo.versao?.nome) {
                            const modeloWidth = ctx.measureText(modeloText).width;
                            ctx.fillStyle = 'rgba(255,255,255,0.65)';
                            ctx.font = `600 ${11 * scale}px "Inter", system-ui`;
                            ctx.fillText(veiculo.versao.nome.toUpperCase(), textX + modeloWidth + 8 * scale, currentY + 8 * scale);
                        }
                    } catch {
                        ctx.fillStyle = '#ffffff';
                        ctx.font = `bold ${20 * scale}px "Inter", system-ui`;
                        ctx.textAlign = 'left';
                        ctx.fillText((veiculo.modelo?.nome || '').toUpperCase(), px, currentY + 8 * scale);
                    }
                } else {
                    const textX = px;
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${20 * scale}px "Inter", system-ui`;
                    ctx.textAlign = 'left';
                    const modeloText = (veiculo.modelo?.nome || '').toUpperCase();
                    ctx.fillText(modeloText, textX, currentY + 8 * scale);
                    if (veiculo.versao?.nome) {
                        const modeloWidth = ctx.measureText(modeloText).width;
                        ctx.fillStyle = 'rgba(255,255,255,0.65)';
                        ctx.font = `600 ${11 * scale}px "Inter", system-ui`;
                        ctx.fillText(veiculo.versao.nome.toUpperCase(), textX + modeloWidth + 8 * scale, currentY + 8 * scale);
                    }
                }

                currentY += 26 * scale;

                // Detalhes técnicos
                const tecnico = [veiculo.motorizacao, veiculo.transmissao, veiculo.combustivel]
                    .filter(Boolean).join(' • ');
                if (tecnico) {
                    ctx.fillStyle = 'rgba(255,255,255,0.70)';
                    ctx.font = `600 ${10 * scale}px "Inter", system-ui`;
                    ctx.fillText(tecnico.toUpperCase(), px, currentY + 14 * scale);
                    currentY += 20 * scale;
                }

                // Badges
                const badges = [
                    `${veiculo.ano_fabricacao || ''}/${veiculo.ano_modelo || ''}`,
                    `${(veiculo.km || 0).toLocaleString('pt-BR')} KM`
                ];
                currentY += 6 * scale;
                let bx = px;
                for (const badge of badges) {
                    ctx.font = `bold ${9 * scale}px "Inter", system-ui`;
                    const badgeW = ctx.measureText(badge).width + 16 * scale;
                    const badgeH = 20 * scale;
                    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
                    ctx.lineWidth = 1 * scale;
                    ctx.fillStyle = 'rgba(255,255,255,0.06)';
                    ctx.beginPath();
                    ctx.roundRect(bx, currentY, badgeW, badgeH, 5 * scale);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(badge.toUpperCase(), bx + 8 * scale, currentY + 13 * scale);
                    bx += badgeW + 8 * scale;
                }

                // ─── Preço de Venda (Export) ──────────────────────────────────
                if (showPrice && veiculo.valor_venda) {
                    const priceText = new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL',
                        maximumFractionDigits: 0 
                    }).format(veiculo.valor_venda);

                    ctx.textAlign = 'right';
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `900 ${28 * scale}px "Inter", system-ui`;
                    ctx.fillText(priceText, EXPORT_W - px, infoY + 8 * scale);
                }
            }

            setExportProgress('Gerando arquivo...');

            // Download
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert('Erro ao gerar imagem.');
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `feed-${veiculo?.modelo?.nome || 'veiculo'}-${Date.now()}.png`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 3000);

                // Upload background
                try {
                    const fileObj = new File([blob], `feed-${veiculo?.id}-${Date.now()}.png`, { type: 'image/png' });
                    const publicUrl = await StorageService.uploadImage(fileObj, 'veiculos', 'marketing-creatives');
                    
                    const { data: userData } = await supabase.auth.getUser();
                    const orgId = userData.user?.app_metadata?.organization_id;
                    if (orgId && veiculo?.id) {
                        await supabase.from('mkt_creatives').insert({
                            organization_id: orgId,
                            veiculo_id: veiculo.id,
                            url: publicUrl,
                            tipo: 'FEED',
                            created_by: userData.user?.id
                        });
                        console.log('Feed creative saved:', publicUrl);
                    }
                } catch (uploadErr) {
                    console.error('Erro ao salvar imagem do feed no storage/banco:', uploadErr);
                }
            }, 'image/png', 1.0);

        } catch (err) {
            console.error('Erro ao gerar story:', err);
            alert('Erro ao gerar o story. Tente novamente.');
        } finally {
            setIsExporting(false);
            setExportProgress('');
        }
    };

    // ─── Upload de Moldura → Supabase Storage ────────────────────────────────────

    const handleFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingFrame(true);
        try {
            // Faz upload para o bucket company-assets
            const publicUrl = await StorageService.uploadImage(file, 'company-assets', 'stories-frames');

            // Salva a URL pública (não base64) no banco de dados
            await EmpresaService.saveDadosEmpresa({ feed_frame_url: publicUrl });
            await refetchConfig();
        } catch (err) {
            console.error('Erro ao fazer upload da moldura:', err);
            alert('Erro ao salvar moldura. Verifique o arquivo e tente novamente.');
        } finally {
            setIsUploadingFrame(false);
            // Reset input
            if (frameInputRef.current) frameInputRef.current.value = '';
        }
    };

    // ─── Drag nos slots de foto ──────────────────────────────────────────────────

    const handleMouseDown = (index: number, e: React.MouseEvent) => {
        setIsDragging(true);
        setDragIndex(index);
        setStartY(e.clientY);
        setStartOffset(imageOffsets[index]);
        e.preventDefault();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || dragIndex === null) return;

        const deltaY = e.clientY - startY;

        // Vertical: Ajusta Posição (Offset)
        const newOffsets = [...imageOffsets];
        newOffsets[dragIndex] = Math.max(-50, Math.min(50, startOffset + deltaY * 0.2));
        setImageOffsets(newOffsets);

        scheduleDraw();
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragIndex(null);
    };

    const togglePhoto = (url: string) => {
        if (selectedPhotos.includes(url)) {
            setSelectedPhotos(prev => prev.filter(p => p !== url));
        } else {
            if (selectedPhotos.length < 2) {
                setSelectedPhotos(prev => [...prev, url]);
            }
        }
    };

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-[1400px] mx-auto p-6 md:p-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start gap-10">

                {/* ── Lado Esquerdo: Controles ── */}
                <div className="w-full md:w-1/2 space-y-8">
                    <div className="flex flex-col gap-6">
                        <button 
                            onClick={() => navigate(-1)}
                            className="w-fit flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Painel Início</span>
                        </button>

                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Gerador de Feed para Instagram</h1>
                                <p className="text-slate-500 mt-2 uppercase text-xs font-bold tracking-widest">Marketing e Social Media Automático</p>
                            </div>
                            <input
                                type="file"
                                ref={frameInputRef}
                                onChange={handleFrameUpload}
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                            />
                            <button
                                onClick={() => frameInputRef.current?.click()}
                                disabled={isUploadingFrame}
                                className="p-4 bg-indigo-600 border border-indigo-500 rounded-2xl text-white hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-lg flex items-center gap-2 group"
                                title="Trocar Moldura PNG"
                            >
                                {isUploadingFrame ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {isUploadingFrame ? 'Salvando...' : 'Trocar Moldura'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Indicador de moldura salva */}
                    {activeFrameUrl && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold -mt-4">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                            Moldura salva e ativa
                        </div>
                    )}

                    {/* Seleção de Veículo */}
                    <div className="animate-in slide-in-from-bottom-3 duration-500 delay-100">
                        <MarketingVehicleSelection
                            veiculos={estoque?.data || []}
                            selectedId={selectedVeiculoId}
                            onSelect={setSelectedVeiculoId}
                        />
                    </div>

                    {/* Opções de Exibição */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Exibir Preço de Venda</p>
                                <p className="text-xs font-bold text-slate-600">Mostrar valor no post</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowPrice(!showPrice)}
                            className={`w-14 h-8 rounded-full transition-all relative ${showPrice ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${showPrice ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Seleção de Fotos */}
                    {veiculo && (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Escolha até 2 fotos ({selectedPhotos.length}/2)</label>
                                <div className="flex gap-1">
                                    {[...Array(2)].map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full ${selectedPhotos.length > i ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {veiculo.fotos.map((foto, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => togglePhoto(foto.url)}
                                        className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-4 transition-all ${selectedPhotos.includes(foto.url) ? 'border-indigo-600 scale-95' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <img src={foto.url} className="w-full h-full object-cover" alt="Veiculo" />
                                        {selectedPhotos.includes(foto.url) && (
                                            <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1 shadow-lg">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        )}
                                        <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-black text-white/70">
                                            {selectedPhotos.includes(foto.url) ? `#${selectedPhotos.indexOf(foto.url) + 1}` : ''}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Lado Direito: Preview ── */}
                <div className="w-full md:w-[450px] flex-shrink-0 relative flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                            Live Preview
                        </div>

                        <button
                            disabled={selectedPhotos.length < 1 || isExporting}
                            onClick={handleExport}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isExporting ? (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            )}
                            {isExporting ? 'Processando...' : 'Salvar Imagem'}
                        </button>
                    </div>

                    <div className="text-center mb-4 hidden">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                        Live Preview (Feed 4:5)
                    </div>

                    {/* Canvas de Preview */}
                    <div className="relative">
                        <div
                            className={`relative w-[360px] h-[450px] rounded-[1.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.3)] border-4 border-indigo-400/50 ${isDragging ? 'cursor-grabbing' : 'cursor-move'}`}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <canvas
                                ref={previewCanvasRef}
                                width={720}
                                height={900}
                                className="w-full h-full block"
                                style={{ imageRendering: 'auto' }}
                            />

                            {/* Slots invisíveis para capturar drag em cada área */}
                            {selectedPhotos.map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute left-0 w-full"
                                    style={{
                                        top: `${(i * 100) / (selectedPhotos.length || 1)}%`,
                                        height: `${100 / (selectedPhotos.length || 1)}%`
                                    }}
                                    onMouseDown={(e) => handleMouseDown(i, e)}
                                />
                            ))}

                            {/* Mock do telefone */}
                            <div className="absolute top-0 left-0 right-0 h-10 px-6 flex items-center justify-between text-white/50 text-[10px] font-black z-20 pointer-events-none">
                                <span>9:41</span>
                                <div className="flex gap-1.5 items-center">
                                    <div className="w-4 h-2.5 rounded-sm border border-white/20" />
                                    <div className="w-3 h-3 rounded-full border border-white/20" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dica */}
                    <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100 max-w-[360px]">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div className="text-xs text-amber-800 font-medium leading-relaxed space-y-1">
                                <p><strong>Dica:</strong> Se selecionar <strong>duas fotos</strong>, o layout se divide automaticamente.</p>
                                <p>Arraste cada foto para ajustar o enquadramento.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FeedGeneratorPage;
