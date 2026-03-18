# 📜 Guia Mestre de Scripting (CES) - Creative Engine

O Creative Engine utiliza o **CES (Creative Engine Script)**, uma linguagem poderosa baseada em JavaScript, mas simplificada para criadores de jogos. Este guia ensinará tudo, desde o básico até sistemas complexos.

---

## 🚀 Conceitos Fundamentais

### 1. Importação Obrigatória
Cada script deve começar com a instrução para conectar-se ao motor:
```ces
motor motor;
```
*(Nota: você também pode usar `ve motor;`, pois são aliases)*

### 2. Acesso Direto (Sem Prefixos)
Ao contrário de outros motores, você NÃO precisa escrever `this.` ou `mtr.` para acessar os componentes do objeto. Se o objeto tiver um `SpriteRenderer`, basta escrever `renderizadorDeSprite`.

---

## 💎 Variáveis Públicas (Inspetor)
Para que uma variável apareça no Inspetor do editor, use a palavra-chave `público`.

```ces
público número velocidade = 5;
público texto nomeDoJogador = "Herói";
público booleano éInvencível = falso;
público matéria alvo; // Aparecerá uma caixa para arrastar e soltar objetos
público sprite ícone;
público áudio somDoPulo;
```

---

## ⏱️ Eventos de Ciclo de Vida
São funções que o motor chama automaticamente em momentos específicos.

```ces
// Executado uma vez quando o objeto aparece no jogo
começar() {
    log("Olá Mundo!");
}

// Executado a cada frame (aprox. 60 vezes por segundo)
atualizar(delta) {
    // delta é o tempo decorrido desde o último frame
}

// Executado em intervalos fixos (ideal para lógica de física)
actualizarFijo(delta) {
}

// Executado quando o objeto é clicado
onPointerClick() {
}
```

---

## ⌨️ Entrada & Movimento
Controle seus personagens facilmente.

```ces
atualizar(delta) {
    // Tecla pressionada (segurada)
    se (teclaPresionada("d")) {
        posição.x += velocidade;
        inverterH = falso;
    }

    // Tecla recém-pressionada (pulso único)
    se (teclaRecienPresionada("Space") && estaTocandoTag("Chão")) {
        fisica.applyImpulse(novo Vector2(0, -10));
    }

    // Mouse
    se (botonMouseRecienPresionado(0)) { // 0: Esquerdo, 1: Meio, 2: Direito
        qualquer posMouse = obtenerPosicionMouse();
        log("Clicou em: " + posMouse.x + ", " + posMouse.y);
    }
}
```

---

## 🪄 Funções Especiais do Creative Engine

### ⏳ Corrotinas (Aguardar)
Pausar a lógica do script sem travar o jogo.
```ces
começar() {
    log("Iniciando contagem regressiva...");
    aguardar(3);
    log("VAI!");
}
```

### 🔁 Loops Temporizados (Cada)
Repete algo a cada X segundos.
```ces
começar() {
    cada(1.5) {
        log("Passou um segundo e meio");
        // Ótimo para spawnar inimigos ou regenerar vida
    }
}
```
