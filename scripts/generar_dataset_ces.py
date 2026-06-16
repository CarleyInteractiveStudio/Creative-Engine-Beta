import random
import os

# Configuración
OUTPUT_DIR = "Dataset_Entrenamiento_IA"
TOTAL_CODES = 50000
CODES_PER_FILE = 5000

# Diccionarios de aleatoriedad expandidos
NOMBRES = ["jugador", "enemigo", "bala", "moneda", "tesoro", "puerta", "npc", "jefe", "proyectil", "heroe", "mago", "guerrero", "arquero", "cofre", "pocion", "plataforma", "trampa", "activador", "particula", "luz", "camara", "gestor", "mapa", "nivel", "puntuacion"]
TECLAS = ["space", "enter", "shift", "ctrl", "alt", "w", "a", "s", "d", "e", "f", "q", "r", "up", "down", "left", "right", "t", "g", "z", "x", "c", "v", "b", "n", "m"]
TAGS = ["Suelo", "Pared", "Enemigo", "Jugador", "Agua", "Item", "Peligro", "Meta", "Checkpoint", "Obstaculo", "Aliado", "ZonaSegura", "PuertaCerrada", "Interruptor", "Coleccionable", "Boss", "Nube", "Fuego", "Hielo"]
ANIMACIONES = ["Caminar", "Correr", "Salto", "Caida", "Atacar", "Morir", "Dano", "Quieto", "Inactivo", "Especial", "Bloquear", "Huir", "Celebrar", "Cargar", "Disparar", "Golpear"]
SONIDOS = ["Salto", "Golpe", "Muerte", "Explosion", "Moneda", "Click", "Paso", "Vuelo", "Motor", "Alerta", "Curar", "SubirNivel", "Error", "Exito", "Ambiente"]
MATES = ["seno", "coseno", "tangente", "valorAbsoluto", "redondear", "raizCuadrada"]

# Plantillas por categoría (Versión 2.0 - Más complejas)
PLANTILLAS = {
    "Movimiento": [
        """ve motor;
// Script de movimiento lateral avanzado para {VAR}
publico numero velocidad = {VAL1};
publico booleano puedeMoverse = verdadero;

alActualizar(delta) {{
    si (puedeMoverse) {{
        si (teclaPresionada("{KEY}")) {{
            posicion.x += velocidad * delta;
            voltearH = {BOOL};
        }} sino si (teclaPresionada("left")) {{
            posicion.x -= velocidad * delta;
            voltearH = !{BOOL};
        }}
    }}
}}""",
        """ve motor;
// Control cinemático para {VAR} con suavizado
publico numero velMax = {VAL1};
variable velActual = 0;

alActualizar(delta) {{
    variable entrada = 0;
    si (teclaPresionada("d")) entrada = 1;
    si (teclaPresionada("a")) entrada = -1;

    velActual = lerp(velActual, entrada * velMax, 0.1);
    posicion.x += velActual * delta;

    si (valorAbsoluto(velActual) > 1) {{
        reproducir.Correr();
    }} sino {{
        reproducir.Quieto();
    }}
}}""",
        """ve motor;
// Oscilación matemática compleja de {VAR}
publico numero amplitud = {VAL1};
publico numero frecuencia = {VAL2};

alActualizar(delta) {{
    posicion.y += {MATE}(tiempoJuego * frecuencia) * amplitud * delta;
    posicion.x += {MATE2}(tiempoJuego * frecuencia * 0.5) * (amplitud / 2) * delta;
}}"""
    ],
    "Fisicas": [
        """ve motor;
// Sistema de propulsión jetpack para {VAR}
publico numero potencia = {VAL1};
variable combustible = 100;

alActualizar(delta) {{
    si (teclaPresionada("space") y combustible > 0) {{
        fisica.applyForce(nuevo Vector2(0, -potencia));
        combustible -= 10 * delta;
        reproducir.Vuelo();
    }} sino {{
        combustible = limitar(combustible + 5 * delta, 0, 100);
    }}
}}""",
        """ve motor;
// Rebote elástico al tocar {TAG}
alEntrarEnColision(otro) {{
    si (otro.tieneTag("{TAG}")) {{
        variable normal = otro.posicion.restar(posicion).normalizar();
        fisica.velocity = normal.multiplicar(-{VAL1});
        reproducir.Golpe();
    }}
}}"""
    ],
    "Combate": [
        """ve motor;
// Ráfaga de proyectiles de {VAR}
publico Prefab proyectil;
variable cooldown = 0;

alActualizar(delta) {{
    si (cooldown > 0) cooldown -= delta;

    si (teclaPresionada("{KEY}") y cooldown <= 0) {{
        variable p = instanciar(proyectil, posicion.x, posicion.y);
        p.fisica.velocity.x = voltearH ? -{VAL1} : {VAL1};
        cooldown = 0.5;
        reproducir.Disparar();
    }}
}}""",
        """ve motor;
// Escudo protector para {VAR}
publico numero energiaEscudo = {VAL1};
variable activo = falso;

recibirDano(cantidad) {{
    si (activo) {{
        energiaEscudo -= cantidad / 2;
        reproducir.Bloquear();
        si (energiaEscudo <= 0) activo = falso;
    }} sino {{
        salud -= cantidad;
        reproducir.Dano();
    }}
}}

alActualizar(delta) {{
    si (teclaRecienPresionada("e")) activo = !activo;
}}"""
    ],
    "IA": [
        """ve motor;
// IA de acecho (Stalker)
variable jugador;
publico numero distanciaSegura = {VAL1};

alActualizar(delta) {{
    si (jugador == nulo) jugador = buscar("Jugador");

    si (jugador != nulo) {{
        variable dist = distancia(posicion, jugador.posicion);
        si (dist > distanciaSegura) {{
            posicion.x = lerp(posicion.x, jugador.posicion.x, 0.02);
            reproducir.Caminar();
        }} sino {{
            reproducir.Atacar();
        }}
        voltearH = (jugador.posicion.x < posicion.x);
    }}
}}""",
        """ve motor;
// IA Centinela con campo de visión
publico numero rangoVision = {VAL1};

alActualizar(delta) {{
    variable objetivo = buscarCercanoConTag("Jugador");
    si (objetivo != nulo y distancia(posicion, objetivo.posicion) < rangoVision) {{
        difundir("ALERTA_ENEMIGA", {{ x: objetivo.posicion.x, y: objetivo.posicion.y }});
        reproducir.Alerta();
    }}
}}"""
    ],
    "UI": [
        """ve motor;
// Gestor de inventario visual para {VAR}
alRecibir("ITEM_RECOGIDO", (item) => {{
    variable slot = buscarUI("Slot_" + item.id);
    si (slot != nulo) {{
        slot.texto = item.nombre;
        reproducir.Moneda();
    }}
}});""",
        """ve motor;
// Animación de texto de daño flotante
publico numero dano = {VAL1};
alEmpezar() {{
    texto = "-" + dano;
    esperar(500);
    destruir(materia);
}}
alActualizar(delta) {{
    posicion.y -= 50 * delta;
    opacidad = lerp(opacidad, 0, 0.1);
}}"""
    ],
    "Logica_Compleja": [
        """ve motor;
// Ciclo de dia y noche con bucle de espera
variable hora = 0;
alEmpezar() {{
    mientras (verdadero) {{
        hora = (hora + 1) % 24;
        si (hora > 18 o hora < 6) {{
            luz.intensidad = 0.2;
        }} sino {{
            luz.intensidad = 1.0;
        }}
        esperar(1000);
    }}
}}""",
        """ve motor;
// Validador de secuencia de interruptores
variable secuencia = [];
publico numero max = 4;

registrarActivacion(id) {{
    secuencia.empujar(id);
    si (secuencia.longitud >= max) {{
        si (secuencia[0] == 1 y secuencia[1] == 3) {{
            difundir("PUERTA_ABRIR", {{}});
            reproducir.Exito();
        }} sino {{
            secuencia = [];
            reproducir.Error();
        }}
    }}
}}"""
    ]
}

def generar_codigo(id_unico):
    cat = random.choice(list(PLANTILLAS.keys()))
    temp = random.choice(PLANTILLAS[cat])

    # Llenar placeholders
    codigo = temp.format(
        VAR=random.choice(NOMBRES) + str(id_unico),
        VAL1=random.randint(1, 1500),
        VAL2=random.randint(1, 10),
        KEY=random.choice(TECLAS),
        TAG=random.choice(TAGS),
        ANIM=random.choice(ANIMACIONES),
        SONIDO=random.choice(SONIDOS),
        BOOL=random.choice(["verdadero", "falso"]),
        MSG=random.choice(["Puntos", "Vida", "Cargar", "Nivel", "Logro", "Energia", "Mana"]),
        MATE=random.choice(MATES),
        MATE2=random.choice(MATES),
        ID=id_unico
    )
    return f"### Código {id_unico} ({cat})\n```ces\n{codigo}\n```\n\n"

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for file_idx in range(TOTAL_CODES // CODES_PER_FILE):
        filename = f"{OUTPUT_DIR}/ENTRENAMIENTO_PARTE{file_idx + 1}.md"
        print(f"Generando {filename} con lógica mejorada...")
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"# Dataset de Entrenamiento CES Mejorado - Parte {file_idx + 1}\n")
            f.write(f"## Contiene 5,000 fragmentos de código únicos con lógica avanzada.\n\n")
            for i in range(CODES_PER_FILE):
                id_unico = file_idx * CODES_PER_FILE + i + 1
                f.write(generar_codigo(id_unico))

if __name__ == "__main__":
    main()
