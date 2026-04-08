import random
import os

# Configuración
OUTPUT_DIR = "Dataset_Entrenamiento_IA"
TOTAL_CODES = 50000
CODES_PER_FILE = 5000

# Diccionarios de aleatoriedad
NOMBRES = ["jugador", "enemigo", "bala", "moneda", "tesoro", "puerta", "npc", "jefe", "proyectil", "heroe", "mago", "guerrero", "arquero", "cofre", "pocion"]
TECLAS = ["space", "enter", "shift", "ctrl", "alt", "w", "a", "s", "d", "e", "f", "q", "r", "up", "down", "left", "right"]
TAGS = ["Suelo", "Pared", "Enemigo", "Jugador", "Agua", "Item", "Peligro", "Meta", "Checkpoint", "Obstaculo", "Aliado"]
ANIMACIONES = ["Caminar", "Correr", "Salto", "Caida", "Atacar", "Morir", "Dano", "Quieto", "Inactivo", "Especial"]
SONIDOS = ["Salto", "Golpe", "Muerte", "Explosion", "Moneda", "Click", "Paso", "Vuelo", "Motor"]

# Plantillas por categoría
PLANTILLAS = {
    "Movimiento": [
        """ve motor;
// Script de movimiento lateral para {VAR}
publico numero velocidad = {VAL1};

alActualizar(delta) {{
    si (teclaPresionada("{KEY}")) {{
        posicion.x += velocidad * delta;
        voltearH = {BOOL};
    }}
}}""",
        """ve motor;
// Control top-down para {VAR}
publico numero velNormal = {VAL1};

alActualizar(delta) {{
    variable h = 0;
    variable v = 0;
    si (teclaPresionada("d")) h = 1;
    si (teclaPresionada("a")) h = -1;
    si (teclaPresionada("w")) v = -1;
    si (teclaPresionada("s")) v = 1;

    posicion.x += h * velNormal * delta;
    posicion.y += v * velNormal * delta;
}}""",
        """ve motor;
// Movimiento automático de {VAR}
publico numero rango = {VAL1};
variable inicioX;

alEmpezar() {{
    inicioX = posicion.x;
}}

alActualizar(delta) {{
    posicion.x = inicioX + seno(tiempoJuego * 2) * rango;
}}"""
    ],
    "Fisicas": [
        """ve motor;
// Salto fisico para {VAR}
publico numero fuerza = {VAL1};

alActualizar(delta) {{
    si (teclaRecienPresionada("{KEY}") y estaTocandoTag("Suelo")) {{
        fisica.applyImpulse(nuevo Vector2(0, -fuerza));
        reproducir.{ANIM}();
    }}
}}""",
        """ve motor;
// Gravedad variable
publico numero factorGravedad = {VAL1};

alEmpezar() {{
    fisica.gravityScale = factorGravedad;
}}

alEntrarEnColision(otro) {{
    si (otro.tieneTag("{TAG}")) {{
        fisica.velocity.y = 0;
    }}
}}"""
    ],
    "Combate": [
        """ve motor;
// Disparo de {VAR}
publico Prefab bala;

alActualizar(delta) {{
    si (teclaRecienPresionada("{KEY}")) {{
        variable b = instanciar(bala, posicion.x, posicion.y);
        b.fisica.velocity.x = voltearH ? -{VAL1} : {VAL1};
    }}
}}""",
        """ve motor;
// Sistema de vida para {VAR}
publico numero salud = {VAL1};

recibirDano(cant) {{
    salud -= cant;
    reproducir.{ANIM}();
    si (salud <= 0) {{
        destruir(materia);
    }}
}}"""
    ],
    "IA": [
        """ve motor;
// IA que sigue al jugador
publico numero vision = {VAL1};
variable target;

alActualizar(delta) {{
    si (target == nulo) {{
        target = buscar("Jugador");
    }} sino {{
        variable d = distancia(posicion, target.posicion);
        si (d < vision) {{
            posicion.x = lerp(posicion.x, target.posicion.x, 0.05);
        }}
    }}
}}""",
        """ve motor;
// IA de patrulla
publico numero distPatrulla = {VAL1};
variable dir = 1;
variable counter = 0;

alActualizar(delta) {{
    posicion.x += dir * 100 * delta;
    counter += 100 * delta;
    si (counter >= distPatrulla) {{
        dir *= -1;
        counter = 0;
        voltearH = !voltearH;
    }}
}}"""
    ],
    "UI": [
        """ve motor;
// Boton de {VAR}
alHacerClick() {{
    difundir("{MSG}", {{ valor: {VAL1} }});
    reproducir.{SONIDO}();
}}""",
        """ve motor;
// Actualizador de barra de vida
alRecibir("DanoRecibido", (datos) => {{
    barra.valor = datos.nuevaVida;
}});"""
    ],
    "AudioVideo": [
        """ve motor;
// Reproductor de sonido ambiental
alEmpezar() {{
    fuenteDeAudio.loop = verdadero;
    fuenteDeAudio.reproducir();
}}""",
        """ve motor;
// Disparador de video cinemático
alEntrarEnTrigger(otro) {{
    si (otro.tieneTag("Jugador")) {{
        reproductorDeVideo.play();
        esperar({VAL1});
        cargarEscena("{TAG}");
    }}
}}"""
    ],
    "Agua": [
        """ve motor;
// Efecto de flotación en agua
alPermanecerEnColision(otro) {{
    si (otro.tieneTag("Agua")) {{
        fisica.applyForce(nuevo Vector2(0, -{VAL1}));
    }}
}}"""
    ],
    "Vehiculos": [
        """ve motor;
// Control de coche basico
alActualizar(delta) {{
    variable pot = 0;
    si (teclaPresionada("w")) pot = {VAL1};
    si (teclaPresionada("s")) pot = -{VAL2};

    fisica.applyForce(nuevo Vector2(pot, 0));
}}"""
    ]
}

def generar_codigo(id_unico):
    cat = random.choice(list(PLANTILLAS.keys()))
    temp = random.choice(PLANTILLAS[cat])

    # Llenar placeholders
    codigo = temp.format(
        VAR=random.choice(NOMBRES) + str(id_unico),
        VAL1=random.randint(1, 1000),
        VAL2=random.randint(1, 500),
        KEY=random.choice(TECLAS),
        TAG=random.choice(TAGS),
        ANIM=random.choice(ANIMACIONES),
        SONIDO=random.choice(SONIDOS),
        BOOL=random.choice(["verdadero", "falso"]),
        MSG=random.choice(["Puntos", "Vida", "Cargar", "Nivel", "Logro"]),
        ID=id_unico
    )
    return f"### Código {id_unico} ({cat})\n```ces\n{codigo}\n```\n\n"

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for file_idx in range(TOTAL_CODES // CODES_PER_FILE):
        filename = f"{OUTPUT_DIR}/ENTRENAMIENTO_PARTE{file_idx + 1}.md"
        print(f"Generando {filename}...")
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"# Dataset de Entrenamiento CES - Parte {file_idx + 1}\n\n")
            for i in range(CODES_PER_FILE):
                id_unico = file_idx * CODES_PER_FILE + i + 1
                f.write(generar_codigo(id_unico))

if __name__ == "__main__":
    main()
