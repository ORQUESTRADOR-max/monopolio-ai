import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, MinusCircle, RefreshCw, DollarSign, TrendingUp, TrendingDown, 
  Zap, Users, History, ArrowRightLeft, Banknote, BrainCircuit, X, Play, ArrowUpRight, ArrowDownRight
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

export default function MonopolyBankApp() {
  const [gameState, setGameState] = useState('setup'); // setup, playing
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [history, setHistory] = useState([]);
  const [globalEvent, setGlobalEvent] = useState(null);
  const [opportunity, setOpportunity] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [interactionCount, setInteractionCount] = useState(0);

  // Controle de Modais e Views
  const [selectedPlayer, setSelectedPlayer] = useState(null); // Jogador "Foco"
  const [transferTarget, setTransferTarget] = useState(null); 
  const [amountInput, setAmountInput] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, history

  // --- SOCKET.IO EFFECTS ---
  useEffect(() => {
    socket.on('update_players', (serverPlayers) => {
      const playersArray = Object.values(serverPlayers);
      setPlayers(playersArray);
      
      if (selectedPlayer) {
        const updatedMe = playersArray.find(p => p.id === selectedPlayer.id);
        if (updatedMe) setSelectedPlayer(updatedMe);
      }
    });

    socket.on('new_log', (log) => {
      addToHistory(log.type, log.text);
      if (log.type === 'transaction' || log.type === 'opportunity') {
          setInteractionCount(prev => prev + 1);
      }
    });

    socket.on('global_event', (evt) => {
      setGlobalEvent(evt);
    });

    socket.on('opportunity_result', (opp) => {
      setOpportunity(opp);
    });

    socket.on('game_log', (logs) => {
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
  }, [selectedPlayer]);

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

    const socketType = type === 'transfer' ? 'pay_player' : type;

    const payload = {
      type: socketType,
      amount,
      targetId: transferTarget
    };

    socket.emit('transaction', payload);
    
    setAmountInput('');
    setTransferTarget(null);
    setSelectedPlayer(null);
  };

  const handleOpportunity = () => {
    socket.emit('request_opportunity');
  };

  const addToHistory = (category, desc) => {
    setHistory(prev => [{ time: new Date().toLocaleTimeString(), category: category.toUpperCase(), desc }, ...prev]);
  };

  const me = players.find(p => p.id === socket.id);

  // --- RENDERIZADORES ---

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
          <div className="flex justify-center mb-6 text-emerald-400">
            <Banknote size={64} />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Monopoly Bank
          </h1>
          <p className="text-slate-400 text-center mb-8">Gerenciador Financeiro & IA</p>
          
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
                className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg transition-colors"
              >
                <PlusCircle />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 my-4">
                {players.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                        <span className="font-semibold text-slate-200">{p.name}</span>
                        <span className="text-emerald-400 font-mono text-sm">{formatMoney(p.balance)}</span>
                    </div>
                ))}
                {players.length === 0 && <p className="text-center text-slate-500 text-sm italic">Adicione jogadores para começar</p>}
            </div>

            <button 
                onClick={() => players.length >= 1 ? setGameState('playing') : alert("Adicione pelo menos 1 jogador.")} 
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all ${players.length >= 1 ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-[1.02] text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
            >
                INICIAR JOGO / ENTRAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Banknote className="text-emerald-500" />
            <span className="font-bold text-lg tracking-wider">MONOPOLY BANK</span>
          </div>
          <div className="flex items-center gap-2 text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            <RefreshCw size={12} className={interactionCount % GLOBAL_EVENT_TRIGGER === 0 && interactionCount > 0 ? "animate-spin text-yellow-400" : "text-slate-400"} />
            <span className={interactionCount % GLOBAL_EVENT_TRIGGER >= 8 ? "text-yellow-400 font-bold" : "text-slate-400"}>
              Evento: {GLOBAL_EVENT_TRIGGER - (interactionCount % GLOBAL_EVENT_TRIGGER)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-4xl mx-auto space-y-6">
        
        {/* Global Event Notification Modal */}
        {globalEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-yellow-600/50 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-yellow-500/20 p-4 rounded-full text-yellow-500 animate-bounce">
                    <Zap size={32} />
                </div>
                <h2 className="text-2xl font-bold text-yellow-400 uppercase tracking-widest">Evento Global</h2>
                <h3 className="text-xl font-semibold text-white">{globalEvent.title}</h3>
                <p className="text-slate-300">{globalEvent.description}</p>
                <button 
                    onClick={() => setGlobalEvent(null)} 
                    className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white py-3 rounded-xl mt-4 font-bold"
                >
                    Confirmar
                </button>
                </div>
            </div>
            </div>
        )}

        {/* Opportunity Result Modal */}
        {opportunity && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className={`bg-slate-900 border-2 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center relative overflow-hidden ${opportunity.type === 'gain' ? 'border-emerald-500/50' : 'border-rose-500/50'}`}>
                    <div className="flex flex-col items-center gap-4">
                        <div className={`p-4 rounded-full ${opportunity.type === 'gain' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            <BrainCircuit size={40} />
                        </div>
                        <div>
                            <h3 className="text-sm uppercase tracking-widest text-slate-400 mb-1">IA Analisou:</h3>
                            <h2 className={`text-2xl font-bold ${opportunity.type === 'gain' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {opportunity.title}
                            </h2>
                        </div>
                        <p className="text-slate-200 text-lg">{opportunity.description}</p>
                        
                        <div className={`text-3xl font-bold my-2 ${opportunity.type === 'gain' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {opportunity.type === 'gain' ? '+' : '-'}{formatMoney(Math.abs(opportunity.value))}
                        </div>

                        <button 
                            onClick={() => { setOpportunity(null); setSelectedPlayer(null); }}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl border border-slate-600"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Player Selection Modal (Action Menu) */}
        {selectedPlayer && !opportunity && (
            <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
                <div className="bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border-t sm:border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                    <div className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 p-4 border-b border-slate-800 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedPlayer.name}</h2>
                            <p className="text-emerald-400 font-mono text-lg">{formatMoney(selectedPlayer.balance)}</p>
                        </div>
                        <button 
                            onClick={() => { setSelectedPlayer(null); setTransferTarget(null); setAmountInput(''); }}
                            className="p-2 bg-slate-800 rounded-full text-slate-400"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-4 space-y-6">
                        <button 
                            onClick={() => handleTransaction('pass_go')}
                            className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-900 to-emerald-800 border border-emerald-700/50 p-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <ArrowRightLeft className="text-emerald-400" />
                                <div className="text-left">
                                    <div className="font-bold text-emerald-100">Passar no Início</div>
                                    <div className="text-xs text-emerald-400/70">Coletar salário</div>
                                </div>
                            </div>
                            <span className="font-bold text-emerald-400 text-xl">+{formatMoney(PASS_GO_AMOUNT)}</span>
                        </button>

                        <button 
                            onClick={handleOpportunity}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-900 to-purple-900 border border-purple-500/30 p-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <BrainCircuit className="text-purple-300 group-hover:animate-pulse" />
                            <span className="font-bold text-purple-100">Gerar Oportunidade IA</span>
                        </button>

                        <hr className="border-slate-800" />

                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Transações</label>
                            
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</div>
                                <input 
                                    type="number" 
                                    inputMode="numeric" 
                                    value={amountInput} 
                                    onChange={(e) => setAmountInput(e.target.value)} 
                                    placeholder="0" 
                                    className="w-full bg-slate-950 border border-slate-700 text-white text-2xl font-mono p-4 pl-12 rounded-xl focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {players.filter(p => p.id !== selectedPlayer.id).map(target => (
                                    <button 
                                        key={target.id} 
                                        onClick={() => setTransferTarget(transferTarget === target.id ? null : target.id)}
                                        className={`p-2 rounded-lg border text-sm truncate transition-colors ${
                                            transferTarget === target.id 
                                            ? 'bg-blue-600 border-blue-400 text-white' 
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {target.name}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {transferTarget ? (
                                    <button 
                                        onClick={() => handleTransaction('transfer')} 
                                        disabled={!amountInput}
                                        className="col-span-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        Pagar Jogador <ArrowRightLeft size={18} />
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => handleTransaction('receive_bank')} 
                                            disabled={!amountInput}
                                            className="bg-emerald-600/20 border border-emerald-600/50 hover:bg-emerald-600/30 text-emerald-400 p-3 rounded-xl font-bold flex flex-col items-center gap-1"
                                        >
                                            <TrendingUp size={20} />
                                            <span>Receber Banco</span>
                                        </button>
                                        <button 
                                            onClick={() => handleTransaction('pay_bank')} 
                                            disabled={!amountInput}
                                            className="bg-rose-600/20 border border-rose-600/50 hover:bg-rose-600/30 text-rose-400 p-3 rounded-xl font-bold flex flex-col items-center gap-1"
                                        >
                                            <TrendingDown size={20} />
                                            <span>Pagar Banco</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {players.map(player => (
                    <div 
                        key={player.id} 
                        onClick={() => setSelectedPlayer(player)}
                        className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-5 rounded-2xl shadow-lg relative cursor-pointer group transition-all hover:translate-y-[-2px]"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{player.name}</h3>
                            <div className="bg-slate-800 p-2 rounded-full text-slate-400 group-hover:text-white group-hover:bg-blue-600 transition-colors">
                                <DollarSign size={16} />
                            </div>
                        </div>
                        <div className="text-3xl font-mono font-bold text-emerald-400 tracking-tight">
                            {formatMoney(player.balance)}
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 uppercase font-semibold">
                            <span>Toque para gerenciar</span>
                            <ArrowRightLeft size={12} />
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* History View */}
        {activeTab === 'history' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 bg-slate-800 border-b border-slate-700 font-bold text-slate-300 flex items-center gap-2">
                    <History size={18} /> Histórico de Transações
                </div>
                <div className="divide-y divide-slate-800 max-h-[60vh] overflow-y-auto">
                    {history.length === 0 ? (
                        <div className="p-8 text-center text-slate-600 italic">Nenhuma transação ainda.</div>
                    ) : (
                        history.map((item, idx) => (
                            <div key={idx} className="p-4 hover:bg-slate-800/50 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                        item.category === 'EVENTO GLOBAL' ? 'bg-yellow-900/50 text-yellow-500' :
                                        item.category === 'OPORTUNIDADE IA' ? 'bg-purple-900/50 text-purple-400' :
                                        'bg-blue-900/50 text-blue-400'
                                    }`}>
                                        {item.category}
                                    </span>
                                    <span className="text-xs text-slate-500">{item.time}</span>
                                </div>
                                <p className="text-sm text-slate-300">{item.desc}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 p-2 pb-6 z-30">
        <div className="flex justify-around max-w-md mx-auto">
            <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`flex flex-col items-center p-2 rounded-lg w-1/2 transition-colors ${activeTab === 'dashboard' ? 'text-emerald-400 bg-slate-800' : 'text-slate-500'}`}
            >
                <Users size={24} />
                <span className="text-xs mt-1">Jogadores</span>
            </button>
            <button 
                onClick={() => setActiveTab('history')} 
                className={`flex flex-col items-center p-2 rounded-lg w-1/2 transition-colors ${activeTab === 'history' ? 'text-blue-400 bg-slate-800' : 'text-slate-500'}`}
            >
                <History size={24} />
                <span className="text-xs mt-1">Histórico</span>
            </button>
        </div>
      </nav>

    </div>
  );
}
