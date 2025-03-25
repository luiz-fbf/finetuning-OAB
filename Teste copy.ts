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

async function processarPDF() {
  try {
    // Lê o arquivo Markdown com a tabela para montar o system message
    const conteudo = fs.readFileSync('Tabela_dativos.txt', 'utf8');

    // Lê o arquivo JSONL contendo vários samples
    const jsonlData = fs.readFileSync('samples.jsonl', 'utf8');
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
          content: `Sua função é extrair dados de um arquivo de texto e armazenar esses dados em uma estrutura JSON. VOCE DEVE SEGUIR ESSA ESTRUTURA COMO OUTPUT: {"n_processo":"numero do processo","classificador":"valor do classificador","valor_fixado":"valor do dativo","nome_advogado":"nome do advogado","nome_juiz":"nome do juiz ou desembargador","nome_apelado":"nome do acusado","nome_apelante":"nome do acusador","assinatura_valid":"True or False"}. Caso você não tenha certeza ou não encontre o dado requerido, NAO INVENTE DADOS, coloque como NULL. OS DADOS SÃO: o CODIGO DO PROCESSO, VALOR FIXADO DATIVOS/HONORÁRIOS, NOME DO ADVOGADO, NOME DO JUIZ, NOME DO APELANTE, NOME DO APELADO, SE FOI ASSINADO PELO JUIZ e, além disso, de acordo com a tabela MARKDOWN providenciada abaixo, você deve classificar esse processo com 1 dos códigos fornecidos de acordo com a temática. MARKDOWN: ${conteudo}`
        },
        {
          role: 'user',
          content: user_content
        },
        {
          role: 'assistant',
          content: '{"n_processo":"numero do processo","classificador":"valor do classificador","valor_fixado":"valor do dativo","nome_advogado":"nome do advogado","nome_juiz":"nome do juiz ou desembargador","nome_apelado":"nome do acusado","nome_apelante":"nome do acusador","assinatura_valid":"True or False"}'
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
      
      // Asserção de tipo para OpenAIResponse
      const completion = (await response.json()) as OpenAIResponse;

      console.log(JSON.stringify(completion, null, 2));
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
