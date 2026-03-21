# 📜 Guia Mestre de Scripting (CES) - Creative Engine

Bem-vindo à fronteira da criação! No **Creative Engine**, o scripting não é um obstáculo, mas o seu superpoder. A linguagem **CES (Creative Engine Script)** foi projetada para ser intuitiva, poderosa e, acima de tudo, **mais simples do que você imagina**.

Este guia levará você pela mão desde o seu primeiro "Olá Mundo!" até sistemas complexos de nível profissional. Prepare-se para dar vida às suas ideias!

---

## 🚀 1. Seu Primeiro Passo: A Conexão com o Motor

Todo grande projeto começa com uma simples linha. No CES, dizemos ao script para se conectar às funções vitais do motor:

```ces
ve motor;
```
*Dica: Você também pode usar `go motor;` se preferir um tom mais dinâmico. Você escolhe!*

### Por que o CES é diferente?
Ao contrário de outros motores onde você tem que escrever `this.transform.position.x`, no Creative Engine eliminamos a burocracia:
- **Sem `this.`**: Acesse as propriedades do objeto diretamente.
- **Sem prefixos complexos**: Se o seu objeto tem um componente `Saúde`, basta escrever `saude.valor = 100`.
- **Bilíngue**: Você prefere `posicao` ou `position`? O motor entende ambos!

---

## 💎 2. Variáveis Públicas: O Inspetor é seu Amigo

Variáveis públicas permitem que você (ou seus designers) ajustem valores diretamente no editor sem tocar no código.

```ces
publico numero velocidade = 5;
publico texto mensagem = "Cuidado!";
publico booleano eHeroi = verdadeiro;
publico Materia objetivo;        // Arraste qualquer objeto aqui
publico Sprite icone;           // Escolha uma imagem
publico Audio somExplosao;      // Escolha um som
publico Prefab balaPrefab;      // Um objeto reutilizável
publico Scene proximoNivel;     // Uma cena completa
```

---

## ⏱️ 3. O Ciclo de Vida: O Coração do seu Jogo

Seu script responde a eventos automáticos que ocorrem em momentos-chave:

- **`alEmpezar()` / `começar()`**: Executa uma única vez quando o objeto nasce. Ideal para configurar valores iniciais.
- **`alActualizar(delta)` / `atualizar(delta)`**: O coração do script. Executa a cada frame. `delta` é o tempo exato entre frames, use-o para que o movimento seja suave.
- **`actualizarFijo(delta)`**: Ideal para físicas pesadas. Executa em intervalos constantes.
- **`alHacerClick()`**: Ativado quando o usuário toca ou clica no objeto.

---

## ⌨️ 4. Controle de Entrada (Input) e Movimento

Mover um personagem é tão natural quanto falar:

```ces
atualizar(delta) {
    // Movimento Horizontal Simples
    se (teclaPresionada("d")) {
        posicion.x += velocidade * delta;
        inverterH = falso; // Olha para a direita
    }
    se (teclaPresionada("a")) {
        posicion.x -= velocidade * delta;
        inverterH = verdadeiro; // Olha para a esquerda
    }

    // Salto com um único toque
    se (teclaRecienPresionada("Space") e estaTocandoTag("Chão")) {
        fisica.applyImpulse(novo Vector2(0, -12));
        reproducir.Salto(); // Chama a animação "Salto" instantaneamente!
    }
}
```

---

## 📦 5. Referência de Componentes (Modo Especialista)

O motor cria automaticamente acessos rápidos a todos os componentes do objeto. Aqui está a lista mestra:

| Componente | Acesso (Alias) | Funções Chave |
| :--- | :--- | :--- |
| **Transform** | `posicao`, `posição` | `x`, `y`, `rotacao`, `escala`, `mirarA(x,y)` |
| **Rigidbody2D** | `fisica`, `física` | `applyForce(x,y)`, `applyImpulse(x,y)`, `velocity` |
| **SpriteRenderer**| `renderizadorDeSprite` | `color`, `opacity`, `spriteName` |
| **Animator** | `animador`, `animacion` | `play(nome)`, `stop()`, `crossfade(nome, tempo)` |
| **Health** | `vida`, `saude` | `damage(quantidade)`, `heal(quantidade)`, `isDead` |
| **AudioSource** | `som`, `audio` | `play()`, `stop()`, `volumen`, `bucle` |
| **Attack** | `ataque` | `executeAttack(atk)`, `cooldown` |
| **ProgressBar** | `barra`, `barraProgresso` | `value`, `maxValue`, `materiaObjetivo` |

---

## 📡 6. Comunicação: Mensagens Globais

Quer que todos os inimigos morram quando o chefe é derrotado? Não procure referências complexas, use **Mensagens**.

**No Chefe:**
```ces
alMorir() {
    difundir("ChefeDerrotado", { bonus: 500 });
}
```

**Em qualquer outro script:**
```ces
começar() {
    alRecibir("ChefeDerrotado", (dados) => {
        imprimir("Vitória! Bônus: " + dados.bonus);
        destruir(mtr); // O objeto se auto-destrói
    });
}
```

---

## 🪄 7. Funções Mágicas e Corrotinas

### ⏳ Corrotinas (`aguardar`)
Pausa a execução sem parar o jogo. Perfeito para sequências:
```ces
async começar() {
    imprimir("Iniciando sequência...");
    aguardar(2);
    imprimir("Passaram-se 2 segundos!");
    reproducir.Explosao();
}
```

### 🔁 Loops Temporizados (`cada`)
Cria eventos periódicos de forma limpa:
```ces
começar() {
    cada(3) { // A cada 3 segundos
        criar inimigoPrefab;
        imprimir("Um novo inimigo apareceu.");
    }
}
```

---

## 🍳 8. O Receituário (Cookbook)

### 🏃 Salto Duplo Profissional
```ces
ve motor;
publico numero saltosMaximos = 2;
numero saltosRestantes = 2;

atualizar(delta) {
    se (estaTocandoTag("Chão")) {
        saltosRestantes = saltosMaximos;
    }

    se (teclaRecienPresionada("Space") e saltosRestantes > 0) {
        fisica.velocity.y = -10; // Impulso vertical
        saltosRestantes -= 1;
        reproducir.Salto();
    }
}
```

### 🎥 Câmera Suave (Smooth Follow)
```ces
ve motor;
publico Materia objetivo;
publico numero suavizacao = 0.125;

atualizar(delta) {
    se (objetivo) {
        variable posDesejada = { x: objetivo.posicion.x, y: objetivo.posicion.y };
        posicion.x += (posDesejada.x - posicion.x) * suavizacao;
        posicion.y += (posDesejada.y - posicion.y) * suavizacao;
    }
}
```

### 🎒 Sistema de Inventário Simples
```ces
ve motor;
variable inventario = [];

alEntrarEnColision(outro) {
    se (outro.tieneTag("Item")) {
        inventario.push(outro.nombre);
        imprimir("Coletado: " + outro.nombre + ". Total: " + inventario.length);
        destruir(outro);
    }
}
```

---

## ⚙️ 9. Sob o Capô: O Transpilador

O motor utiliza um sistema de **Transpilação Inteligente**. Isso significa que quando você escreve em CES, o motor traduz seu código para JavaScript otimizado de alto desempenho em tempo real.

- **Segurança**: O motor detecta erros antes de rodar o jogo.
- **Velocidade**: Executa nativamente no navegador sem camadas pesadas.
- **Flexibilidade**: Se você é um especialista, pode usar qualquer função do JavaScript dentro de seus scripts CES.

---

## 🎨 10. Conclusão: Seu limite é sua imaginação!

O scripting no **Creative Engine** foi projetado para que você foque no divertido: **criar**. Não se preocupe com a sintaxe perfeita no início; o motor ajudará você no caminho.

Lembre-se: **Cada grande jogo começou com uma única linha de código.** Qual será a sua?

> "Programação não é sobre o que você sabe; é sobre o que você pode imaginar."

---
*Precisa de mais ajuda? Visite nossa comunidade no Discord ou consulte o [Guia de Componentes](README_COMPONENTES.md).*
