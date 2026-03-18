# 🧩 Guia de Componentes (Leis) - Creative Engine

No Creative Engine, as **Matérias** (objetos) ganham vida através das **Leis** (componentes). Cada Lei adiciona uma funcionalidade específica, como gravidade, renderização de imagem ou lógica de IA.

Este guia detalha o uso dos componentes tanto no **Inspetor** quanto nos **Scripts (.ces)** utilizando a sintaxe moderna (sem prefixos como `this.` ou `motor.`).

---

## 🏗️ 1. Componentes Base (Core)

### 📍 Transform (Transformação)
Define a posição, rotação e escala de um objeto no espaço 2D.
- **Uso no Inspetor:** Edite os valores X e Y para mover o objeto. Use os botões de inversão (Flip) para inverter a imagem.
- **Scripting:**
  ```ces
  posicion.x += 5; // Move para a direita
  rotacion += 45;  // Roda 45 graus
  escala.x = 2;    // Duplica o tamanho horizontal
  inverterH = verdadero; // Inverte horizontalmente
  ```

### 🎥 Camera (Câmera)
Define a área visível do jogo.
- **Uso no Inspetor:** Configura a cor de fundo, o zoom e a máscara de camadas (Culling Mask) para decidir quais objetos esta câmera vê.
- **Scripting:**
  ```ces
  camara.orthographicSize = 10; // Altera o zoom
  camara.backgroundColor = "#ff0000"; // Fundo vermelho
  ```

---

## 🖼️ 2. Renderização e Visuais

### 🖼️ SpriteRenderer (Renderizador de Sprite)
Mostra uma imagem (.png, .jpg) ou um quadro de uma folha de sprites (.ceSprite).
- **Uso no Inspetor:** Arraste uma imagem para o campo "Source". Pode alterar a cor para tingir a imagem ou ajustar a opacidade.
- **Scripting:**
  ```ces
  renderizadorDeSprite.color = "#00ff00"; // Tingir de verde
  renderizadorDeSprite.opacity = 0.5;      // Semi-transparente
  renderizadorDeSprite.spriteName = "Salto"; // Altera o sprite (se for .ceSprite)
  ```

### 🌊 Water (Água)
Simulação física de fluidos baseada em partículas.
- **Uso no Inspetor:** Define a largura e altura da área de água. Ajusta a densidade (flutuação) e viscosidade.
- **Scripting:**
  ```ces
  agua.densidad = 2.0; // Os objetos flutuarão mais
  agua.mostrarMareas = verdadero;
  ```

### 🎞️ VideoPlayer (Reprodutor de Vídeo)
Reproduz arquivos de vídeo no mundo ou na UI.
- **Uso no Inspetor:** Suporta formatos .mp4 e .webm. Pode ativar o loop e ajustar o volume.
- **Scripting:**
  ```ces
  reproductorDeVideo.reproducir();
  reproductorDeVideo.pausar();
  reproductorDeVideo.volumen = 0.8;
  ```

---

## ⚙️ 3. Físicas 2D

### ⚖️ Rigidbody2D (Física)
Permite que o objeto reaja à gravidade e colisões.
- **Uso no Inspetor:** Altere o tipo de corpo para "Dynamic" para que caia, ou "Kinematic" para movê-lo manualmente mas que detete colisões.
- **Scripting:**
  ```ces
  fisica.applyImpulse(nuevo Vector2(0, -10)); // Salto
  fisica.velocity.x = 5; // Velocidade constante
  fisica.gravityScale = 0; // Desativa gravidade
  ```

### 📦 BoxCollider2D / CircleCollider2D (Colisores)
Definem a forma física para os choques.
- **Uso no Inspetor:** Ajusta o tamanho ou raio. Se marcar "Is Trigger", o objeto não chocará mas detetará quando algo entrar na sua área.
- **Scripting:**
  ```ces
  si (estaTocandoTag("Suelo")) {
      imprimir("No chão");
  }
  ```

---

## 🤖 4. Inteligência e Movimento

### 🧠 BasicAI (IA Básica)
Comportamentos automáticos para NPCs e inimigos.
- **Modos:**
  - **Follow:** Segue uma Matéria alvo.
  - **Escape:** Foge de um alvo.
  - **Wander:** Caminha aleatoriamente.
- **Scripting:**
  ```ces
  iaBasica.speed = 250;
  iaBasica.behavior = "Follow";
  iaBasica.target = buscar("Jugador");
  ```

### 👮 Patrol (Patrulha)
Move o objeto entre dois pontos.
- **Scripting:**
  ```ces
  patrulla.distancia = 500;
  patrulla.velocidad = 100;
  ```

---

## 📱 5. Interface de Utilizador (UI)

### 🖼️ Canvas (Lienzo)
O contentor principal para todos os elementos de interface.
- **Scripting:**
  ```ces
  lienzo.scaleChildren = verdadero;
  ```

### 🔘 Button (Botão)
Deteta cliques do utilizador.
- **Uso no Inspetor:** Permite definir cores para os estados (Normal, Pressionado, Desativado) ou alterar sprites.
- **Scripting:**
  ```ces
  alHacerClick() {
      imprimir("Botão pressionado!");
  }
  ```

### 📝 UIText (Texto UI)
Mostra texto no ecrã com fontes personalizadas.
- **Scripting:**
  ```ces
  textoUI.text = "Pontos: " + puntos;
  textoUI.fontSize = 40;
  ```

---

## 🎬 6. Animação e Áudio

### 🎮 AnimatorController (Controlador)
Gere estados de animação (Caminhar, Saltar, Quieto).
- **Uso no Inspetor:** Requer um ficheiro `.ceanim`. O "Smart Mode" anima automaticamente segundo o movimento do Rigidbody2D ou do componente Movement.
- **Scripting:**
  ```ces
  controlador.play("Atacar"); // Força um estado
  ```

### 🔊 AudioSource (Fonte de Áudio)
Reproduz efeitos de som ou música.
- **Uso no Inspetor:** Suporta **Áudio Espacial** (o volume baixa se o objeto se afasta da câmara).
- **Scripting:**
  ```ces
  fuenteDeAudio.reproducir();
  fuenteDeAudio.loop = verdadero;
  reproducir.Explosion(); // Atalho proxy (reproduz som por nome)
  ```

---

## 📡 7. Outros Componentes

- **RaycastSource (Rallo):** Lança raios invisíveis para detetar paredes ou inimigos à frente.
- **ParticleSystem (Partículas):** Cria efeitos de fogo, fumo ou faíscas usando um prefab como base.
- **Parallax:** Cria fundos infinitos que se movem a diferente velocidade para dar profundidade.
- **Light2D (Luzes):** Ilumina a sua cena com luzes pontuais, focais ou formas livres.

---

## 💡 Pro-Tip de Scripting

Lembre-se que no **Creative Engine**, pode aceder a qualquer componente diretamente pelo seu nome em espanhol. Não precisa de usar prefixos.

**Exemplo de um script completo:**
```ces
ve motor;

publico numero fuerzaSalto = 12;

alActualizar(delta) {
    si (teclaRecienPresionada("Space") y estaTocandoTag("Suelo")) {
        fisica.applyImpulse(nuevo Vector2(0, -fuerzaSalto));
        reproducir.Salto(); // Chama o som ou animação
    }
}
```
