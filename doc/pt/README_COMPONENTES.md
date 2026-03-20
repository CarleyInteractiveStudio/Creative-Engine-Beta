# 🧩 Guia de Componentes (Leis) - Creative Engine

No Creative Engine, as **Matérias** (objetos) ganham vida através das **Leis** (componentes). Cada Lei adiciona uma funcionalidade específica, como gravidade, renderização de imagem ou lógica de IA.

Este guia detalha o uso dos componentes tanto no **Inspetor** quanto nos **Scripts (.ces)** usando a sintaxe moderna (sem prefixos como `this.` ou `motor.`).

---

## 🏗️ 1. Componentes Base (Core)

### 📍 Transform (Transformação) / UITransform
Define a posição, rotação e escala de um objeto no espaço 2D.
- **Uso no Inspetor:** Edite os valores X e Y para mover o objeto. Use os botões de inversão (Flip) para inverter a imagem.
- **Scripting:**
  ```ces
  posicion.x += 5; // Move para a direita
  rotacion += 45;  // Roda 45 graus
  escala.x = 2;    // Duplica o tamanho horizontal
  voltearH = verdadeiro; // Inverte horizontalmente
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
- **Uso no Inspetor:** Arraste uma imagem para o campo "Source". Você pode alterar a cor para tingir a imagem ou ajustar a opacidade.
- **Scripting:**
  ```ces
  renderizadorDeSprite.color = "#00ff00"; // Tinge de verde
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

---

## ⚙️ 3. Físicas 2D

### ⚖️ Rigidbody2D (Física)
Permite que o objeto reaja à gravidade e colisões.
- **Uso no Inspetor:** Altere o tipo de corpo para "Dynamic" para que caia, ou "Kinematic" para movê-lo manualmente mas que detecte colisões.
- **Scripting:**
  ```ces
  fisica.applyImpulse(nuevo Vector2(0, -10)); // Salto
  fisica.velocity.x = 5; // Velocidade constante
  fisica.gravityScale = 0; // Desativa gravidade
  ```

### 📦 Colisores (Box, Circle, Capsule, Polygon, Line)
Definem a forma física para os choques.
- **BoxCollider2D:** Forma retangular.
- **CircleCollider2D:** Forma circular (raio).
- **CapsuleCollider2D:** Forma de cápsula (ideal para personagens).
- **LineCollider2D:** Cadeia de pontos para formas irregulares ou bordas.
- **PolygonCollider2D:** Polígono livre (usado automaticamente em terrenos).
- **Uso no Inspetor:** Ajusta o tamanho ou raio. Se marcar "Is Trigger", o objeto não colidirá fisicamente mas detectará quando algo entrar em sua área.

---

## 📱 7. Interface de Usuário (UI)

### 📊 ProgressBar (Barra de Progresso)
Ideal para barras de vida ou carga.
- **Uso no Inspetor:** Associe uma imagem de "Fill" (Preenchimento) e ajuste o valor atual.

---

## ⚔️ 8. Combate e Mecânicas

### ❤️ Health (Vida)
Gere a saúde do objeto e sua destruição ou animação ao morrer.
- **Scripting:**
  ```ces
  salud.currentHealth -= 10; // Receber dano
  ```

### ⚔️ Attack (Ataque)
Permite configurar múltiplos ataques com diferentes teclas, animações e dano.
