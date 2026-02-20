
import React, { useMemo } from 'react';
import { AnalysisResult, BetStatus } from '../types';

interface AnalysisTableProps {
  results: AnalysisResult[];
  showDate?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onUpdateStatus?: (id: string, status: BetStatus) => void;
  onDelete?: (id: string) => void;
  onRowClick?: (analysis: AnalysisResult) => void;
}

export const AnalysisTable: React.FC<AnalysisTableProps> = ({ 
  results, 
  showDate, 
  selectable, 
  selectedIds, 
  onSelect, 
  onSelectAll,
  onUpdateStatus,
  onDelete,
  onRowClick
}) => {
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const leagueCompare = a.game.league.localeCompare(b.game.league, 'pt-PT');
      if (leagueCompare !== 0) return leagueCompare;
      return a.game.time.localeCompare(b.game.time);
    });
  }, [results]);

  const allSelected = useMemo(() => {
    return selectable && selectedIds && results.length > 0 && selectedIds.size === results.length;
  }, [selectable, selectedIds, results.length]);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/50">
      <table className="min-w-full divide-y divide-zinc-800 text-xs font-sans">
        <thead className="bg-zinc-900/80">
          <tr>
            {selectable && (
              <th className="px-4 py-3 text-left w-10">
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  onChange={() => onSelectAll?.()}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 accent-red-600 cursor-pointer"
                />
              </th>
            )}
            <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-zinc-500">Evento</th>
            <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-zinc-500">Mercado / Odd</th>
            <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-zinc-500">Estado</th>
            <th className="px-4 py-3 text-right font-bold uppercase tracking-wider text-zinc-500">Gestão</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {sortedResults.length === 0 ? (
            <tr>
              <td colSpan={selectable ? 5 : 4} className="px-4 py-10 text-center text-zinc-600 italic">
                Nenhum registo encontrado.
              </td>
            </tr>
          ) : sortedResults.map((res) => {
            const isSelected = selectedIds?.has(res.analysisId);
            return (
              <tr 
                key={res.analysisId} 
                className={`transition-colors cursor-pointer group ${isSelected ? 'bg-red-950/10' : 'hover:bg-zinc-900/40'}`}
                onClick={() => onRowClick?.(res)}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => onSelect?.(res.analysisId)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 accent-red-600 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="font-mono text-zinc-600 mb-0.5 text-[9px] uppercase">
                    {showDate ? `${res.date} | ` : ''}{res.timestamp} | {res.game.league}
                  </div>
                  <div className="font-bold text-zinc-200">{res.game.homeTeam} vs {res.game.awayTeam}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-zinc-300 font-bold mb-0.5">{res.recommendation}</div>
                  <div className="font-mono text-[10px] text-zinc-500">Odd: {res.odds}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border shadow-sm ${
                    res.status === 'green' ? 'bg-green-950/30 text-green-400 border-green-800/50' :
                    res.status === 'red' ? 'bg-red-950/30 text-red-400 border-red-800/50' :
                    res.status === 'void' ? 'bg-zinc-800/30 text-zinc-400 border-zinc-700/50' :
                    'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}>
                    {res.status || 'pendente'}
                  </span>
                  {res.profit !== 0 && res.profit !== undefined && (
                    <div className={`text-[10px] font-mono mt-1 font-bold ${res.profit > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {res.profit > 0 ? '+' : ''}{res.profit.toFixed(2)}u
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onUpdateStatus?.(res.analysisId, 'green')}
                      className="w-7 h-7 rounded-lg bg-green-900/20 hover:bg-green-600 text-green-500 hover:text-white flex items-center justify-center transition-all border border-green-900/50"
                      title="Marcar Green"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button 
                      onClick={() => onUpdateStatus?.(res.analysisId, 'red')}
                      className="w-7 h-7 rounded-lg bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white flex items-center justify-center transition-all border border-red-900/50"
                      title="Marcar Red"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    {onDelete && (
                      <button 
                        onClick={() => onDelete(res.analysisId)}
                        className="w-7 h-7 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 flex items-center justify-center transition-all border border-zinc-700/50"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
