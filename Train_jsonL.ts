import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';

// Your API key
const OPENAI_API_KEY = "";

interface ChatMessage {
    role: "system" | "user" | "assistant" | "function";
    content: string;
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

async function processarPDFs() {
    try {
        const conteudoTabela = fs.readFileSync("Tabela_dativos.txt", "utf8");

        // Base directory where classifier folders are stored.
        const baseDir = "./classificadores_train";

        // Get all classifier folders within the base directory and sort numerically.
        const pastaClassificadores = fs
            .readdirSync(baseDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .sort((a, b) => parseFloat(a) - parseFloat(b));

        // Iterate over each classifier folder.
        for (const pasta of pastaClassificadores) {
            const diretorioCompleto = path.join(baseDir, pasta);
            const pdfFiles = fs.readdirSync(diretorioCompleto).filter((file) => file.endsWith(".pdf"));

            // Array to hold each JSON output for the current classifier folder.
            const outputs: any[] = [];

            console.log(`Processing classifier folder: ${pasta}`);
            for (const fileName of pdfFiles) {
                const filePath = path.join(diretorioCompleto, fileName);
                let userContent: string;
                try {
                    userContent = await extractTextFromPDF(filePath);
                } catch (error) {
                    console.error(`Error extracting text from ${fileName}:`, error);
                    // Skip to the next PDF if text extraction fails.
                    continue;
                }

                // Define messages structure.
                const messages: ChatMessage[] = [
                    {
                        role: "system",
                        content: `Sua função é PERCORRER O PROCESSO JURÍDICO INTEIRO, INTERPRETAR O PROCESSO E CLASSIFICAR COM BASE NO ENTENDIMENTO JURÍDICO DO BRASIL E NA TABELA DE DATIVOS ADVOCATÍCIOS FORNECIDA. Para classificar o processo, utilize a tabela de classificadores fornecida, lembre-se de INTERPRETAR O PROCESSO. Além disso, extraia dados de um arquivo de texto e armazená-los em uma estrutura JSON, CERTIFIQUE-SE PARA SER UM FORMATO JSON POIS UM PARSE SERÁ APLICADO COM O OUTPUT. Para montar o JSON siga essa estrutura de INTERFACE: { n_processo?: string; classificador?: string; valor_fixado?: float; nome_advogado?: string; nome_juiz?: string; nome_apelado?: string; nome_apelante?: string; assinatura_valid?: boolean; assinatura_date?: string; }. 
                        Caso você não tenha certeza ou não encontre o dado requerido, NAO INVENTE DADOS, coloque como null. Normalmente há mais de um advogado nomeado para receber os dativos, se houver mais de 1 advogado, coloque o NOME dos dois ADVOGADOS dentro de um VETOR. FAÇA ISSO TAMBÉM PARA O VALOR, caso haja mais de um valor decorrente de mais de um advogado nomeado, coloque os valores em um VETOR. LEMBRE-SE, não retorne nenhuma justificstiva, apenas o JSON. Percebi que você está confundindo o classificador, quando na realidade é 1.2 voce classifica como 1.1, PRESTE ATENÇÃO. LMEBRE-SE DE SE ATENTAR AOS VALORES DE CADA ITEM, COMPARE COM O VALOR QUE VOCE EXTRAIU PARA DECIDIR O CODIGO CORRETO. OS DADOS SÃO: o CODIGO DO PROCESSO, VALOR FIXADO DATIVOS/HONORÁRIOS, NOME DO ADVOGADO, NOME DO JUIZ, NOME DO APELANTE, NOME DO APELADO, SE FOI ASSINADO PELO JUIZ, DATA DA ASSINATURA (YYYY-MM-DD) e, de acordo com a tabela providenciada abaixo, você deve classificar esse processo com 1 dos códigos fornecidos de acordo com a temática: ${conteudoTabela}`
                    },
                    {
                        role: "user",
                        content: `SENTENÇA: ${userContent}\n\n TABELA: ${conteudoTabela}\n`
                    },
                    {
                        role: "assistant",
                        content: '{ n_processo?: string; classificador?: string; valor_fixado?: string; nome_advogado?: string; nome_juiz?: string; nome_apelado?: string; nome_apelante?: string; assinatura_valid?: boolean; assinatura_date?: string; }'
                    }
                ];

                try {
                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${OPENAI_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: "ft:gpt-4o-mini-2024-07-18:leany-lean-ventures:fine-tuning-oab-2:BDB3WhNi",
                            messages: messages,
                            max_tokens: 150
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error("API Error:", errorText);
                        // Skip to next PDF if API error occurs.
                        continue;
                    }

                    const completion = (await response.json()) as OpenAIResponse;
                    let assistantData: any = null;

                    if (completion.choices && completion.choices.length > 0) {
                        const assistantContent = completion.choices[0].message.content;
                        try {
                            assistantData = JSON.parse(assistantContent);
                        } catch (jsonError) {
                            console.error("JSON Parse Error for PDF", fileName, ":", jsonError);
                            // Skip to next PDF if JSON parsing fails.
                            continue;
                        }
                    } else {
                        console.error("No choices returned for", fileName);
                        // Skip to next PDF if no choices returned.
                        continue;
                    }

                    // Replace "classificador" field with the folder name.
                    if (assistantData && typeof assistantData === "object") {
                        assistantData.classificador = pasta;
                    }

                    // Build final messages array, ensuring the assistant's content is a valid JSON string.
                    const finalMessages: ChatMessage[] = [
                        {
                            role: "system",
                            content: messages[0].content
                        },
                        {
                            role: "user",
                            content: messages[1].content
                        },
                        {
                            role: "assistant",
                            content: JSON.stringify(assistantData)
                        }
                    ];

                    outputs.push({
                        messages: finalMessages
                    });

                    console.log(`Processed PDF: ${fileName}`);
                } catch (error) {
                    console.error(`Error processing ${fileName}:`, error);
                    // Skip to the next PDF in case of error.
                    continue;
                }
            }
            //let pasta_2 = "1.1_2";
            // Write the outputs to a JSONL file for the current classifier folder.
            const outputFilePath = path.join(diretorioCompleto, `${pasta}.jsonl`);
            const outputStream = fs.createWriteStream(outputFilePath, { flags: "w" });
            outputs.forEach(item => {
                outputStream.write(JSON.stringify(item) + "\n");
            });
            outputStream.end();
            console.log(`Output written to ${outputFilePath}`);
        }
    } catch (error) {
        console.error("Error processing PDFs or constructing messages:", error instanceof Error ? error.toString() : String(error));
    }
}

processarPDFs();