# 🏗️ Projetos, Cenas e Publicação - Creative Engine

Este manual cobre a gestão técnica das suas criações, desde a estrutura de pastas até ao empacotamento final.

---

## 📂 1. Estrutura de um Projeto

Cada projeto é guardado na sua própria pasta com os seguintes itens:
- **/Assets:** Imagens, sons, scripts e cenas.
- **/lib:** Bibliotecas (.celib) que estendem o motor.
- **/doc:** Documentação local do projeto e manuais do motor.
- **project.ceconfig:** Configuração técnica (Camadas, Tags, metadados).
- **thumbnail.png:** Imagem de pré-visualização do projeto.

---

## 🎬 2. Gestão de Cenas (.ceScene)

Cenas são mundos independentes. Você pode ter níveis, menus e telas de carregamento.
- **Guardar:** `Ctrl + S`. Uma miniatura é capturada automaticamente.
- **Mudar de cena:** Clique duas vezes num arquivo `.ceScene` no Navegador.

---

## 📦 3. Prefabs (.ceprefab)

Um Prefab é um objeto pré-configurado que pode reutilizar.
- **Criar:** Arraste uma Matéria da Hierarquia para o Navegador de Assets.
- **Uso:** Arraste o arquivo `.ceprefab` para a cena para criar uma instância.

---

## 🏗️ 4. Sistema de Build e Exportação

### Exportar Assets (.cep)
Clique com o botão direito em qualquer pasta nos Assets e escolha **Exportar Pacote**. Isso cria um arquivo `.cep` comprimido, ideal para compartilhar.

### Build do Jogo
1. Vá em **Arquivo > Build**.
2. Selecione a cena inicial.
3. Configure os Splash Screens.
4. O motor gerará um arquivo `.zip` pronto para a web.
