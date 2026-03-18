# 📜 Guia Mestre de Scripting (CES) - Creative Engine

O Creative Engine utiliza o **CES (Creative Engine Script)**, uma linguagem poderosa baseada em JavaScript, mas simplificada para criadores de jogos.

---

## 🚀 Conceitos Fundamentais

### 1. Importação Obrigatória
Cada script deve começar com a instrução de conexão:
```ces
motor motor;
```
*(Nota: Você também pode usar `ve motor;` pois são aliases)*

### 2. Acesso Direto (Sem Prefixos)
Ao contrário de outros motores, você NÃO precisa escrever `this.` ou `mtr.` para acessar os componentes de um objeto. Se o objeto tiver um `SpriteRenderer`, basta escrever `renderizadorDeSprite`.

---

## 💎 Variáveis Públicas (Inspetor)
Para que uma variável apareça no Inspetor do editor, use a palavra-chave `público`.

```ces
público número velocidade = 5;
público texto nomeDoJogador = "Herói";
público booleano éInvencível = falso;
público matéria alvo; // Aparecerá um campo para arrastar objetos
público sprite ícone;
público áudio somDoPulo;
público prefab inimigo;
público cena proximoNivel;
```

---

## ⏱️ Eventos de Ciclo de Vida
Funções chamadas automaticamente em momentos específicos.

```ces
// Executado uma vez quando o objeto aparece no jogo
começar() {
    log("Olá Mundo!");
}

// Executado a cada frame (aprox. 60 vezes por segundo)
atualizar(delta) {
    // delta é o tempo decorrido desde o último frame
}
```

---

## 🪄 Funções Especiais e Proxy

### ⏳ Corrotinas (Aguardar)
Pausa a lógica sem travar o jogo.
```ces
começar() {
    aguardar(3);
    log("3 segundos se passaram!");
}
```

### 🔁 Loops Temporizados (Cada)
```ces
começar() {
    cada(1.5) {
        log("Criando inimigo...");
        criar inimigoPrefab;
    }
}
```

### 🎭 Proxy de Animação e Som
Chame estados ou clipes diretamente pelo nome:
```ces
reproduzir.Caminhar(); // No AnimatorController
play.Jump();           // Alias em inglês
reproduzir.Explosao(); // No AudioSource
```
