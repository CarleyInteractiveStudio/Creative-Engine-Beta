# 📜 Guia Mestre de Scripting (CES) - Creative Engine

O Creative Engine utiliza **CES (Creative Engine Script)**, uma linguagem poderosa baseada em JavaScript, mas simplificada para criadores de jogos. Este guia ensinará tudo, desde o básico até sistemas complexos.

---

## 🚀 Conceitos Fundamentais

### 1. A Importação Obrigatória
Todo script deve começar com a instrução para se conectar ao motor:
```ces
ve motor;
```

### 2. Acesso Direto (Sem Prefixos)
Ao contrário de outros motores, você NÃO precisa escrever `this.` ou `mtr.` para acessar os componentes de um objeto. Se o objeto tiver um `SpriteRenderer`, simplesmente escreva `renderizadorDeSprite`.

---

## 💎 Variáveis Públicas (Inspetor)
Para que uma variável apareça no Inspetor do editor, use a palavra-chave `publico`.

```ces
publico número velocidade = 5;
publico texto nomeJogador = "Herói";
publico booleano esInvencivel = falso;
publico Materia objetivo; // Aparecerá uma caixa para arrastar objetos
publico Sprite ícone;
publico Audio somSalto;
```

---

## ⏱️ Eventos de Ciclo de Vida
São funções que o motor chama automaticamente em momentos específicos.

```ces
// Executado uma única vez quando o objeto aparece no jogo
começar() {
    imprimir("Olá Mundo!");
}

// Executado a cada frame (aprox. 60 vezes por segundo)
atualizar(delta) {
    // delta é o tempo decorrido desde o último frame
}

// Executado em intervalos fixos (ideal para físicas)
actualizarFijo(delta) {
}

// Executado ao clicar no objeto
alHacerClick() {
}
```

---

## ⌨️ Entrada (Input) e Movimento
Controle seus personagens de forma simples.

```ces
atualizar(delta) {
    // Tecla pressionada (mantida)
    se (teclaPresionada("d")) {
        posicion.x += velocidade;
        inverterH = falso;
    }

    // Tecla recém-pressionada (um único pulso)
    se (teclaRecienPresionada("Space") e estaTocandoTag("Chão")) {
        fisica.applyImpulse(nuevo Vector2(0, -10));
    }

    // Mouse
    se (botonMouseRecienPresionado(0)) { // 0: Esquerdo, 1: Central, 2: Direito
        variável posMouse = obtenerPosicionMouse();
        imprimir("Clique em: " + posMouse.x + ", " + posMouse.y);
    }
}
```

---

## 🤖 Exemplos Práticos

### 🎮 Exemplo 1: Controlador de Personagem Completo
Este script lida com movimento, salto, animações e som.

```ces
ve motor;

publico número velocidade = 300;
publico número fuerzaSalto = 15;

atualizar(delta) {
    variável movX = 0;

    se (teclaPresionada("ArrowRight")) {
        movX = 1;
        inverterH = falso;
    } senão se (teclaPresionada("ArrowLeft")) {
        movX = -1;
        inverterH = verdadeiro;
    }

    // Mover usando o Rigidbody
    fisica.velocity.x = movX * (velocidade * delta);

    // Controle de Animações via Proxy
    se (movX != 0) {
        reproduzir.Caminar();
    } senão {
        reproduzir.Quieto();
    }

    se (teclaRecienPresionada("Space") e estaTocandoTag("Chão")) {
        fisica.applyImpulse(nuevo Vector2(0, -fuerzaSalto));
        reproduzir.Salto(); // Reproduz som ou animação
    }
}
```

---

## 🪄 Funções Especiais do Creative Engine

### ⏳ Corrotinas (Esperar)
Permite pausar a lógica de um script sem congelar o jogo.
```ces
começar() {
    imprimir("Iniciando contagem regressiva...");
    aguardar(3);
    imprimir("JÁ!");
}
```

### 🔁 Loops Temporizados (Cada)
Executa algo repetidamente a cada X segundos.
```ces
começar() {
    cada(1.5) {
        imprimir("Passou um segundo e meio");
        // Ideal para spawnar inimigos ou regenerar vida
    }
}
```
