const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const Datastore = require('nedb');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializa o banco de dados em memória
const db = new Datastore();

// ==========================================
// ESTADO GLOBAL DO SISTEMA
// ==========================================
let contadorSenha = 1; 
let senhaAtualNoPainel = '000'; 
let qrCodeAtual = ''; 
let whatsappConectado = false; // Flag de segurança para evitar envio de mensagens antes da hora

// ==========================================
// CONFIGURAÇÃO DO WHATSAPP
// ==========================================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] } // Argumentos extras para estabilidade do Chromium
});

client.on('qr', (qr) => {
    qrCodeAtual = qr; 
    whatsappConectado = false;
    console.log('\n🤖 [WHATSAPP]: QR Code de Autenticação gerado! Acesse para conectar: http://localhost:3000/qr\n');
});

client.on('ready', () => {
    qrCodeAtual = ''; 
    whatsappConectado = true;
    console.log('🚀 [WHATSAPP]: Sistema online e bot conectado com sucesso!');
});

client.on('message', async (msg) => {
    try {
        const chat = await msg.getChat();
        
        // Ignora qualquer mensagem vinda de grupos
        if (chat.isGroup) return;

        // TRAVA DE SEGURANÇA PARA AUTO-CONVERSA (TESTE COM O PRÓPRIO NÚMERO):
        // Se a mensagem foi enviada por você mesmo, só permitimos avançar se o texto for exatamente '1'.
        // Isso impede que as próprias respostas do bot gerem um loop infinito.
        if (msg.fromMe && msg.body.trim() !== '1') return;

        const texto = msg.body.trim();

        // Se o cliente digitar 1, gera a senha
        if (texto === '1') {
            const codigoFormatado = String(contadorSenha).padStart(3, '0');
            contadorSenha++; // Avança o contador global

            const novaSenha = {
                usuarioId: msg.from, // Salva o ID do chat para responder depois
                codigo: codigoFormatado,
                status: 'aguardando',
                data: new Date()
            };

            db.insert(novaSenha, (err, doc) => {
                if (err) return console.error('Erro ao inserir senha no BD:', err);

                db.find({ status: 'aguardando' }).exec((err, fila) => {
                    if (err) return console.error('Erro ao buscar fila:', err);

                    // Calcula quantas pessoas estão na frente (remove a si mesmo da contagem)
                    const pessoasNaFrente = Math.max(0, fila.length - 1); 
                    
                    msg.reply(`✅ *Senha gerada com sucesso!*\n\n🎫 Sua senha é: *${doc.codigo}*\n👥 Pessoas na sua frente: *${pessoasNaFrente}*`)
                       .catch(e => console.error('Erro ao enviar resposta no WhatsApp:', e));
                });
            });
        } else if (!msg.fromMe) {
            // Mensagem de boas-vindas comum (Apenas para OUTROS usuários, evitando auto-envio)
            chat.sendMessage(`Olá! Bem-vindo ao autoatendimento.\n\nDigite *1* para retirar sua senha.`)
                .catch(e => console.error('Erro ao enviar boas-vindas:', e));
        }
    } catch (error) {
        console.error("Erro crítico no processamento da mensagem:", error);
    }
});

client.initialize();

// ==========================================
// API REST (WEB / PAINEL)
// ==========================================

// Exibe o QR Code de autenticação ou aviso de conectado
app.get('/qr', (req, res) => {
    if (whatsappConectado) {
        return res.send('<h3 style="text-align:center; margin-top:50px; font-family: sans-serif; color: #10b981;">✅ WhatsApp conectado e pronto para uso!</h3>');
    }
    
    if (!qrCodeAtual) {
        return res.send('<h3 style="text-align:center; margin-top:50px; font-family: sans-serif; color: #666;">Aguardando o WhatsApp gerar o código... Atualize a página em instantes.</h3>');
    }
    
    const linkQr = encodeURIComponent(qrCodeAtual);
    res.send(`
        <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
            <h2>Escaneie o QR Code para conectar o WhatsApp do Bot</h2>
            <div style="margin: 20px auto; padding: 15px; display: inline-block;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${linkQr}" alt="QR Code WhatsApp" />
            </div>
            <p style="color: #666;">Use a função "Aparelhos Conectados" no seu aplicativo móvel.</p>
        </div>
    `);
});

// Retorna os dados atuais para atualização em tempo real do painel
app.get('/api/status', (req, res) => {
    db.find({ status: 'aguardando' }).sort({ data: 1 }).exec((err, fila) => {
        if (err) return res.status(500).json({ error: 'Erro ao consultar banco de dados' });
        
        res.json({
            senhaAtual: senhaAtualNoPainel,
            proximaDisponivel: String(contadorSenha).padStart(3, '0'),
            pessoasNaFila: fila.length
        });
    });
});

// Geração de senha manual pelo Totem Web físico
app.post('/api/gerar', (req, res) => {
    const codigoFormatado = String(contadorSenha).padStart(3, '0');
    contadorSenha++; 

    const novaSenha = {
        origem: 'totem',
        codigo: codigoFormatado,
        status: 'aguardando',
        data: new Date()
    };

    db.insert(novaSenha, (err, doc) => {
        if (err) return res.status(500).json({ error: 'Erro ao salvar nova senha' });
        res.json({ message: 'Senha gerada com sucesso!', senha: doc.codigo });
    });
});

// Endpoint para o atendente chamar a próxima pessoa da fila
app.post('/api/chamar', (req, res) => {
    db.find({ status: 'aguardando' }).sort({ data: 1 }).limit(1).exec((err, senhas) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar próxima senha' });
        
        if (senhas.length === 0) {
            return res.status(404).json({ message: "A fila está vazia." });
        }

        const proximaSenha = senhas[0];

        db.update({ _id: proximaSenha._id }, { $set: { status: 'chamado' } }, {}, (err) => {
            if (err) return res.status(500).json({ error: 'Erro ao atualizar status da senha' });
            
            senhaAtualNoPainel = proximaSenha.codigo;
            
            // Se veio do WhatsApp e o bot está online, envia uma notificação push pro cliente
            if (proximaSenha.usuarioId && whatsappConectado) {
                client.sendMessage(proximaSenha.usuarioId, `🔔 *SUA VEZ CHEGOU!*\n\nDirija-se ao balcão de atendimento imediatamente com a senha *${proximaSenha.codigo}*.`)
                      .catch(e => console.error("Falha ao notificar cliente via WhatsApp:", e));
            }

            res.json({ senhaChamada: senhaAtualNoPainel });
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🖥️  Painel e API rodando em: http://localhost:${PORT}`));