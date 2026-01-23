// js/engine/Pathfinding.js

/**
 * Representa un nodo en la rejilla de búsqueda.
 */
class Node {
    constructor(x, y, walkable = true) {
        this.x = x;
        this.y = y;
        this.walkable = walkable;
        this.gCost = 0; // Costo desde el inicio
        this.hCost = 0; // Heurística (costo estimado hasta el final)
        this.parent = null;
    }

    // Costo total f = g + h
    get fCost() {
        return this.gCost + this.hCost;
    }
}

/**
 * Implementación del algoritmo de búsqueda de rutas A*.
 */
export class AStar {
    constructor(grid) {
        this.grid = grid;
        this.width = grid.length;
        this.height = grid[0].length;
        this.nodes = [];

        // Inicializar la matriz de nodos a partir de la rejilla
        for (let x = 0; x < this.width; x++) {
            this.nodes[x] = [];
            for (let y = 0; y < this.height; y++) {
                // Suponemos que el valor de la rejilla indica si es transitable
                this.nodes[x][y] = new Node(x, y, grid[x][y].walkable);
            }
        }
    }

    /**
     * Encuentra la ruta desde un punto de inicio a un punto final.
     * @param {object} startPos - {x, y}
     * @param {object} endPos - {x, y}
     * @returns {Array<object>} - Una matriz de puntos {x, y} que representan la ruta, o un array vacío si no se encuentra.
     */
    findPath(startPos, endPos) {
        const startNode = this.nodes[startPos.x][startPos.y];
        const endNode = this.nodes[endPos.x][endPos.y];

        if (!startNode || !endNode || !startNode.walkable || !endNode.walkable) {
            return []; // Inicio o fin no válidos
        }

        const openSet = [startNode]; // Lista de nodos por evaluar
        const closedSet = new Set(); // Conjunto de nodos ya evaluados

        while (openSet.length > 0) {
            // Encontrar el nodo con el menor fCost en el openSet
            let currentNode = openSet[0];
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].fCost < currentNode.fCost || (openSet[i].fCost === currentNode.fCost && openSet[i].hCost < currentNode.hCost)) {
                    currentNode = openSet[i];
                }
            }

            // Mover el nodo actual del openSet al closedSet
            const currentIndex = openSet.indexOf(currentNode);
            openSet.splice(currentIndex, 1);
            closedSet.add(currentNode);

            // Si hemos llegado al final, reconstruir y devolver la ruta
            if (currentNode === endNode) {
                return this.retracePath(startNode, endNode);
            }

            // Evaluar los vecinos del nodo actual
            const neighbors = this.getNeighbors(currentNode);
            for (const neighbor of neighbors) {
                if (!neighbor.walkable || closedSet.has(neighbor)) {
                    continue;
                }

                const newGCostToNeighbor = currentNode.gCost + this.getDistance(currentNode, neighbor);
                if (newGCostToNeighbor < neighbor.gCost || !openSet.includes(neighbor)) {
                    neighbor.gCost = newGCostToNeighbor;
                    neighbor.hCost = this.getDistance(neighbor, endNode);
                    neighbor.parent = currentNode;

                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return []; // No se encontró una ruta
    }

    /**
     * Reconstruye la ruta desde el nodo final hasta el inicial siguiendo los padres.
     * @param {Node} startNode
     * @param {Node} endNode
     * @returns {Array<object>}
     */
    retracePath(startNode, endNode) {
        const path = [];
        let currentNode = endNode;

        while (currentNode !== startNode) {
            path.push({ x: currentNode.x, y: currentNode.y });
            currentNode = currentNode.parent;
        }
        path.push({ x: startNode.x, y: startNode.y }); // Añadir el punto de inicio
        return path.reverse();
    }

    /**
     * Obtiene los nodos vecinos de un nodo dado (incluyendo diagonales).
     * @param {Node} node
     * @returns {Array<Node>}
     */
    getNeighbors(node) {
        const neighbors = [];
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x === 0 && y === 0) continue;

                const checkX = node.x + x;
                const checkY = node.y + y;

                if (checkX >= 0 && checkX < this.width && checkY >= 0 && checkY < this.height) {
                    neighbors.push(this.nodes[checkX][checkY]);
                }
            }
        }
        return neighbors;
    }

    /**
     * Calcula la distancia entre dos nodos.
     * Usa 14 para diagonales y 10 para movimientos rectos para evitar floats.
     * @param {Node} nodeA
     * @param {Node} nodeB
     * @returns {number}
     */
    getDistance(nodeA, nodeB) {
        const dstX = Math.abs(nodeA.x - nodeB.x);
        const dstY = Math.abs(nodeA.y - nodeB.y);

        if (dstX > dstY) {
            return 14 * dstY + 10 * (dstX - dstY);
        }
        return 14 * dstX + 10 * (dstY - dstX);
    }
}
