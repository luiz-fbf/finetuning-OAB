import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const OPENAI_API_KEY = "";

// Função para fazer upload do arquivo e retornar seu id
async function uploadFile(filePath: string): Promise<string> {
  const form = new FormData();
  form.append("purpose", "fine-tune");
  form.append("file", fs.createReadStream(filePath));

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      ...form.getHeaders()
    },
    body: form
  });
  const data = await response.json();
  console.log("Arquivo enviado, id:", data.id);
  return data.id;
}

// Função para iniciar o fine tuning utilizando o id do arquivo de treinamento
async function trainModel(trainingFileId: string) {
  const response = await fetch("https://api.openai.com/v1/fine_tuning/jobs", {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "ft:gpt-4o-mini-2024-07-18:leany-lean-ventures:fine-tuning-oab-2:BDB3WhNi",
      training_file: trainingFileId,
      suffix: "Fine-Tuning-OAB",
      method: {
        type: "supervised",
        supervised: {
          hyperparameters: {
            n_epochs: 5,
            batch_size: 8,
            learning_rate_multiplier: 0.00002
          }
        }
      }
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

// Função principal que junta upload e treinamento
async function main() {
  try {
    // Substitua pelo caminho correto do arquivo de treinamento
    const fileId = await uploadFile("102_req.jsonl"); // TROQUE O ARQUIVO JSONL PELO SEU ARQUIVO DESEJADO
    await trainModel(fileId);
  } catch (error) {
    console.error("Erro no processo:", error);
  }
}

main();
