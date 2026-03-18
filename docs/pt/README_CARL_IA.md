# 🤖 Guia do Carl IA: Seu Assistente Autónomo - Creative Engine

O Carl IA não é apenas um chat; é um agente inteligente capaz de manipular o editor, criar arquivos e ajudá-lo a construir seu jogo passo a passo.

---

## 🚀 Como Ativar o Carl IA

Para abrir o painel do Carl:
1. **Botão Superior:** Clique no ícone do robô 🤖 (**Carl**) na barra de menu.
2. **Atalho:** Pressione `Shift + Ctrl + L`.

---

## ⚙️ Configuração (Chaves de API)

O Carl precisa de um "cérebro" para funcionar. Você deve configurar uma chave de API em **Editar > Preferências > IA**.

### Onde encontrar as Chaves de API?
- **Google Gemini (Recomendado/Grátis):** Vá ao [Google AI Studio](https://aistudio.google.com/app/apikey). Crie uma chave gratuita para o Gemini 1.5 Flash.
- **OpenAI (GPT):** Vá à [OpenAI Platform](https://platform.openai.com/api-keys). Requer saldo na sua conta.
- **Anthropic (Claude):** Vá à [Anthropic Console](https://console.anthropic.com/settings/keys).

**Instruções:** Selecione o provedor em Preferências, cole a chave e clique em **Guardar Chave**. Em seguida, escolha um modelo da lista.

---

## 🛠️ Habilidades Autónomas

Você pode pedir ao Carl para realizar tarefas reais no seu projeto. Exemplos do que você pode dizer:

- *"Crie um objeto chamado Jogador com um SpriteRenderer e Rigidbody2D."*
- *"Descarregue um fundo desta URL e coloque-o na minha cena."*
- *"Crie um script que mova o jogador com as setas."*
- *"Altere a cor de todos os meus inimigos para vermelho."*

### A Aba "Atividade" (Activity)
Quando o Carl propõe uma ação (ex: criar um objeto), ele gerará um **Plano de Ação**.
1. Clique no botão **"Ver Atividade"** que aparecerá no chat.
2. Você verá os passos detalhados que o Carl vai executar.
3. Dependendo do seu **Modo de Execução**, o Carl pedirá permissão ou fará sozinho.

---

## 🚦 Modos de Execução

Você pode alterar o comportamento do Carl a partir do menu suspenso no seu painel:

1. **Com Permissão (Seguro):** O Carl mostrará cada passo e você deverá clicar em "Aprovar" para que ele continue.
2. **Visual (Recomendado):** O Carl executa os comandos automaticamente, mas com uma pausa entre eles para que você veja o progresso na cena.
3. **Automático (Rápido):** O Carl realiza todo o plano de forma instantânea.

---

## 💡 Conselhos para falar com o Carl
- **Seja específico:** *"Crie um quadrado azul de 100x100"* é melhor do que *"Crie algo"*.
- **Use referências:** Você pode dizer *"Mova @last para a direita"*, onde `@last` se refere ao último objeto que o Carl criou.
- **Peça correções:** Se um script tiver um erro, cole-o no chat e diga *"Carl, corrija este erro de sintaxe"*.
