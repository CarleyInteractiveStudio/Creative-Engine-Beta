# 🚀 Guia de Início Rápido: Projetos e Cenas - Creative Engine

Este guia cobre os aspectos fundamentais da gestão de ativos, design de níveis e publicação final para os seus jogos.

---

## 📂 1. Estrutura do Projeto

Cada projeto no Creative Engine é guardado numa pasta dedicada:
- `/Assets`: Todas as suas imagens, sons, vídeos e scripts.
- `/lib`: Pasta para bibliotecas (.celib) que estendem o motor.
- `project.ceconfig`: Ficheiro de definições técnicas (camadas, etiquetas, metadados).
- `thumbnail.png`: Imagem de pré-visualização do projeto.

---

## 🎬 2. Gestão de Cenas (.ceScene)

As cenas são mundos individuais que contêm materiais e definições de ambiente.

### Operações Básicas
- **Guardar Cena:** Use `Ctrl + S`.
- **Alternar Cenas:** Clique duas vezes em qualquer ficheiro `.ceScene` no navegador.
- **Miniatura da Cena:** O motor tira automaticamente uma captura de ecrã para o ícone ao guardar.

---

## 📦 3. Importação e Pacotes (.cep)

### Importar Ativos
1. **Drag and Drop:** Arraste ficheiros diretamente do seu PC para o navegador de ativos.
2. **Spine (Animação Esquelética):** Suporta a importação do Spine no formato `.json`.

### Exportar Pacotes
Clique com o botão direito em qualquer pasta em `Assets` e selecione **Exportar Pacote**. Isto cria um ficheiro `.cep` para facilitar a transferência entre projetos.

---

## 🏗️ 4. Sistema de Build

O build cria um pacote web independente (`.zip`) pronto para ser alojado em servidores.

1. Vá a **Ficheiro > Build**.
2. Selecione a cena inicial.
3. Configure os Splash Screens.
4. Clique em "Build Game".
