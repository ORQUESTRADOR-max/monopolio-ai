// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Configurações ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
const PORT = process.env.PORT || 3000;

if (process.env.GEMINI_API_KEY) {
    console.log("✅ GEMINI_API_KEY encontrada. IA Ativada.");
} else {
    console.log("⚠️ GEMINI_API_KEY não encontrada. Usando modo Procedural.");
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// --- Estado do Jogo ---
let players = {};
let gameLog = [];
let globalInteractionCount = 0;
const GLOBAL_EVENT_TRIGGER = 10;
const PASS_GO_AMOUNT = 200;
const INITIAL_BALANCE = 1500;

// --- Middlewares ---
app.use(express.json());

// Servir arquivos estáticos do React (Vite)
app.use(express.static(path.join(__dirname, 'client/dist')));

// --- Rotas de Diagnóstico ---
app.get('/test-ai', async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
        return res.json({ status: 'error', message: 'Variável GEMINI_API_KEY não encontrada no ambiente.' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Diga apenas 'IA Funcionando' se você estiver me ouvindo.");
        const response = await result.response;
        res.json({ 
            status: 'success', 
            ai_response: response.text(),
            key_preview: process.env.GEMINI_API_KEY.substring(0, 5) + '...' 
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Erro ao conectar com Gemini', 
            details: error.message 
        });
    }
});

// --- Rota Principal (React SPA) ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// --- Lógica de IA (Oportunidade) ---
function generateProceduralOpportunity(playerName, currentBalance) {
    const isGood = Math.random() > 0.45; 
    const impact = Math.random(); 
    
    let title = "";
    let description = "";
    let value = 0;
    let type = isGood ? 'gain' : 'loss';
    let percentage = 0;

    const formatMoney = (val) => `R$ ${Math.abs(val).toLocaleString('pt-BR')}`;

    if (isGood) {
        if (impact > 0.8) { 
            title = "Investimento Visionário";
            percentage = 20;
            value = Math.floor(currentBalance * 0.20);
            description = "A IA detectou uma startup unicórnio. Seus ativos valorizaram 20%.";
        } else if (impact > 0.4) {
            title = "Dividendos Digitais";
            value = Math.floor(Math.random() * 150) + 50;
            description = `Seus investimentos em cripto renderam frutos. Receba ${formatMoney(value)}.`;
        } else {
            title = "Reembolso Fiscal";
            value = 50;
            description = "Erro a seu favor no sistema bancário. Receba R$ 50,00.";
        }
    } else {
        if (impact > 0.85) { 
            title = "Crash do Sistema";
            percentage = 15;
            value = Math.floor(currentBalance * 0.15);
            description = "Um ataque hacker congelou 15% dos seus fundos para recuperação de dados.";
        } else if (impact > 0.4) {
            title = "Taxa de Luxo";
            value = Math.floor(Math.random() * 100) + 50;
            description = `Manutenção das propriedades custou caro. Pague ${formatMoney(value)}.`;
        } else {
            title = "Multa de Trânsito";
            value = 30;
            description = "Você foi pego pelo radar inteligente. Pague R$ 30,00.";
        }
    }

    if (type === 'loss' && value > currentBalance) {
        value = currentBalance;
        description += " (Você perdeu tudo o que tinha em caixa).";
    }

    // Retornar valor com sinal correto para cálculo
    const finalValue = type === 'gain' ? value : -value;

    return {
        title,
        description,
        value: finalValue,
        displayValue: percentage > 0 ? `${percentage}%` : formatMoney(finalValue),
        type
    };
}

async function generateOpportunity(playerName, balance) {
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const prompt = `Crie um evento de 'Sorte ou Revés' para um jogo de tabuleiro estilo Banco Imobiliário. 
            O jogador é '${playerName}' e tem R$ ${balance}.
            Responda APENAS um JSON no formato: 
            { "title": "Título Curto", "description": "Descrição divertida", "value": valor_numerico_positivo_ou_negativo }.
            Mantenha valores equilibrados entre -200 e +200.`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiResult = JSON.parse(jsonStr);
            
            return {
                ...aiResult,
                displayValue: `R$ ${Math.abs(aiResult.value)}`,
                type: aiResult.value >= 0 ? 'gain' : 'loss'
            };
        } catch (error) {
            console.error("Erro na IA, usando gerador procedural:", error);
        }
    }
    return generateProceduralOpportunity(playerName, balance);
}

// --- Lógica de Evento Global ---
function triggerGlobalEvent() {
    const events = [
        { title: "Recessão Econômica 📉", desc: "Todos os jogadores perdem 10% do saldo.", type: 'loss', pct: 0.10 },
        { title: "Boom Imobiliário 📈", desc: "O banco paga R$ 100 para cada jogador como dividendo.", type: 'gain', val: 100 },
        { title: "Imposto sobre Fortunas ⚖️", desc: "Quem tem mais de R$ 2000 paga R$ 200 ao banco.", type: 'conditional_loss' },
        { title: "Feriado Bancário 🏦", desc: "Todos recebem R$ 50 de bônus.", type: 'gain', val: 50 },
    ];

    const evt = events[Math.floor(Math.random() * events.length)];
    
    Object.values(players).forEach(p => {
        let change = 0;
        if (evt.type === 'loss') change = -Math.floor(p.balance * evt.pct);
        if (evt.type === 'gain') change = evt.val;
        if (evt.type === 'conditional_loss' && p.balance > 2000) change = -200;
        p.balance += change;
    });

    return evt;
}

// --- WebSocket Logic ---
io.on('connection', (socket) => {
    console.log('Novo jogador conectado:', socket.id);

    socket.emit('update_players', players);
    socket.emit('game_log', gameLog);

    socket.on('join_game', (playerName) => {
        players[socket.id] = {
            id: socket.id,
            name: playerName,
            balance: INITIAL_BALANCE
        };

        io.emit('update_players', players);
        
        const msg = { type: 'info', text: `${playerName} entrou na partida.` };
        gameLog.push(msg);
        io.emit('new_log', msg);
    });

    socket.on('transaction', (data) => {
        const { type, amount, targetId } = data;
        const player = players[socket.id];
        if (!player) return;

        let logMsg = '';

        if (type === 'pass_go') {
            player.balance += amount;
            logMsg = `${player.name} passou pelo Início (+R$ ${amount}).`;
        } else if (type === 'pay_bank') {
            player.balance -= amount;
            logMsg = `${player.name} pagou R$ ${amount} ao Banco.`;
        } else if (type === 'receive_bank') {
            player.balance += amount;
            logMsg = `${player.name} recebeu R$ ${amount} do Banco.`;
        } else if (type === 'pay_player') {
            const target = players[targetId];
            if (target) {
                player.balance -= amount;
                target.balance += amount;
                logMsg = `${player.name} pagou R$ ${amount} para ${target.name}.`;
            }
        }

        globalInteractionCount++;
        
        if (globalInteractionCount >= GLOBAL_EVENT_TRIGGER) {
            globalInteractionCount = 0;
            const globalEvent = triggerGlobalEvent();
            io.emit('global_event', globalEvent);
            const evtMsg = { type: 'global', text: `EVENTO GLOBAL: ${globalEvent.title}` };
            gameLog.push(evtMsg);
            io.emit('new_log', evtMsg);
        }

        io.emit('update_players', players);
        
        if (logMsg) {
            const msg = { type: 'transaction', text: logMsg };
            gameLog.push(msg);
            io.emit('new_log', msg);
        }
    });

    socket.on('request_opportunity', async () => {
        const player = players[socket.id];
        if (!player) return;

        const opportunity = await generateOpportunity(player.name, player.balance);
        player.balance += opportunity.value;

        socket.emit('opportunity_result', opportunity);
        io.emit('update_players', players);
        
        const valText = opportunity.value >= 0 ? `+R$ ${Math.abs(opportunity.value)}` : `-R$ ${Math.abs(opportunity.value)}`;
        const logText = `${player.name}: ${opportunity.title} (${valText})`;
        
        const msg = { type: 'opportunity', text: logText };
        gameLog.push(msg);
        io.emit('new_log', msg);
    });

    socket.on('disconnect', () => {
        if (players[socket.id]) {
            const name = players[socket.id].name;
            delete players[socket.id];
            io.emit('update_players', players);
            const msg = { type: 'info', text: `${name} saiu do jogo.` };
            gameLog.push(msg);
            io.emit('new_log', msg);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
