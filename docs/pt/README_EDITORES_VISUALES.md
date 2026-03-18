# 🎨 Guia de Editores Visuais - Creative Engine

O Creative Engine inclui uma suite de ferramentas visuais para gerir gráficos, animações e níveis de forma intuitiva.

---

## ✂️ 1. Editor de Sprites (Sprite Slicer)

Permite recortar uma imagem grande em múltiplos sprites pequenos (útil para folhas de personagens ou tilesets).

- **Como Abrir:** Duplo clique em qualquer imagem (.png, .jpg) no Navegador de Assets.
- **Modos de Recorte:**
  - **Automático:** Deteta os bordos dos desenhos.
  - **Grid:** Divide a imagem em células iguais (ex: 32x32).
- **Pivôs:** Define o ponto central de cada sprite (ex: os pés de um personagem).

---

## 🎞️ 2. Editor de Animacões (.cea)

Crie sequências de imagens para os seus personagens ou objetos.

- **Como Abrir:** Duplo clique num ficheiro `.cea`.
- **Linha de Tempo:** Arraste sprites desde o navegador para a linha de tempo para adicionar fotogramas.
- **Cebola (Onion Skin):** Mostra o frame anterior e posterior de forma transparente para ajudá-lo a animar com fluidez.
- **Velocidade (FPS):** Ajusta quão rápido se reproduz a animação.

---

## 🎮 3. Controlador de Animação (StateMachine)

Gere a lógica de quando deve ser reproduzida cada animação (ex: Quieto -> Caminhar).

- **Como Abrir:** Duplo clique num ficheiro `.ceanim`.
- **Grafo Visual:** Clique com o botão direito para criar estados. Ligue estados arrastando de um nó para outro.
- **Smart Mode (Modo Inteligente):** Se o ativar, o motor detetará automaticamente se o personagem se move para cima, baixo, esquerda ou direita e reproduzirá a animação correspondente sem necessidade de programar.

---

## 🗺️ 4. Editor de Tilemaps (Mapas de Azulejos)

Desenhe níveis baseados em grelha de forma rápida.

- **Componente:** Adicione uma Lei de tipo **Tilemap** a uma Matéria.
- **Paletas:** Abra a janela **Paleta de Tiles** (Janela > Paleta de Tiles) e arraste o seu tileset.
- **Ferramentas:**
  - **Pincel:** Pinta azulejos individuais.
  - **Balde:** Preenche áreas grandes.
  - **Borracha:** Apaga azulejos.
- **Camadas:** Crie múltiplas camadas para ter fundos e decorações separadamente.
- **Colisões:** Adicione a Lei **TilemapCollider2D** para gerar colisões automáticas baseadas nos azulejos pintados.
