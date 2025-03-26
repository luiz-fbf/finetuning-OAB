import fs from 'fs';

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
// Nova interface com os nomes atualizados
interface DataExtraction {
  n_processo?: string;
  classificador?: string;
  valor_fixado?: string;
  nome_advogado?: string;
  nome_juiz?: string;
  nome_apelado?: string;
  nome_apelante?: string;
  assinatura_valid?: boolean;
}

async function processarPDF() {
  try {
    // Lê o arquivo Markdown com a tabela para montar o system message
    const conteudo = fs.readFileSync('Tabela_dativos.txt', 'utf8');

    // Lê o arquivo JSONL contendo vários samples
    const jsonlData = fs.readFileSync('Teste.jsonl', 'utf8');
    const lines = jsonlData.split('\n').filter(line => line.trim() !== '');
    
    // Itera sobre cada linha, extrai "user_content" e monta a estrutura JSON das mensagens
    for (const line of lines) {
      const sample = JSON.parse(line);
      // Extract the content from the message where role is "user"
      const userMessage = sample.messages.find((msg: ChatMessage) => msg.role === 'user');
      const user_content: string = userMessage?.content || '';
      
      const Messages: ChatMessage[] = [
        {
          role: 'system',
          content: `Sua função é extrair dados de um arquivo de texto e armazená-los em uma estrutura JSON. Para montar o JSON siga essa estrutura de INTERFACE: { n_processo?: string; classificador?: string; valor_fixado?: float; nome_advogado?: string; nome_juiz?: string; nome_apelado?: string; nome_apelante?: string; assinatura_valid?: boolean; assinatura_date?: string; }. 
                    Caso você não tenha certeza ou não encontre o dado requerido, NAO INVENTE DADOS, coloque como NULL. Normalmente há mais de um advogado nomeado para receber os dativos, se houver mais de 1 advogado, coloque o NOME dos dois ADVOGADOS dentro de um VETOR. FAÇA ISSO TAMBÉM PARA O VALOR, caso haja mais de um valor decorrente de mais de um advogado nomeado, coloque os valores em um VETOR. Lembre-se de não abreviar nomes em siglas!
                    OS DADOS SÃO: o CODIGO DO PROCESSO, VALOR FIXADO DATIVOS/HONORÁRIOS, NOME DO ADVOGADO, NOME DO JUIZ, NOME DO APELANTE, NOME DO APELADO, SE FOI ASSINADO PELO JUIZ, DATA DA ASSINATURA (YYYY-MM-DD) e, além disso, de acordo com a tabela providenciada abaixo, você deve classificar esse processo com 1 dos códigos fornecidos de acordo com a temática: ${conteudo}`
        },
        {
          role: 'user',
          content: user_content
        },
        {
          role: 'assistant',
          content: '{ n_processo?: string; classificador?: string; valor_fixado?: string; nome_advogado?: string; nome_juiz?: string; nome_apelado?: string; nome_apelante?: string; assinatura_valid?: boolean; assinatura_date?: string; }'
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
          model: "ft:gpt-4o-mini-2024-07-18:leany-lean-ventures:fine-tuning-oab-2:BDB3WhNi",
          messages: Messages,
          max_tokens: 150,
          temperature: 0.0
        })
      });
      

      // Verifica se houve erro na resposta
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        continue; // Pula para a próxima iteração, se estiver dentro de um loop
      }

      // Asserção de tipo para OpenAIResponse
      const completion = (await response.json()) as OpenAIResponse;

    
      if (completion.choices && completion.choices.length > 0) {
        console.log(completion.choices[0].message.content);
      } else {
        console.error("Nenhuma escolha retornada.");
      }
    }
  } catch (error) {
    console.error('Erro ao processar o arquivo JSONL ou montar as mensagens:', error);
  }
}

processarPDF();
