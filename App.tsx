
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, Game, AnalysisResult, ChatMessage, BetStatus } from './types';
import { GeminiService } from './services/gemini';
import { EspnService, SUPPORTED_LEAGUES } from './services/espn';
import { AnalysisTable } from './components/AnalysisTable';
import { DetailedAnalysisModal } from './components/DetailedAnalysisModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const gemini = new GeminiService();
const espn = new EspnService();

const HISTORY_KEY = 'mente_mestra_history';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [view, setView] = useState<'current' | 'history'>('current');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingGames, setPendingGames] = useState<Game[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<AnalysisResult[]>([]);
  
  const [selectedAnalysisForModal, setSelectedAnalysisForModal] = useState<AnalysisResult | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<BetStatus | 'all'>('all');
  const [historyLeagueFilter, setHistoryLeagueFilter] = useState('all');

  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  
  const [history, setHistory] = useState<AnalysisResult[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [manualText, setManualText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLeague, setSelectedLeague] = useState(SUPPORTED_LEAGUES[0].slug);
  const [playingAudio, setPlayingAudio] = useState<boolean>(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const stats = useMemo(() => {
    const processed = history.filter(h => h.status && h.status !== 'pending');
    const greens = processed.filter(h => h.status === 'green');
    const reds = processed.filter(h => h.status === 'red');
    const totalUnits = processed.filter(h => h.status !== 'void').length;
    
    const profit = history.reduce((acc, curr) => acc + (curr.profit || 0), 0);
    const winRate = totalUnits > 0 ? (greens.length / totalUnits) * 100 : 0;
    
    return {
      total: history.length,
      processed: processed.length,
      profit,
      winRate,
      roi: totalUnits > 0 ? (profit / totalUnits) * 100 : 0
    };
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      const matchesSearch = h.game.homeTeam.toLowerCase().includes(historySearch.toLowerCase()) || 
                            h.game.awayTeam.toLowerCase().includes(historySearch.toLowerCase());
      const matchesStatus = historyStatusFilter === 'all' || h.status === historyStatusFilter;
      const matchesLeague = historyLeagueFilter === 'all' || h.game.league === historyLeagueFilter;
      return matchesSearch && matchesStatus && matchesLeague;
    });
  }, [history, historySearch, historyStatusFilter, historyLeagueFilter]);

  const historyLeagues = useMemo(() => {
    const leagues = new Set(history.map(h => h.game.league));
    return Array.from(leagues).sort();
  }, [history]);

  const addMessage = (role: 'user' | 'assistant', content: string, sources?: { title: string; uri: string }[]) => {
    setMessages(prev => [...prev, { role, content, timestamp: Date.now(), sources }]);
  };

  const toggleGameSelection = (id: string) => {
    setSelectedGameIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateBetStatus = (analysisId: string, status: BetStatus) => {
    const updater = (item: AnalysisResult) => {
      if (item.analysisId === analysisId) {
        let profit = 0;
        if (status === 'green') {
          const oddValue = parseFloat(item.odds.replace(',', '.')) || 2.0;
          profit = oddValue - 1;
        } else if (status === 'red') {
          profit = -1;
        }
        return { ...item, status, profit };
      }
      return item;
    };
    setHistory(prev => prev.map(updater));
    setResults(prev => prev.map(updater));
  };

  const deleteAnalysis = (id: string) => {
    if (confirm("Tens a certeza que desejas eliminar este registo?")) {
      setHistory(prev => prev.filter(h => h.analysisId !== id));
      setResults(prev => prev.filter(h => h.analysisId !== id));
    }
  };

  const clearHistory = () => {
    if (confirm("ATENÇÃO: Desejas apagar TODO o histórico e estatísticas? Esta ação é irreversível.")) {
      setHistory([]);
      localStorage.removeItem(HISTORY_KEY);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      // Usar Landscape para acomodar a coluna de análise
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(22);
      doc.setTextColor(185, 28, 28);
      doc.text("MENTE MESTRA CORE", pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("RELATÓRIO TÉCNICO E ANALÍTICO DE INTELIGÊNCIA DE APOSTAS", pageWidth / 2, 28, { align: 'center' });
      
      doc.setDrawColor(200);
      doc.line(14, 35, pageWidth - 14, 35);
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Performance: ${stats.profit.toFixed(2)}u (Profit) | WinRate: ${stats.winRate.toFixed(1)}% | ROI: ${stats.roi.toFixed(1)}%`, 14, 45);
      
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Extraído em: ${new Date().toLocaleString('pt-PT')} | Total de Eventos: ${filteredHistory.length}`, 14, 52);

      const tableData = filteredHistory.map(h => [
        `${h.date}\n${h.timestamp}`,
        `${h.game.homeTeam} vs ${h.game.awayTeam}\n[${h.game.league}]`,
        h.recommendation,
        h.odds,
        h.fullText || 'Sem análise detalhada disponível.',
        h.status?.toUpperCase() || 'PENDENTE',
        `${h.profit?.toFixed(2) || '0.00'}u`
      ]);

      autoTable(doc, {
        startY: 60,
        head: [['Data', 'Evento / Liga', 'Prognóstico', 'Odd', 'Análise Detalhada', 'Estado', 'Profit']],
        body: tableData,
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 35 },
          3: { cellWidth: 15 },
          4: { cellWidth: 100 }, // Espaço generoso para o texto da análise
          5: { cellWidth: 25 },
          6: { cellWidth: 20, fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      });

      doc.save(`Mente_Mestra_MasterReport_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setExporting(false);
    }
  };

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioCtxRef.current;
  };

  const stopSpeech = () => {
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch (e) { }
      activeSourceRef.current = null;
    }
    setPlayingAudio(false);
  };

  const playSpeech = async (text: string) => {
    if (playingAudio) { stopSpeech(); return; }
    setPlayingAudio(true);
    try {
      const base64Audio = await gemini.generateSpeech(text);
      if (base64Audio) {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const bytes = GeminiService.decodeBase64(base64Audio);
        const buffer = await GeminiService.decodeAudioData(bytes, ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        activeSourceRef.current = source;
        source.onended = () => { if (activeSourceRef.current === source) setPlayingAudio(false); };
        source.start();
      } else { setPlayingAudio(false); }
    } catch (error) { setPlayingAudio(false); }
  };

  const importFromEspn = async () => {
    setLoading(true);
    const leagueName = SUPPORTED_LEAGUES.find(l => l.slug === selectedLeague)?.name || 'Desconhecida';
    addMessage('user', `Importar jogos para: ${selectedDate} (${leagueName})`);
    try {
      const games = await espn.fetchGames(selectedDate, selectedLeague);
      if (games.length === 0) {
        addMessage('assistant', "Não encontrei jogos para esta seleção na ESPN.");
      } else {
        setPendingGames(games);
        setSelectedGameIds(new Set(games.map(g => g.id)));
        setState(AppState.CONFIRM_GAMES);
        addMessage('assistant', `Encontrei ${games.length} jogos. Confirma os eventos.`);
      }
    } catch (error) { handleError(error); } finally { setLoading(false); }
  };

  const processText = async () => {
    if (!manualText.trim()) return;
    setLoading(true);
    setState(AppState.PARSING_GAMES);
    addMessage('user', manualText);
    try {
      const rawGames = await gemini.parseManualGames(manualText);
      if (rawGames.length === 0) {
        addMessage('assistant', "Não detetei jogos no texto.");
        setState(AppState.IDLE);
      } else {
        const games: Game[] = rawGames.map((g, i) => ({
          id: `manual-${Date.now()}-${i}`,
          homeTeam: g.homeTeam, awayTeam: g.awayTeam, time: g.time, league: g.league
        }));
        setPendingGames(games);
        setSelectedGameIds(new Set(games.map(g => g.id)));
        setState(AppState.CONFIRM_GAMES);
        addMessage('assistant', `Extraídos ${games.length} jogos manualmente.`);
      }
    } catch (error) { handleError(error); } finally { setLoading(false); }
  };

  const startAnalysis = () => {
    const gamesToAnalyze = pendingGames.filter(g => selectedGameIds.has(g.id));
    if (gamesToAnalyze.length === 0) return;
    setState(AppState.ANALYZING);
    processNextGame(gamesToAnalyze, 0);
  };

  const processNextGame = async (queue: Game[], index: number) => {
    if (index >= queue.length) {
      setState(AppState.FINISHED);
      addMessage('assistant', "Análise concluída. Resultados disponíveis no quadro.");
      return;
    }
    const game = queue[index];
    setLoading(true);
    addMessage('assistant', `Analisando: ${game.homeTeam} vs ${game.awayTeam}...`);
    const prompt = `Analisa rigorosamente: ${game.homeTeam} vs ${game.awayTeam} (${game.time}). Liga: ${game.league}. Odds e valor EV+ (PT-PT).`;
    try {
      const { text, sources } = await gemini.generateAnalysis(prompt);
      addMessage('assistant', text, sources);
      const jsonStr = await gemini.generateJson(`Extrai JSON: {"conclusion": "...", "recommendation": "...", "odds": "...", "value": "...", "risk": "..."}. Texto: ${text}`);
      let parsed = { conclusion: 'N/A', recommendation: 'N/A', odds: 'N/A', value: 'N/A', risk: 'N/A' };
      try { parsed = JSON.parse(jsonStr.trim()); } catch(e) {}
      const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newResult: AnalysisResult = { 
        analysisId, game, ...parsed, 
        status: 'pending', profit: 0,
        fullText: text, sources,
        timestamp: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString('pt-PT')
      };
      setResults(prev => [newResult, ...prev]);
      setHistory(prev => [newResult, ...prev]);
      setLoading(false);
      setTimeout(() => processNextGame(queue, index + 1), 1000);
    } catch (err) { handleError(err); }
  };

  const handleError = (error: any) => {
    addMessage('assistant', `Erro: ${error.message || "Erro desconhecido."}`);
    setLoading(false);
  };

  const reset = () => {
    setState(AppState.IDLE); setView('current');
    setResults([]); setPendingGames([]);
    setSelectedGameIds(new Set()); setManualText('');
    setMessages([]); stopSpeech();
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto border-x border-zinc-800 bg-zinc-950 font-sans selection:bg-red-900/40">
      <header className="p-4 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-xl flex justify-between items-center sticky top-0 z-20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-black text-white italic shadow-lg shadow-red-900/20">M</div>
          <h1 className="text-lg font-black tracking-tighter text-white uppercase">
            MENTE MESTRA <span className="text-red-600">CORE</span>
          </h1>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setView(view === 'current' ? 'history' : 'current')}
            className={`text-[10px] uppercase font-black tracking-widest transition-all ${view === 'history' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
          >
            {view === 'history' ? '← Voltar' : 'Histórico'}
          </button>
          <button onClick={reset} className="text-[10px] text-zinc-500 uppercase font-black tracking-widest hover:text-white transition-colors">
            Reset
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth custom-scrollbar">
        {view === 'history' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center gap-4 overflow-x-auto pb-2">
              <div className="flex gap-2 min-w-max">
                {[
                  { label: 'Lucro', val: `${stats.profit.toFixed(2)}u`, color: stats.profit >= 0 ? 'text-green-400' : 'text-red-400' },
                  { label: 'WinRate', val: `${stats.winRate.toFixed(1)}%`, color: 'text-zinc-100' },
                  { label: 'ROI', val: `${stats.roi.toFixed(1)}%`, color: 'text-zinc-100' },
                  { label: 'Total', val: stats.total, color: 'text-zinc-500' }
                ].map((s, i) => (
                  <div key={i} className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl min-w-[100px]">
                    <div className="text-[9px] uppercase font-black text-zinc-600 mb-1">{s.label}</div>
                    <div className={`text-base font-black font-mono ${s.color}`}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={exportToPDF}
                  disabled={exporting || history.length === 0}
                  className="bg-zinc-100 hover:bg-white text-black p-3 rounded-2xl transition-all disabled:opacity-30"
                  title="Exportar PDF Detalhado (Landscape)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
                <button 
                  onClick={clearHistory}
                  disabled={history.length === 0}
                  className="bg-red-600/10 border border-red-600/30 hover:bg-red-600 text-red-600 hover:text-white p-3 rounded-2xl transition-all disabled:opacity-30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-3">
              <input 
                type="text" placeholder="Equipa..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs outline-none focus:border-red-600/50 transition-all"
              />
              <select 
                value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs outline-none"
              >
                <option value="all">Todos os Estados</option>
                <option value="pending">Pendentes</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
              </select>
              <select 
                value={historyLeagueFilter} onChange={(e) => setHistoryLeagueFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs outline-none"
              >
                <option value="all">Todas as Ligas</option>
                {historyLeagues.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <AnalysisTable 
              results={filteredHistory} showDate selectable
              selectedIds={selectedHistoryIds}
              onSelect={(id) => {
                const newIds = new Set(selectedHistoryIds);
                newIds.has(id) ? newIds.delete(id) : newIds.add(id);
                setSelectedHistoryIds(newIds);
              }}
              onSelectAll={() => setSelectedHistoryIds(selectedHistoryIds.size === filteredHistory.length ? new Set() : new Set(filteredHistory.map(h => h.analysisId)))}
              onUpdateStatus={updateBetStatus}
              onDelete={deleteAnalysis}
              onRowClick={(analysis) => setSelectedAnalysisForModal(analysis)}
            />
          </div>
        ) : (
          <>
            {state === AppState.IDLE && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 shadow-2xl">
                  <div className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4">Sourcing Profissional</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-black mb-1.5 block px-1">Data</label>
                      <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-sm focus:border-red-600 outline-none transition-all shadow-inner" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-black mb-1.5 block px-1">Competição</label>
                      <select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-sm focus:border-red-600 outline-none appearance-none transition-all shadow-inner">
                        {SUPPORTED_LEAGUES.map(l => <option key={l.id} value={l.slug}>{l.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={importFromEspn} disabled={loading} className="w-full bg-zinc-100 text-black font-black py-4 rounded-2xl hover:bg-white disabled:opacity-20 transition-all uppercase text-xs tracking-widest shadow-lg active:scale-95">
                    {loading ? 'A contactar ESPN...' : 'Importar Jogos'}
                  </button>
                </div>
                
                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 shadow-2xl">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Input Livre (IA)</div>
                  <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Ex: Sporting vs Braga 20:30..." className="w-full h-28 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-red-600 outline-none resize-none transition-all shadow-inner" />
                  <button onClick={processText} disabled={!manualText.trim() || loading} className="w-full mt-4 bg-zinc-800 text-zinc-200 font-bold py-4 rounded-2xl hover:bg-zinc-700 disabled:opacity-20 transition-all uppercase text-[10px] tracking-widest active:scale-95">
                    Processar Texto
                  </button>
                </div>
              </div>
            )}

            {state === AppState.CONFIRM_GAMES && (
              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Confirmar Seleção</h3>
                  <button onClick={() => setSelectedGameIds(selectedGameIds.size === pendingGames.length ? new Set() : new Set(pendingGames.map(g => g.id)))} className="text-[10px] text-red-500 font-black uppercase">Alternar Tudo</button>
                </div>
                <div className="space-y-2 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {pendingGames.map(g => (
                    <div key={g.id} onClick={() => toggleGameSelection(g.id)} className={`flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${selectedGameIds.has(g.id) ? 'bg-red-600/10 border-red-600/50 shadow-[0_0_15px_rgba(220,38,38,0.1)]' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                      <span className="text-sm font-bold text-zinc-100">{g.homeTeam} vs {g.awayTeam}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{g.time}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setState(AppState.IDLE)} className="flex-1 bg-zinc-800 text-zinc-400 font-bold py-4 rounded-2xl uppercase text-[10px]">Cancelar</button>
                  <button onClick={startAnalysis} className="flex-[2] bg-red-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] shadow-lg shadow-red-900/20 active:scale-95 transition-all">Analisar {selectedGameIds.size} Jogos</button>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[90%] rounded-2xl p-5 text-sm relative group shadow-xl ${msg.role === 'user' ? 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50' : 'bg-zinc-900 border border-zinc-800 text-zinc-100'}`}>
                  {msg.role === 'assistant' && (
                    <button onClick={() => playSpeech(msg.content)} className={`absolute -right-3 -top-3 p-2.5 rounded-full shadow-2xl transition-all ${playingAudio ? 'bg-green-600 scale-110' : 'bg-red-600 opacity-0 group-hover:opacity-100 hover:scale-110'}`}>
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    </button>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  {msg.sources && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap gap-2">
                      {msg.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="text-[9px] bg-zinc-950 text-zinc-500 px-2 py-1 rounded border border-zinc-800 hover:text-red-500 transition-colors uppercase font-bold">{s.title}</a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && <div className="text-[9px] font-black text-red-600 uppercase tracking-widest animate-pulse flex items-center gap-2 px-2"><span className="w-2 h-2 bg-red-600 rounded-full"></span> IA a processar evidências...</div>}
            
            {results.length > 0 && (
              <div className="animate-in fade-in duration-700">
                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3 px-1">Resultados da Sessão</div>
                <AnalysisTable 
                  results={results} 
                  onRowClick={(analysis) => setSelectedAnalysisForModal(analysis)}
                  onUpdateStatus={updateBetStatus}
                  onDelete={deleteAnalysis}
                />
              </div>
            )}
          </>
        )}
        <div ref={chatEndRef} className="h-10" />
      </div>

      <footer className="bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 p-4 grid grid-cols-3 gap-4 text-[9px] font-black uppercase text-zinc-500 text-center tracking-widest">
        <div className="flex flex-col"><span className="text-zinc-700">HISTÓRICO</span>{history.length}</div>
        <div className="border-x border-zinc-800 flex flex-col"><span className="text-zinc-700">RENDIMENTO</span>{stats.roi.toFixed(1)}%</div>
        <div className="flex flex-col"><span className="text-zinc-700">STATUS</span>SYNC</div>
      </footer>

      <DetailedAnalysisModal 
        analysis={selectedAnalysisForModal} 
        onClose={() => setSelectedAnalysisForModal(null)} 
      />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
};

export default App;
