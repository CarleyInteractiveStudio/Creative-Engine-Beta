# 🏗️ Guia Avançado: Projetos, Cenas e Construção - Creative Engine

Este guia cobre os aspectos fundamentais da gestão de ativos, o design de níveis e a publicação final dos seus jogos.

---

## 📂 1. Estrutura de Projetos

Cada projeto no Creative Engine é guardado numa pasta independente com a seguinte estrutura:
- `/Assets`: Aqui residem todas as suas imagens, sons, vídeos e scripts.
- `/lib`: Pasta reservada para bibliotecas (.celib) que estendem o motor.
- `project.ceconfig`: Arquivo de configuração técnica (camadas, tags, metadados).
- `thumbnail.png`: Imagem de pré-visualização do projeto.

### Configuração do Projeto
Vá em **Editar > Configuração do Projeto** para:
- Alterar o nome e autor do jogo.
- Gerir as **Sorting Layers** (ordem de desenho por camadas).
- Definir **Collision Layers** e **Tags**.

---

## 🎬 2. Gestão de Cenas (.ceScene)

As cenas são mundos individuais que contêm matérias e configurações ambientais.

### Operações Básicas
- **Salvar Cena:** Use `Ctrl + S`. É crucial salvar para persistir a hierarquia de objetos.
- **Troca de Cena:** Duplo clique em qualquer arquivo `.ceScene` no navegador. Será perguntado se deseja salvar as alterações pendentes.
- **Miniatura de Cena:** Ao salvar, o motor captura automaticamente uma foto do que você vê para usar como ícone no navegador.

### Controle de Ambiente
Use o painel de **Controle de Ambiente** (Janela > Controle de Ambiente) para:
- Ajustar o ciclo dia/noite.
- Definir cores de luz ambiental.
- **Excluir camadas:** Evita que objetos como a interface de usuário sejam afetados pela escuridão.

---

## 📦 3. Importação e Pacotes (.cep)

### Importação de Ativos
1. **Arrastar e Soltar:** Você pode arrastar arquivos diretamente do seu PC para a área de grade do Navegador de Assets.
2. **Spine (Animação Esquelética):** Suporte oficial para importar esqueletos exportados do Spine em formato `.json`. Vá em **Arquivo > Importar Esqueleto**.

### Exportação de Pacotes
Clique com o botão direito em qualquer pasta dentro de `Assets` e escolha **Exportar Pacote**. Isso criará um arquivo `.cep` que agrupa todo o conteúdo (imagens, scripts vinculados, etc.) para que você possa movê-lo entre projetos facilmente.

---

## 🏗️ 4. O Sistema de Build (Publicação)

O processo de Build gera um pacote web independente (`.zip`) pronto para ser hospedado em servidores.

### Passos para um Build de Sucesso
1. Vá em **Arquivo > Build**.
2. **Cena Inicial:** Certifique-se de selecionar qual cena o jogador carregará primeiro.
3. **Otimização de Assets:**
   - Se desativar "Incluir todos os arquivos", o motor realizará uma análise de dependências para exportar **apenas** o que suas cenas precisam, economizando muito peso.
4. **Telas de Splash:** Você pode adicionar logos do seu estúdio que aparecerão antes de carregar o jogo.
5. **Geração:** Clique em "Construir Jogo". Você obterá um ZIP contendo o motor runtime, seus scripts transpilados e seus assets otimizados.

---

## 🏠 5. Sistema de Prefabs

Um **Prefab** é um modelo de um objeto que você pode reutilizar.
1. Crie um objeto e configure-o (coloque leis, scripts, filhos).
2. Arraste-o da **Hierarquia** para o **Navegador de Assets**.
3. Será criado um arquivo `.ceprefab`. Agora você pode arrastá-lo para qualquer cena para criar cópias idênticas.
4. **Modo Edição:** Duplo clique no `.ceprefab` para entrar no editor de prefabs isolado. As alterações aqui afetarão todas as instâncias futuras.
