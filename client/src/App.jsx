import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, RefreshCw, DollarSign, Zap, History, ArrowRightLeft, 
  Banknote, BrainCircuit, X, Play, Trash2, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import io from 'socket.io-client';

// Configuração Socket.io
const socket = io();

// --- CONFIGURAÇÃO INICIAL E UTILITÁRIOS ---
const PASS_GO_AMOUNT = 200;
const INITIAL_MONEY = 1500;
const GLOBAL_EVENT_TRIGGER = 10;

const formatMoney = (value) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// --- COMPONENTE PRINCIPAL ---
export default function MonopolyBankApp() {
  const [gameState, setGameState] = useState('setup'); // setup, playing
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [history, setHistory] = useState([]);
  const [globalEvent, setGlobalEvent] = useState(null);
  const [opportunity, setOpportunity] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);

  // Controle de Modais
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [amountInput, setAmountInput] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, history

  // --- SOCKET.IO EFFECTS ---
  useEffect(() => {
    socket.on('update_players', (serverPlayers) => {
      // Converte objeto players do server para array
      const playersArray = Object.values(serverPlayers);
      setPlayers(playersArray);
      
      // Se eu sou um jogador, atualiza meu estado local se precisar
      if (myPlayerId) {
        // Lógica de atualização local se necessário
      }
    });

    socket.on('new_log', (log) => {
      addToHistory(log.type, log.text);
    });

    socket.on('global_event', (evt) => {
      setGlobalEvent(evt);
    });

    socket.on('opportunity_result', (opp) => {
      setOpportunity(opp);
    });

    return () => {
      socket.off('update_players');
      socket.off('new_log');
      socket.off('global_event');
      socket.off('opportunity_result');
    };
  }, [myPlayerId]);

  // --- LÓGICA DO JOGO ---
  const joinGame = () => {
    if (newPlayerName.trim() === '') return;
    
    // Entrar na sala via Socket
    socket.emit('join_game', newPlayerName);
    
    // Guardar ID localmente (o servidor vai mandar update_players)
    setMyPlayerId(socket.id); 
    setGameState('playing');
  };

  const handleTransaction = (type) => {
    if (!amountInput && type !== 'pass_go') return;
    
    const amount = type === 'pass_go' ? PASS_GO_AMOUNT : parseInt(amountInput);
    if (isNaN(amount) && type !== 'pass_go') return;

    const payload = {
      type,
      amount,
      targetId: transferTarget
    };

    socket.emit('transaction', payload);
    
    // Limpar estado local
    setAmountInput('');
    setTransferTarget(null);
    setSelectedPlayer(null);
  };

  const handleOpportunity = () => {
    socket.emit('request_opportunity');
    setSelectedPlayer(null); // Fecha modal se estiver aberto
  };

  const addToHistory = (category, desc) => {
    setHistory(prev => [{ time: new Date().toLocaleTimeString(), category, desc }, ...prev]);
  };

  // Encontra meu jogador na lista atualizada pelo servidor
  const me = players.find(p => p.id === socket.id);

  // --- RENDERIZADORES ---

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 animate-pulse"></div>
          
          <div className="flex justify-center mb-6 text-emerald-400">
            <Banknote size={64} className="animate-bounce" />
          </div>
          
          <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Monopoly AI Bank
          </h1>
          <p className="text-slate-400 text-center mb-8 font-light">Gerencie sua fortuna com IA</p>
          
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                value={newPlayerName} 
                onChange={(e) => setNewPlayerName(e.target.value)} 
                placeholder="Seu Nome / Peão" 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 focus:outline-none focus:border-emerald-500 transition-colors text-lg text-center font-bold text-white placeholder-slate-600"
                onKeyDown={(e) => e.key === 'Enter' && joinGame()}
              />
            </div>
            
            <button 
              onClick={joinGame}
              disabled={!newPlayerName.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2"
            >
              ENTRAR NA PARTIDA <Play size={20} fill="currentColor" />
            </button>
          </div>
          
          <div className="mt-8 text-center text-xs text-slate-600 flex items-center justify-center gap-1">
            <BrainCircuit size={14} /> Powered by Google Gemini
          </div>
        </div>
      </div>
    );
  }

  // JOGO (PLAYING)
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans pb-24 overflow-x-hidden">
      
      {/* Header / Saldo */}
      <div className="p-6 bg-slate-800 rounded-b-3xl shadow-2xl relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${socket.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-slate-400 font-bold text-sm tracking-wider uppercase">{me?.name || 'Carregando...'}</span>
          </div>
          <button onClick={() => setActiveTab(activeTab === 'dashboard' ? 'history' : 'dashboard')} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition">
            {activeTab === 'dashboard' ? <History size={20} className="text-slate-300" /> : <X size={20} className="text-slate-300" />}
          </button>
        </div>

        <div className="text-center py-4">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1 font-bold">Saldo Atual</p>
          <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
            {me ? formatMoney(me.balance) : '---'}
          </h2>
        </div>
        
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <button 
            onClick={() => handleTransaction('pass_go')}
            className="bg-slate-700 hover:bg-slate-600 text-emerald-400 p-4 rounded-full shadow-xl border-4 border-slate-900 transition active:scale-90 group"
            title="Passar no Início (+R$ 200)"
          >
            <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-6 mt-8 space-y-4 max-w-lg mx-auto">
        
        {activeTab === 'dashboard' ? (
          <>
            {/* Lista de Jogadores (apenas visualização rápida) */}
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <div className="w-1 h-1 bg-slate-500 rounded-full"></div> Jogadores Online ({players.length})
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {players.map(p => (
                  <div key={p.id} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border ${p.id === socket.id ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-700/50 border-slate-600 text-slate-300'}`}>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setSelectedPlayer({ action: 'pay' })}
                className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-red-500/50 hover:bg-slate-700/50 transition active:scale-95 flex flex-col items-center justify-center gap-3 group"
              >
                <div className="p-3 bg-red-500/10 rounded-full group-hover:bg-red-500/20 transition">
                  <ArrowUpRight className="text-red-500" size={28} />
                </div>
                <span className="font-bold text-red-400">Pagar</span>
              </button>

              <button 
                onClick={() => setSelectedPlayer({ action: 'receive' })}
                className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-700/50 transition active:scale-95 flex flex-col items-center justify-center gap-3 group"
              >
                <div className="p-3 bg-emerald-500/10 rounded-full group-hover:bg-emerald-500/20 transition">
                  <ArrowDownRight className="text-emerald-500" size={28} />
                </div>
                <span className="font-bold text-emerald-400">Receber</span>
              </button>
              
              <button 
                onClick={() => setSelectedPlayer({ action: 'transfer' })}
                className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-700/50 transition active:scale-95 flex flex-col items-center justify-center gap-3 group"
              >
                <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition">
                  <ArrowRightLeft className="text-blue-500" size={28} />
                </div>
                <span className="font-bold text-blue-400">Transferir</span>
              </button>

              <button 
                onClick={handleOpportunity}
                className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl border border-indigo-500 hover:from-indigo-500 hover:to-purple-600 transition active:scale-95 flex flex-col items-center justify-center gap-3 shadow-lg shadow-indigo-900/50 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition"></div>
                <BrainCircuit className="text-white animate-pulse" size={32} />
                <span className="font-bold text-white">IA Oportunidade</span>
              </button>
            </div>
          </>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-4 min-h-[50vh]">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-300">
              <History size={20} /> Histórico
            </h3>
            <div className="space-y-3">
              {history.map((item, idx) => (
                <div key={idx} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-sm">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span className="font-bold uppercase tracking-wider">{item.category}</span>
                    <span>{item.time}</span>
                  </div>
                  <p className="text-slate-300">{item.desc}</p>
                </div>
              ))}
              {history.length === 0 && <p className="text-slate-500 text-center py-8">Nenhuma atividade ainda.</p>}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Ação (Pagar/Receber/Transferir) */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-800 w-full max-w-sm rounded-3xl p-6 border border-slate-700 shadow-2xl transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {selectedPlayer.action === 'pay' && 'Pagar ao Banco'}
                {selectedPlayer.action === 'receive' && 'Receber do Banco'}
                {selectedPlayer.action === 'transfer' && 'Transferir'}
              </h3>
              <button onClick={() => setSelectedPlayer(null)} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {selectedPlayer.action === 'transfer' && (
                <div>
                  <label className="block text-xs uppercase text-slate-400 font-bold mb-2">Para quem?</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none"
                    onChange={(e) => setTransferTarget(e.target.value)}
                  >
                    <option value="">Selecione um jogador...</option>
                    {players.filter(p => p.id !== socket.id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase text-slate-400 font-bold mb-2">Valor (R$)</label>
                <input 
                  type="number" 
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-3xl font-bold text-white focus:border-emerald-500 outline-none placeholder-slate-700"
                  placeholder="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              </div>

              <button 
                onClick={() => handleTransaction(
                  selectedPlayer.action === 'pay' ? 'pay_bank' : 
                  selectedPlayer.action === 'receive' ? 'receive_bank' : 'pay_player'
                )}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition transform active:scale-95 ${
                  selectedPlayer.action === 'pay' ? 'bg-red-500 hover:bg-red-600 text-white' :
                  selectedPlayer.action === 'receive' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' :
                  'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Evento Global */}
      {globalEvent && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-slate-800 border-2 border-yellow-500/50 w-full max-w-sm rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(234,179,8,0.3)] transform transition-all scale-100">
            <div className="mb-6 animate-bounce text-6xl">🌍</div>
            <h2 className="text-2xl font-black text-yellow-400 mb-2 uppercase tracking-wide">{globalEvent.title}</h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">{globalEvent.description}</p>
            <button 
              onClick={() => setGlobalEvent(null)}
              className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition shadow-lg shadow-yellow-500/20"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* Modal de Oportunidade IA */}
      {opportunity && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-6 animate-fadeIn">
          <div className={`bg-slate-800 border-2 w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl transform transition-all scale-100 ${opportunity.type === 'gain' ? 'border-emerald-500/50 shadow-emerald-500/20' : 'border-red-500/50 shadow-red-500/20'}`}>
            <div className="mb-6 animate-pulse text-6xl">
              {opportunity.type === 'gain' ? '🍀' : '⚠️'}
            </div>
            <h2 className={`text-2xl font-black mb-2 uppercase tracking-wide ${opportunity.type === 'gain' ? 'text-emerald-400' : 'text-red-400'}`}>
              {opportunity.title}
            </h2>
            <p className="text-lg text-slate-300 mb-6 leading-relaxed">{opportunity.description}</p>
            
            <div className={`text-4xl font-black mb-8 ${opportunity.type === 'gain' ? 'text-emerald-400' : 'text-red-400'}`}>
              {opportunity.type === 'gain' ? '+' : '-'}{opportunity.displayValue}
            </div>

            <button 
              onClick={() => setOpportunity(null)}
              className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
