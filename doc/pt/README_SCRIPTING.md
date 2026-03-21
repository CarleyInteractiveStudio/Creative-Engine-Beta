# 📔 O Livro Mestre do Scripting (CES) — Creative Engine

Bem-vindo, Criador! Você tem em mãos o guia definitivo para dominar o **Creative Engine**. Este não é apenas um manual técnico; é o seu mapa para a liberdade criativa. A linguagem **CES (Creative Engine Script)** foi forjada para que a distância entre a sua imaginação e o seu jogo seja a menor possível.

Neste "livro" digital, exploraremos desde os alicerces da lógica até as arquiteturas mais avançadas. Prepare-se, porque **programar é mais simples do que você imagina, e aqui demonstraremos o porquê**.

---

## 📖 Tabela de Conteúdos

0. [Capítulo 0: Seu Primeiro Script em 60 Segundos](#capítulo-0-seu-primeiro-script-em-60-segundos)
1. [Capítulo 1: A Filosofia do Motor](#capítulo-1-a-filosofia-do-motor)
2. [Capítulo 2: Anatomia de um Script](#capítulo-2-anatomia-de-um-script)
3. [Capítulo 3: Variáveis e o Inspetor Dinâmico](#capítulo-3-variáveis-e-o-inspetor-dinâmico)
4. [Capítulo 4: O Ritmo do Jogo (Ciclo de Vida)](#capítulo-4-o-ritmo-do-jogo-ciclo-de-vida)
5. [Capítulo 5: Interação Total (Input e Físicas)](#capítulo-5-interação-total-input-e-físicas)
6. [Capítulo 6: O Dicionário de Componentes (Referencia API)](#capítulo-6-o-dicionário-de-componentes-referencia-api)
7. [Capítulo 7: Comunicação entre Objetos (Mensagens Globais)](#capítulo-7-comunicação-entre-objetos-mensagens-globais)
8. [Capítulo 8: Magia Temporal (Corrotinas e Loops)](#capítulo-8-magia-temporal-corrotinas-e-loops)
9. [Capítulo 9: O Receituário de Soluções (Cookbook)](#capítulo-9-o-receituário-de-soluções-cookbook)
10. [Capítulo 10: Otimização e Melhores Práticas](#capítulo-10-otimização-e-melhores-práticas)
11. [Capítulo 11: Solução de Problemas e FAQ](#capítulo-11-solução-de-problemas-e-faq)

---

## ⚡ Capítulo 0: Seu Primeiro Script em 60 Segundos

Quer ver resultados agora? Siga estes passos:

1. No **Navegador de Assets**, clique com o botão direito e selecione **Novo > Script (CES)**. Nomeie como `OlaMundo.ces`.
2. Clique duas vezes para abrir e cole este código:
```ces
ve motor;

alEmpezar() {
    imprimir("O motor está vivo!");
}

alActualizar(delta) {
    rotacao += 100 * delta; // Fará o objeto girar!
}
```
3. Arraste esse arquivo da biblioteca para qualquer objeto (uma imagem ou um quadrado) na sua cena.
4. Clique em **Play**! 🚀

---

## 🏛️ Capítulo 1: A Filosofia do Motor

O Creative Engine nasceu sob uma premissa: **O código deve ser legível para humanos e potente para máquinas.**

Ao contrário de outros motores que o obrigam a lidar com milhares de linhas de "código lixo" (boilerplate), no CES cada linha conta. Eliminamos a necessidade de usar `this.`, `mtr.` ou prefixos redundantes.

**Importante!** Para que um script possa controlar algo (como a física ou a vida), o objeto **deve ter esse componente adicionado**. Se você quiser usar `fisica`, certifique-se de adicionar um `Rigidbody2D` ao objeto no Inspetor.

---

## 🦴 Capítulo 2: Anatomia de um Script

Todo script no Creative Engine começa com uma declaração de intenção:

```ces
ve motor;
```

Esta linha não é opcional; é a ponte que conecta o seu arquivo de texto ao coração do motor. A partir daqui, o seu script torna-se uma "Lei" que rege o comportamento de uma "Matéria" (objeto).

---

## 💎 Capítulo 3: Variáveis e o Inspetor Dinâmico

O poder do Creative Engine reside no seu **Inspetor**. Ao declarar variáveis como `publico`, elas aparecem magicamente na interface do editor, permitindo que você ajuste o jogo enquanto ele roda.

### Tipos de Dados Suportados:
- **`numero`**: Para velocidades, forças, saúde, etc.
- **`texto`**: Para nomes, diálogos ou IDs.
- **`booleano`**: Interruptores de `verdadeiro` o `falso`.
- **`Materia`**: Para referenciar outros objetos da cena.
- **`Prefab`**: Para instanciar (criar) objetos novos (como balas ou inimigos).
- **`Audio` / `Sprite` / `Scene`**: Referências a recursos do projeto.

```ces
publico numero forçaSalto = 12;
publico booleano podeVoar = falso;
publico Materia camaraObjetivo;
```

---

## ⏱️ Capítulo 4: O Ritmo do Jogo (Ciclo de Vida)

Um jogo es uma ilusão criada por imagens que mudam rapidamente. O seu script vive dentro desse batimento:

1. **`alEmpezar()` / `começar()`**: Sua oportunidade de ouro para configurar o objeto. Executa apenas uma vez.
2. **`alActualizar(delta)` / `atualizar(delta)`**: Ocorre aproximadamente 60 vezes por segundo. Aqui é onde você processa o movimento e a lógica constante.
3. **`actualizarFijo(delta)`**: O motor de física roda aqui. Use-o para forças constantes para evitar que os objetos "atravessem" paredes.
4. **`alHacerClick()` / `alPresionar()`**: A resposta direta ao toque do jogador.

---

## ⌨️ Capítulo 5: Interação Total (Input e Físicas)

O motor entende os seus comandos de forma natural. Seja teclado, mouse ou gamepad, a API é consistente:

```ces
atualizar(delta) {
    // Teclado
    se (teclaPresionada("w")) {
        fisica.applyForce(0, -100);
    }

    // Mouse
    se (botonMouseRecienPresionado(0)) {
        variavel pos = obtenerPosicionMouse();
        imprimir("Clique em: " + pos.x + "," + pos.y);
    }
}
```

---

## 📦 Capítulo 6: O Dicionário de Componentes (Referencia API)

Aqui estão os atalhos mais comuns que o motor lhe oferece (desde que o objeto tenha o componente correspondente):

- **`posicao` / `posição`**: O ADN do objeto. Controla `x`, `y`, `rotacao` e `escala`.
- **`fisica` (Rigidbody2D)**: O motor de Newton. Use `applyImpulse` para saltos e `velocity` para correr.
- **`saude` / `vida`**: Gere a mortalidade. Use `damage(10)` ou `heal(5)`.
- **`animador` / `animacion`**: O diretor de cinema. Use `play("Correr")` para mudar de estado.
- **`audio` / `sonido`**: A voz do objeto. Use `play()` ou `stop()`.

---

## 📡 Capítulo 7: Comunicación entre Objetos (Mensagens Globais)

Esqueça procurar objetos por toda a hierarquia. O sistema de **Mensagens Globais** permite que os seus scripts falem entre si sem se conhecerem.

**Emissor:**
```ces
difundir("NivelCompletado", { tiempo: 45 });
```

**Recetor:**
```ces
alEmpezar() {
    alRecibir("NivelCompletado", (dados) => {
        imprimir("Parabéns! Você conseguiu em " + dados.tiempo + " segundos.");
    });
}
```

---

## 🪄 Capítulo 8: Magia Temporal (Corrotinas e Loops)

### A arte da espera (`aguardar`)
No CES, você pode pausar a lógica de um script sin congelar o jogo. Isso é vital para cinemáticas ou efeitos.

```ces
async começar() {
    imprimir("3...");
    aguardar(1);
    imprimir("2...");
    aguardar(1);
    imprimir("1...");
    aguardar(1);
    imprimir("FOGO!");
}
```

### O poder da repetição (`cada`)
Precisa gerar uma moeda a cada 5 segundos? Não use contadores manuais complicados:

```ces
começar() {
    cada(5) {
        criar moedaPrefab;
    }
}
```

---

## 🍳 Capítulo 9: O Receituário de Soluções (Cookbook)

### 🏃 Sistema de Movimento de Plataformas Pro
*(Requer componentes: Rigidbody2D, BoxCollider2D)*
```ces
ve motor;
publico numero velocidade = 10;
publico numero forçaSalto = 12;

atualizar(delta) {
    variavel horizontal = 0;
    se (teclaPresionada("d")) horizontal = 1;
    se (teclaPresionada("a")) horizontal = -1;

    // Movimento direto de física
    fisica.velocity.x = horizontal * velocidade;

    se (horizontal != 0) {
        inverterH = (horizontal < 0);
        reproducir.Caminhar();
    } senao {
        reproducir.Idle();
    }

    se (teclaRecienPresionada("Space") e estaTocandoTag("Chão")) {
        fisica.applyImpulse(novo Vector2(0, -forçaSalto));
    }
}
```

### 🎯 Sistema de Disparo com Cooldown
```ces
ve motor;
publico Prefab bala;
publico numero cadencia = 0.5;
numero tiempoProximoDisparo = 0;

atualizar(delta) {
    se (teclaPresionada("f") e tempoProximoDisparo <= 0) {
        criar bala;
        tiempoProximoDisparo = cadencia;
        reproducir.Disparo();
    }

    se (tiempoProximoDisparo > 0) {
        tiempoProximoDisparo -= delta;
    }
}
```

### 🔘 Botão UI Interativo
*(Requer componentes: Button, UIText)*
```ces
ve motor;
publico texto mensagemAoClicar = "Olá!";

alHacerClick() {
    texto.text = mensajeAoClicar;
    reproducir.ClickSound();
    imprimir("Botão pressionado");
}
```

---

## ⚙️ Capítulo 10: Otimização e Melhores Práticas

Para que o seu jogo corra a 60 FPS mesmo em telemóveis, siga estes conselhos:

1. **Use `delta`**: Multiplique sempre os seus movimentos por `delta` se você alterar a `posição` diretamente. Se você usar `fisica.velocity`, o motor se encarrega.
2. **Evite `buscar()` em `atualizar`**: Procurar objetos por nome é lento. Faça-o em `começar` e guarde o resultado numa variável.
3. **Pooling**: Em vez de destruir e criar centenas de balas, tente reutilizá-las.
4. **Camadas de Colisão**: Configure nos ajustes do projeto quais objetos colidem com quais para poupar processador.

---

## 🛠️ Capítulo 11: Solução de Problemas e FAQ

**P: Meu script lança um erro "Cannot read properties of undefined (reading 'velocity')".**
R: Este erro ocorre quando você tenta acessar `fisica` mas o objeto não tem um componente **Rigidbody2D**. Certifique-se de adicioná-lo no Inspetor.

**P: O script não responde às minhas teclas.**
R: Certifique-se de que o script tenha a linha `ve motor;` no início e que não haja erros de sintaxe no Console.

**P: Como acesso a vida de outro objeto?**
R: Primeiro obtenha a referência (ex: `variavel obj = buscar("Inimigo");`) e use `obj.saude.damage(10);`.

---

## 🎉 Epílogo: Sua Jornada Começa Agora

Você terminou o Livro Mestre, mas a sua história como desenvolvedor apenas começa. **Creative Engine** é a tela, e você é o artista.

Não tenha medo de experimentar. Quebre as regras, combine componentes e, acima de tudo, **divirta-se**. Se você pode imaginá-lo, você pode programá-lo aqui.

---
*Dúvidas? Consulte o [Guia de Componentes](README_COMPONENTES.md) ou junte-se à nossa comunidade oficial.*
