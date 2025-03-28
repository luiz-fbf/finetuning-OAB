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

function extractTextFromPDF(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();
        pdfParser.on("pdfParser_dataError", (errorData) => reject(errorData.parserError));
        pdfParser.on("pdfParser_dataReady", (pdfData) => {
            let text = "";
            for (let i = 0; i < pdfData.Pages.length; i++) {
                const page = pdfData.Pages[i];
                page.Texts.forEach((textItem: any) => {
                    textItem.R.forEach((r: any) => {
                        text += decodeURIComponent(r.T) + " ";
                    });
                });
                text += "\n";
            }
            resolve(text);
        });
        pdfParser.loadPDF(filePath);
    });
}


// Nova interface com os nomes atualizados
async function processarPDF() {
  try {
    // Lê o arquivo Markdown com a tabela para montar o system message
    const system_content = fs.readFileSync('Prompt_Refinado.txt', 'utf8');

    // Define o diretório-base onde as pastas de classificadores estão armazenadas
    const baseDir = './classificadores';  // Pasta que contém várias subpastas, uma para cada classificador

    // Lê todas as pastas (classificadores) dentro da pasta base
    const pastaClassificadores = fs.readdirSync(baseDir, { withFileTypes: true })
                                    .filter(dirent => dirent.isDirectory())
                                    .map(dirent => dirent.name);
    
     // Itera sobre cada pasta (classificador)
    for (const pasta of pastaClassificadores) {
      const diretorioCompleto = path.join(baseDir, pasta);
      // Obtém apenas os PDFs da pasta atual
      const pdfFiles = fs.readdirSync(diretorioCompleto).filter(file => file.endsWith('.pdf'));

      console.log(`Processando classificador: ${pasta}`);
      for (const fileName of pdfFiles) {
        const filePath = path.join(diretorioCompleto, fileName);
        const userContent = await extractTextFromPDF(filePath);
      
        const Messages: ChatMessage[] = [
          {
            role: 'system',
            content: system_content
          },
          {
            role: 'user',
            content: userContent
          },
          {
            role: 'assistant',
            content: `{
                      "n_processo": string | null,
                      "n_auto": string | null,
                      "valor_fixado": float | [float] | null,
                      "outros_valores?": [{"descricao": string, "valor": float}] | null,
                      "nome_advogado": string | [string] | null,
                      "nome_juiz": string | null,
                      "nome_apelado": string | null,
                      "nome_apelante": string | null,
                      "assinatura_valid": boolean | null,
                      "assinatura_date": string | null,
                      "outras_datas?": [{"descricao": string, "data": string}] | null
                    }`
          }
        ];
      
        // Chamada à API com fetch
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o-2024-08-06",
            messages: Messages,
            max_tokens: 350,
            temperature: 0.0
          })
        });
      
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error:", errorText);
          continue;
        }
      
        const completion = (await response.json()) as OpenAIResponse;
    
        if (completion.choices && completion.choices.length > 0) {
          console.log(completion.choices[0].message.content);
        } else {
          console.error("Nenhuma escolha retornada.");
        }
      } // End of pdfFiles loop
    } // End of pastaClassificadores loop
  } catch (error) {
    console.error('Erro ao processar o arquivo JSONL ou montar as mensagens:', error);
  }
}

processarPDF();
