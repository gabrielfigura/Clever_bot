const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const URL = 'https://casinoscores.com/es/bac-bo/';

let ultimos = [];
let bloqueios = {};
let ultimoSinal = null;

async function enviarTelegram(msg) {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: msg,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    console.error('Erro ao enviar para o Telegram:', err.message);
  }
}

async function buscarResultados() {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const resultados = [];
    $('.last-result-item').each((_, el) => {
      const txt = $(el).text().trim().toUpperCase();
      if (txt.includes("AZUL")) resultados.push('AZUL');
      else if (txt.includes("ROJO") || txt.includes("VERMELHO")) resultados.push('VERMELHO');
      else if (txt.includes("TIE")) resultados.push('TIE');
    });

    return resultados.slice(0, 10).reverse();
  } catch (err) {
    console.error('Erro ao buscar resultados:', err.message);
    return [];
  }
}

function detectarPadrao(arr) {
  const agora = new Date();
  const hora = agora.getHours();

  const ultimos5 = arr.slice(-5);
  const ultimos4 = arr.slice(-4);

  const todasIguais = (lista, cor) => lista.every(v => v === cor);
  const alternando = (lista) => (
    lista.length === 4 &&
    lista[0] !== lista[1] &&
    lista[0] === lista[2] &&
    lista[1] === lista[3]
  );

  if (todasIguais(ultimos4, 'AZUL') && bloqueios['azul4'] !== hora) {
    enviarTelegram('🔍 *Padrão AZUL se formando* (4x). Fique atento!');
    bloqueios['azul4'] = hora;
  }

  if (todasIguais(ultimos5, 'AZUL') && bloqueios['azul5'] !== hora) {
    enviarTelegram('🎯 *5x AZUL!* Apostar em AZUL!');
    bloqueios['azul5'] = hora;
    ultimoSinal = 'AZUL';
  }

  if (todasIguais(ultimos4, 'VERMELHO') && bloqueios['vermelho4'] !== hora) {
    enviarTelegram('🔍 *Padrão VERMELHO se formando* (4x). Fique atento!');
    bloqueios['vermelho4'] = hora;
  }

  if (todasIguais(ultimos5, 'VERMELHO') && bloqueios['vermelho5'] !== hora) {
    enviarTelegram('🎯 *5x VERMELHO!* Apostar em VERMELHO!');
    bloqueios['vermelho5'] = hora;
    ultimoSinal = 'VERMELHO';
  }

  if (alternando(ultimos4) && bloqueios['alternancia'] !== hora) {
    const apostar = ultimos4[0];
    enviarTelegram(`🔁 *Alternância detectada!* Apostar em ${apostar}!`);
    bloqueios['alternancia'] = hora;
    ultimoSinal = apostar;
  }
}

function validarResultado(arr) {
  if (!ultimoSinal) return;
  const resultadoAtual = arr[arr.length - 1];
  if (resultadoAtual === ultimoSinal) {
    enviarTelegram(`✅ *ACERTOU!* Último resultado: ${resultadoAtual}`);
  } else {
    enviarTelegram(`❌ *ERROU!* Último resultado: ${resultadoAtual}`);
  }
  ultimoSinal = null;
}

async function iniciar() {
  const resultados = await buscarResultados();
  if (resultados.length) {
    if (ultimos.length && resultados[resultados.length - 1] !== ultimos[ultimos.length - 1]) {
      validarResultado(resultados);
    }
    ultimos = resultados;
    detectarPadrao(resultados);
  }
}

console.log('⏳ Analisando padrões do Bac Bo ao vivo...');
enviarTelegram('🟡 Bot iniciado!\n⏳ Analisando padrões do *Bac Bo ao vivo*...');

setInterval(iniciar, 6000);
