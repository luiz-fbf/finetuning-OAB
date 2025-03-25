# Guia de Utilização do Projeto

Este documento apresenta um passo a passo para utilização dos scripts TypeScript disponíveis, dividido em três tópicos principais: Treino, Teste e Manutenção. Leia atentamente cada seção para compreender como utilizar e manter o sistema.

---

## Setup do Ambiente

1. **Instale o NVM**  
   Siga as instruções no repositório [nvm-sh/nvm](https://github.com/nvm-sh/nvm) para instalar o Node Version Manager (nvm).

2. **Inicialize o Ambiente com a Versão do Node**  
   No terminal, execute:
   ```bash
   nvm install 23
   nvm use 23
   ```

## Instalação das Dependências

No diretório do projeto, execute:
```bash
npm install
```

## Como Dar Start

Para iniciar a aplicação em modo de teste, execute:
```bash
npm run start-test
```
Para iniciar a aplicação em modo de train, execute:
```bash
npm run start-train
```
> Certifique-se de que a versão do Node esteja correta conforme o arquivo .nvmrc (se houver) ou conforme as recomendações do projeto.

---

## 1. Treino

O script de treinamento realiza o upload de um arquivo de treinamento e inicia o processo de fine tuning em um modelo da OpenAI.

### Passos:

1. **Configuração Inicial:**
   - Confirme que a chave de API do OpenAI (`OPENAI_API_KEY`) está correta.
   - Verifique se o arquivo de treinamento (por exemplo, `102_req.jsonl`) está na pasta apropriada.

2. **Upload do Arquivo:**
   - A função `uploadFile` utiliza o módulo `fs` para ler o arquivo e o `FormData` para preparar o envio.
   - Realiza um POST para `https://api.openai.com/v1/files` com o propósito de fine tuning.
   - O ID retornado será utilizado para identificar o arquivo de treinamento.

3. **Início do Fine Tuning:**
   - Com o ID do arquivo, a função `trainModel` envia uma requisição POST para `https://api.openai.com/v1/fine_tuning/jobs`.
   - São configurados os parâmetros do fine tuning, como o modelo, número de épocas (`n_epochs`), tamanho do batch e multiplicador da taxa de aprendizagem.

4. **Execução:**
   - Execute o script com `node Train.js` (ou o arquivo compilado para JavaScript, conforme sua configuração).
   - Verifique os logs para confirmar o envio do arquivo e o início do treinamento.

---

## 2. Teste

O script de teste foi atualizado para processar um arquivo JSONL com vários samples. Cada sample contém mensagens e o script extrai o conteúdo do usuário para construir uma estrutura de mensagens que será enviada à API da OpenAI.

### Passos:

1. **Configuração Inicial:**
   - Certifique-se de que a chave de API (`OPENAI_API_KEY`) esteja correta.
   - Garanta que os arquivos necessários estejam na pasta:
     - `Tabela_dativos.md`: contém a tabela de referência para a classificação.
     - `seu_arquivo.jsonl`: arquivo contendo vários samples no formato JSONL.

2. **Leitura dos Arquivos:**
   - O script lê o arquivo Markdown (`Tabela_dativos.md`) para compor a mensagem do sistema.
   - Em seguida, lê o arquivo JSONL (`samples.jsonl`) e divide-o em linhas, ignorando linhas vazias.

3. **Iteração e Montagem das Mensagens:**
   - Para cada linha do JSONL, o script converte o conteúdo em um objeto e busca a mensagem com `role: 'user'`.
   - A partir do conteúdo do usuário, é montada uma estrutura de mensagens que inclui:
     - Uma mensagem do sistema que orienta a extração dos dados e a classificação conforme a tabela fornecida.
     - A mensagem do usuário (conteúdo extraído do sample).
     - Uma mensagem do assistente com o formato JSON esperado.
   
4. **Chamada à API:**
   - Para cada sample, é feita uma chamada POST para `https://api.openai.com/v1/chat/completions` utilizando o modelo fine tuned.
   - O script exibe a resposta da API no console, permitindo verificar os dados extraídos.

5. **Execução:**
   - Execute o script com `node Teste.js` (ou o arquivo compilado para JavaScript).
   - Analise os outputs para confirmar se as extrações e classificações estão ocorrendo conforme esperado.

---

## 3. Manutenção

Esta seção trata dos testes adicionais utilizando o mesmo modelo, garantindo a integridade e a evolução do sistema.

### Passos:

1. **Testes Repetitivos:**
   - Utilize o script de teste para processar diferentes arquivos JSONL e validar a extração e classificação dos dados.
   - Verifique a consistência dos resultados ao alterar os samples ou a tabela de referência.

2. **Ajustes e Parametrizações:**
   - Se os resultados não estiverem conforme o esperado, revise a lógica de montagem das mensagens ou ajuste os parâmetros da chamada à API (como `max_tokens` e `temperature`).
   - Considere incrementar logs ou incluir mais validações para auxiliar na identificação de problemas.

3. **Atualização do Código:**
   - Após cada alteração ou ajuste, atualize a documentação e comente as mudanças para facilitar futuras manutenções.
   - Documente os resultados dos testes e quaisquer inconsistências encontradas para que possam ser revisadas.

4. **Registro de Alterações:**
   - Mantenha um changelog com as modificações realizadas, facilitando o acompanhamento da evolução do projeto e o retorno a versões anteriores se necessário.

---

## Considerações Finais

- **Dependências:** Instale todas as dependências necessárias (como `node-fetch`) via npm ou yarn.
- **Ambiente:** Utilize um ambiente de desenvolvimento controlado e versionado para garantir a reprodutibilidade dos testes e treinamentos.
- **Segurança:** Evite expor a chave da API em repositórios públicos e siga as melhores práticas de segurança.

---


