import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, RefreshCw, DollarSign, Zap, History, ArrowRightLeft, 
  Banknote, BrainCircuit, X, Play, Trash2, ArrowUpRight, ArrowDownRight, Menu 
} from 'lucide-react';
import io from 'socket.io-client';

// Configuração Socket.io
const socket = io();

// --- CONFIGURAÇÃO INICIAL E UTILITÁRIOS ---
const PASS_GO_AMOUNT = 200;
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
  const [globalCount, setGlobalCount] = useState(0);

  // Controle de Modais
  const [selectedAction, setSelectedAction] = useState(null); // pay, receive, transfer
  const [transferTarget, setTransferTarget] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, history

  // --- SOCKET.IO EFFECTS ---
  useEffect(() => {
    // Tenta recuperar sessão anterior
    const storedName = localStorage.getItem('monopoly_username');
    if (storedName && gameState === 'setup') {
        // Opcional: Auto-join
    }

    socket.on('update_players', (serverPlayers) => {
      // O servidor manda um objeto {socketId: player}, convertemos para array
      const playersArray = Object.values(serverPlayers);
      setPlayers(playersArray);
    });

    socket.on('new_log', (log) => {
      addToHistory(log.type, log.text);
      // Se for evento global, atualiza contador (aproximado)
      if (log.type === 'transaction' || log.type === 'global') {
          setGlobalCount(prev => (prev + 1) % GLOBAL_EVENT_TRIGGER);
      }
    });

    socket.on('global_event', (evt) => {
      setGlobalEvent(evt);
    });

    socket.on('opportunity_result', (opp) => {
      setOpportunity(opp);
    });

    socket.on('game_log', (logs) => {
        // Carrega histórico inicial
        const formattedLogs = logs.map(l => ({
            time: new Date().toLocaleTimeString(),
            category: l.type.toUpperCase(),
            desc: l.text
        }));
        setHistory(formattedLogs.reverse());
    });

    return () => {
      socket.off('update_players');
      socket.off('new_log');
      socket.off('global_event');
      socket.off('opportunity_result');
      socket.off('game_log');
    };
  }, []);

  // --- LÓGICA DO JOGO ---
  const joinGame = () => {
    if (newPlayerName.trim() === '') return;
    
    socket.emit('join_game', newPlayerName);
    setMyPlayerId(socket.id); 
    setGameState('playing');
    localStorage.setItem('monopoly_username', newPlayerName);
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
    setTransferTarget('');
    setSelectedAction(null);
  };

  const handleOpportunity = () => {
    socket.emit('request_opportunity');
  };

  const addToHistory = (category, desc) => {
    setHistory(prev => [{ time: new Date().toLocaleTimeString(), category: category.toUpperCase(), desc }, ...prev]);
  };

  // Encontra meu jogador na lista atualizada pelo servidor
  const me = players.find(p => p.id === socket.id);

  // --- RENDERIZADORES ---

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 relative overflow-hidden">
            {/* Efeito de fundo */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 animate-pulse"></div>

            <div className="flex justify-center mb-6 text-emerald-400">
                <Banknote size={64} className="animate-bounce" />
            </div>

            <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Monopoly Bank
            </h1>
            <p className="text-slate-400 text-center mb-8 text-sm">Gerenciador Financeiro & IA</p>

            <div className="space-y-4">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newPlayerName} 
                        onChange={(e) => setNewPlayerName(e.target.value)} 
                        placeholder="Nome do Jogador" 
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-white"
                        onKeyDown={(e) => e.key === 'Enter' && joinGame()} 
                    />
                    <button 
                        onClick={joinGame} 
                        disabled={!newPlayerName.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-3 rounded-lg transition-colors" 
                    >
                        <PlusCircle />
                    </button>
                </div>
                
                {/* Lista de Jogadores Online (Preview) */}
                <div className="max-h-40 overflow-y-auto space-y-2 my-4 pr-1 scrollbar-hide">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Jogadores na Sala:</p>
                    {players.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-700/30 p-2 rounded border border-slate-600/50 text-sm">
                            <span className="font-semibold text-slate-300">{p.name}</span>
                            <span className="text-emerald-400/80 text-xs">Online</span>
                        </div>
                    ))}
                    {players.length === 0 && <p className="text-center text-slate-600 text-xs italic">Ninguém online ainda.</p>}
                </div>
            </div>
            
            <div className="mt-6 text-center text-xs text-slate-600 flex items-center justify-center gap-1">
                <BrainCircuit size={14} /> Powered by Google Gemini
            </div>
        </div>
      </div>
    );
  }

  // JOGO (PLAYING)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 overflow-x-hidden">
      
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${socket.connected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className="font-bold text-lg tracking-wider text-slate-200">MONOPOLY</span>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                    <RefreshCw size={12} className={globalCount >= 8 ? "animate-spin text-yellow-400" : "text-slate-400"} />
                    <span className={globalCount >= 8 ? "text-yellow-400 font-bold" : "text-slate-400"}>
                        Evento: {GLOBAL_EVENT_TRIGGER - globalCount}
                    </span>
                </div>
                <button onClick={() => setActiveTab(activeTab === 'dashboard' ? 'history' : 'dashboard')} className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition">
                    {activeTab === 'dashboard' ? <History size={18} /> : <X size={18} />}
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-4xl mx-auto space-y-6">
        
        {/* Global Event Modal */}
        {globalEvent && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-yellow-600/50 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden transform scale-100">
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="bg-yellow-500/20 p-4 rounded-full text-yellow-500 animate-bounce">
                            <Zap size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-yellow-400 uppercase tracking-widest">Evento Global</h2>
                        <h3 className="text-xl font-semibold text-white">{globalEvent.title}</h3>
                        <p className="text-slate-300 leading-relaxed text-sm">{globalEvent.description}</p>
                        
                        <button 
                            onClick={() => setGlobalEvent(null)} 
                            className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white py-3 rounded-xl mt-4 font-bold transition shadow-lg"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Opportunity Modal */}
        {opportunity && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
                <div className={`bg-slate-800 border-2 w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl relative ${opportunity.type === 'gain' ? 'border-emerald-500/50 shadow-emerald-500/20' : 'border-red-500/50 shadow-red-500/20'}`}>
                    <div className="mb-4 text-5xl animate-pulse">
                        {opportunity.type === 'gain' ? '🍀' : '⚠️'}
                    </div>
                    <h2 className={`text-xl font-black mb-2 uppercase tracking-wide ${opportunity.type === 'gain' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {opportunity.title}
                    </h2>
                    <p className="text-slate-300 mb-6 text-sm">{opportunity.description}</p>
                    
                    <div className={`text-4xl font-black mb-6 ${opportunity.type === 'gain' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {opportunity.type === 'gain' ? '+' : '-'}{opportunity.displayValue}
                    </div>

                    <button 
                        onClick={() => setOpportunity(null)}
                        className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'dashboard' ? (
            <>
                {/* Cartão de Saldo Principal */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-xl border border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Banknote size={120} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Saldo Disponível</div>
                        <div className="text-5xl font-black text-white tracking-tighter drop-shadow-lg mb-6">
                            {me ? formatMoney(me.balance) : '---'}
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => handleTransaction('pass_go')}
                                className="flex-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition group"
                            >
                                <RefreshCw size={18} className="text-emerald-400 group-hover:rotate-180 transition-transform duration-500" />
                                <span className="text-xs font-bold text-emerald-400 uppercase">Passar Início (+200)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grid de Ações */}
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setSelectedAction('pay')}
                        className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-red-500/50 transition active:scale-95 flex flex-col items-center justify-center gap-3 group"
                    >
                        <div className="p-3 bg-red-500/10 rounded-full group-hover:bg-red-500/20 transition">
                            <ArrowUpRight className="text-red-500" size={28} />
                        </div>
                        <span className="font-bold text-red-400">Pagar</span>
                    </button>

                    <button 
                        onClick={() => setSelectedAction('receive')}
                        className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-emerald-500/50 transition active:scale-95 flex flex-col items-center justify-center gap-3 group"
                    >
                        <div className="p-3 bg-emerald-500/10 rounded-full group-hover:bg-emerald-500/20 transition">
                            <ArrowDownRight className="text-emerald-500" size={28} />
                        </div>
                        <span className="font-bold text-emerald-400">Receber</span>
                    </button>
                    
                    <button 
                        onClick={() => setSelectedAction('transfer')}
                        className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition active:scale-95 flex flex-col items-center justify-center gap-3 group"
                    >
                        <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition">
                            <ArrowRightLeft className="text-blue-500" size={28} />
                        </div>
                        <span className="font-bold text-blue-400">Transferir</span>
                    </button>

                    <button 
                        onClick={handleOpportunity}
                        className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl border border-indigo-500 hover:from-indigo-500 hover:to-purple-600 transition active:scale-95 flex flex-col items-center justify-center gap-3 shadow-lg shadow-indigo-900/30 relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition"></div>
                        <BrainCircuit className="text-white animate-pulse" size={32} />
                        <span className="font-bold text-white">IA Oportunidade</span>
                    </button>
                </div>

                {/* Lista de Outros Jogadores */}
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div> Outros Jogadores
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
                        {players.filter(p => p.id !== socket.id).map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-slate-700/30 p-2.5 rounded-lg border border-slate-600/30 text-sm">
                                <span className="font-semibold text-slate-300">{p.name}</span>
                                <span className="text-slate-400 font-mono">{formatMoney(p.balance)}</span>
                            </div>
                        ))}
                        {players.length <= 1 && <p className="text-center text-slate-600 text-xs italic py-2">Ninguém mais na sala.</p>}
                    </div>
                </div>
            </>
        ) : (
            // HISTÓRICO
            <div className="bg-slate-800 rounded-2xl p-4 min-h-[60vh] border border-slate-700">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-300">
                    <History size={20} /> Histórico de Atividades
                </h3>
                <div className="space-y-3">
                    {history.map((item, idx) => (
                        <div key={idx} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-sm flex gap-3">
                            <div className={`mt-0.5 ${
                                item.category === 'TRANSACTION' ? 'text-blue-400' :
                                item.category === 'OPPORTUNITY' ? 'text-purple-400' :
                                item.category === 'GLOBAL' ? 'text-yellow-400' : 'text-slate-400'
                            }`}>
                                {item.category === 'TRANSACTION' && <ArrowRightLeft size={16} />}
                                {item.category === 'OPPORTUNITY' && <BrainCircuit size={16} />}
                                {item.category === 'GLOBAL' && <Zap size={16} />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span className="font-bold uppercase tracking-wider">{item.category}</span>
                                    <span>{item.time}</span>
                                </div>
                                <p className="text-slate-300 leading-snug">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                    {history.length === 0 && <p className="text-slate-500 text-center py-8">Nenhuma atividade registrada.</p>}
                </div>
            </div>
        )}
      </main>

      {/* Modal de Ação (Pagar/Receber/Transferir) */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-800 w-full max-w-sm rounded-3xl p-6 border border-slate-700 shadow-2xl transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {selectedAction === 'pay' && <><ArrowUpRight className="text-red-500" /> Pagar ao Banco</>}
                {selectedAction === 'receive' && <><ArrowDownRight className="text-emerald-500" /> Receber do Banco</>}
                {selectedAction === 'transfer' && <><ArrowRightLeft className="text-blue-500" /> Transferir</>}
              </h3>
              <button onClick={() => setSelectedAction(null)} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {selectedAction === 'transfer' && (
                <div>
                  <label className="block text-xs uppercase text-slate-400 font-bold mb-2">Para quem?</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none appearance-none"
                    onChange={(e) => setTransferTarget(e.target.value)}
                    value={transferTarget}
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
                <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-bold text-xl">R$</span>
                    <input 
                    type="number" 
                    autoFocus
                    className={`w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-12 text-3xl font-bold text-white outline-none placeholder-slate-700 ${
                        selectedAction === 'pay' ? 'focus:border-red-500' :
                        selectedAction === 'receive' ? 'focus:border-emerald-500' :
                        'focus:border-blue-500'
                    }`}
                    placeholder="0"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    />
                </div>
              </div>

              <button 
                onClick={() => handleTransaction(
                  selectedAction === 'pay' ? 'pay_bank' : 
                  selectedAction === 'receive' ? 'receive_bank' : 'pay_player'
                )}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition transform active:scale-95 ${
                  selectedAction === 'pay' ? 'bg-red-500 hover:bg-red-600 text-white' :
                  selectedAction === 'receive' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' :
                  'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
