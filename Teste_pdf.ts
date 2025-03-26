import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';

// Sua chave de API
const OPENAI_API_KEY = "";

interface ChatMessage {
  content: string;
  role: 'system' | 'user' | 'assistant' | 'function';
}

interface ChatChoice {
  message: ChatMessage;
}

interface OpenAIResponse {
  choices: ChatChoice[];
}

interface DataExtraction {
  n_processo?: string;
  classificador?: string;
  valor_fixado?: string;
  nome_advogado?: string;
  nome_juiz?: string;
  nome_apelado?: string;
  nome_apelante?: string;
  assinatura_valid?: boolean;
  assinatura_date?: string;
}

function extractTextFromPDF(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on('pdfParser_dataError', errorData => reject(errorData.parserError));
    pdfParser.on('pdfParser_dataReady', pdfData => {
      let text = '';
      for (let i = 0; i < pdfData.Pages.length; i++) {
        const page = pdfData.Pages[i];
        page.Texts.forEach(textItem => {
          textItem.R.forEach(r => {
            text += decodeURIComponent(r.T) + ' ';
          });
        });
        text += '\n';
      }
      resolve(text);
    });
    pdfParser.loadPDF(filePath);
  });
}

async function processarPDFs() {
  try {
    // Lê o arquivo de texto com a tabela para construir o system message
    const conteudoTabela = fs.readFileSync('Tabela_dativos.txt', 'utf8');

    // Define o diretório-base onde as pastas de classificadores estão armazenadas
    const baseDir = './classificadores';  // Pasta que contém várias subpastas, uma para cada classificador

    // Lê todas as pastas (classificadores) dentro da pasta base
    const pastaClassificadores = fs.readdirSync(baseDir, { withFileTypes: true })
                                   .filter(dirent => dirent.isDirectory())
                                   .map(dirent => dirent.name);

    let totalGlobal = 0;
    let correctGlobal = 0;

    // Itera sobre cada pasta (classificador)
    for (const pasta of pastaClassificadores) {
      const diretorioCompleto = path.join(baseDir, pasta);
      // Obtém apenas os PDFs da pasta atual
      const pdfFiles = fs.readdirSync(diretorioCompleto).filter(file => file.endsWith('.pdf'));
      let totalPasta = pdfFiles.length;
      let correctPasta = 0;

      console.log(`Processando classificador: ${pasta}`);
      for (const fileName of pdfFiles) {
        const filePath = path.join(diretorioCompleto, fileName);
        const userContent = await extractTextFromPDF(filePath);

        const Messages: ChatMessage[] = [
          {
            role: 'system',
            content: `Sua função é PERCORRER O PROCESSO JURÍDICO INTEIRO, INTERPRETAR O PROCESSO E CLASSIFICAR COM BASE NO ENTENDIMENTO JURÍDICO DO BRASIL E NA TABELA DE DATIVOS ADVOCATÍCIOS FORNECIDA. Para classificar o processo, utilize a tabela de classificadores fornecida, lembre-se de INTERPRETAR O PROCESSO. Além disso, extraia dados de um arquivo de texto e armazená-los em uma estrutura JSON. Para montar o JSON siga essa estrutura de INTERFACE: { n_processo?: string; classificador?: string; valor_fixado?: float; nome_advogado?: string; nome_juiz?: string; nome_apelado?: string; nome_apelante?: string; assinatura_valid?: boolean; assinatura_date?: string; }. 
                    Caso você não tenha certeza ou não encontre o dado requerido, NAO INVENTE DADOS, coloque como NULL. Normalmente há mais de um advogado nomeado para receber os dativos, se houver mais de 1 advogado, coloque o NOME dos dois ADVOGADOS dentro de um VETOR. FAÇA ISSO TAMBÉM PARA O VALOR, caso haja mais de um valor decorrente de mais de um advogado nomeado, coloque os valores em um VETOR. LEMBRE-SE, não retorne nenhuma justificstiva, apenas o JSON. Percebi que você está confundindo o classificador, quando na realidade é 1.2 voce classifica como 1.1, PRESTE ATENÇÃO. LMEBRE-SE DE SE ATENTAR AOS VALORES DE CADA ITEM, COMPARE COM O VALOR QUE VOCE EXTRAIU PARA DECIDIR O CODIGO CORRETO. OS DADOS SÃO: o CODIGO DO PROCESSO, VALOR FIXADO DATIVOS/HONORÁRIOS, NOME DO ADVOGADO, NOME DO JUIZ, NOME DO APELANTE, NOME DO APELADO, SE FOI ASSINADO PELO JUIZ, DATA DA ASSINATURA (YYYY-MM-DD) e, de acordo com a tabela providenciada abaixo, você deve classificar esse processo com 1 dos códigos fornecidos de acordo com a temática: ${conteudoTabela}`
          },
          {
            role: 'user',
            content: `SENTENÇA: ${userContent}\n\n TABELA: ${conteudoTabela} \n`
          },
          {
            role: 'assistant',
            content: '{ n_processo?: string; classificador?: string; valor_fixado?: string; nome_advogado?: string; nome_juiz?: string; nome_apelado?: string; nome_apelante?: string; assinatura_valid?: boolean; assinatura_date?: string; }'
          }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "ft:gpt-4o-mini-2024-07-18:leany-lean-ventures:fine-tuning-oab-2:BDB3WhNi",
            messages: Messages,
            max_tokens: 150,
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error:", errorText);
          continue;
        }

        const completion = (await response.json()) as OpenAIResponse;
  
        if (completion.choices && completion.choices.length > 0) {
          const resposta = completion.choices[0].message.content;
          console.log(`Resposta da API para ${fileName}:`, resposta);
          try {
            const dados: DataExtraction = JSON.parse(resposta);
            // Verifica se o classificador retornado bate com o nome da pasta (classificador alvo)
            if (dados.classificador && dados.classificador === pasta) {
              correctPasta++;
            }
          } catch (jsonError) {
            console.error("Erro ao fazer parse do JSON em", fileName, ":", jsonError);
          }
        } else {
          console.error("Nenhuma escolha retornada para", fileName);
        }
      }

      const porcentagemPasta = totalPasta > 0 ? (correctPasta / totalPasta) * 100 : 0;
      console.log(`Pasta '${pasta}': Total de PDFs: ${totalPasta}, Acertos: ${correctPasta}, Porcentagem: ${porcentagemPasta.toFixed(2)}%`);

      totalGlobal += totalPasta;
      correctGlobal += correctPasta;
    }

    const porcentagemGlobal = totalGlobal > 0 ? (correctGlobal / totalGlobal) * 100 : 0;
    console.log(`\nAcumulado Global: Total de PDFs: ${totalGlobal}, Acertos: ${correctGlobal}, Porcentagem: ${porcentagemGlobal.toFixed(2)}%`);
    
  } catch (error) {
    console.error('Erro ao processar os PDFs ou montar as mensagens:', error);
  }
}

processarPDFs();