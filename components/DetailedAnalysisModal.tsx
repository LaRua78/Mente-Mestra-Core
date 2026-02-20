
import React, { useState } from 'react';
import { AnalysisResult } from '../types';

interface DetailedAnalysisModalProps {
  analysis: AnalysisResult | null;
  onClose: () => void;
}

export const DetailedAnalysisModal: React.FC<DetailedAnalysisModalProps> = ({ analysis, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!analysis) return null;

  const copyToClipboard = () => {
    const text = `🧠 MENTE MESTRA - ANÁLISE CORE\n\n⚽️ Jogo: ${analysis.game.homeTeam} vs ${analysis.game.awayTeam}\n🏆 Liga: ${analysis.game.league}\n🎯 Mercado: ${analysis.recommendation}\n📈 Odd: ${analysis.odds}\n⚠️ Risco: ${analysis.risk}\n\n📝 Análise:\n${analysis.fullText || 'N/A'}\n\n#Betting #EVPlus #FootballAnalysis`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/50">
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Relatório Final | {analysis.date} {analysis.timestamp}
            </div>
            <h2 className="text-xl font-black text-white tracking-tighter">
              {analysis.game.homeTeam} vs {analysis.game.awayTeam}
            </h2>
            <div className="text-xs text-red-600 font-bold uppercase mt-1">{analysis.game.league}</div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-950/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Conclusão', val: analysis.conclusion },
              { label: 'Odds', val: analysis.odds },
              { label: 'Valor EV+', val: analysis.value },
              { label: 'Risco', val: analysis.risk },
            ].map((item, idx) => (
              <div key={idx} className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <div className="text-[9px] uppercase font-bold text-zinc-600 mb-1">{item.label}</div>
                <div className="text-sm font-bold text-zinc-200 truncate">{item.val}</div>
              </div>
            ))}
          </div>

          <section>
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              Parecer Técnico
            </h3>
            <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/50 shadow-inner">
              {analysis.fullText || "Conteúdo não disponível."}
            </div>
          </section>

          <section className="bg-red-950/10 border border-red-900/30 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
            <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 relative z-10">Call de Mercado</h3>
            <div className="text-lg font-black text-zinc-100 relative z-10">{analysis.recommendation}</div>
          </section>

          {analysis.sources && analysis.sources.length > 0 && (
            <section>
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Fontes Verificadas</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.sources.map((src, i) => (
                  <a 
                    key={i} 
                    href={src.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg border border-zinc-700 transition-all flex items-center gap-2 max-w-xs truncate"
                  >
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    <span className="truncate">{src.title}</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="p-6 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center">
          <button 
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
              copied ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {copied ? (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> COPIADO</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2h2a2 2 0 002-2" /></svg> COPIAR ANÁLISE</>
            )}
          </button>
          <button 
            onClick={onClose}
            className="bg-zinc-100 text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
};
