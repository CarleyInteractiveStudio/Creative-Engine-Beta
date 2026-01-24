// js/engine/Pathfinding.js

class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.gCost = Infinity; // Cost from start to this node
        this.hCost = 0;       // Heuristic cost from this node to end
        this.fCost = Infinity; // gCost + hCost
        this.parent = null;
        this.isObstacle = false;
    }
}

function getDistance(nodeA, nodeB) {
    // Using Manhattan distance for a 4-directional grid
    const distX = Math.abs(nodeA.x - nodeB.x);
    const distY = Math.abs(nodeA.y - nodeB.y);
    return distX + distY;
}

function reconstructPath(endNode) {
    const path = [];
    let currentNode = endNode;
    while (currentNode !== null) {
        path.push({ x: currentNode.x, y: currentNode.y });
        currentNode = currentNode.parent;
    }
    return path.reverse();
}

export function findPath(startPos, targetPos, grid, obstacles) {
    const gridWidth = grid.width;
    const gridHeight = grid.height;
    const nodes = Array.from({ length: gridWidth }, () => Array.from({ length: gridHeight }, (v, i) => new Node()));

    // Initialize nodes
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            nodes[x][y] = new Node(x, y);
        }
    }

    // Mark obstacles
    for (const obs of obstacles) {
        if (obs.x >= 0 && obs.x < gridWidth && obs.y >= 0 && obs.y < gridHeight) {
            nodes[obs.x][obs.y].isObstacle = true;
        }
    }

    const startNode = nodes[startPos.x][startPos.y];
    const targetNode = nodes[targetPos.x][targetPos.y];

    if (startNode.isObstacle || targetNode.isObstacle) {
        return null; // Start or end is blocked
    }

    const openList = [startNode];
    const closedList = new Set();

    startNode.gCost = 0;
    startNode.hCost = getDistance(startNode, targetNode);
    startNode.fCost = startNode.hCost;

    while (openList.length > 0) {
        // Find the node with the lowest fCost
        let currentNode = openList[0];
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].fCost < currentNode.fCost || (openList[i].fCost === currentNode.fCost && openList[i].hCost < currentNode.hCost)) {
                currentNode = openList[i];
            }
        }

        // Move current node from open to closed list
        const currentIndex = openList.indexOf(currentNode);
        openList.splice(currentIndex, 1);
        closedList.add(currentNode);

        if (currentNode === targetNode) {
            return reconstructPath(targetNode);
        }

        // Check neighbors
        const neighbors = [];
        const { x, y } = currentNode;
        if (x > 0) neighbors.push(nodes[x - 1][y]);
        if (x < gridWidth - 1) neighbors.push(nodes[x + 1][y]);
        if (y > 0) neighbors.push(nodes[x][y - 1]);
        if (y < gridHeight - 1) neighbors.push(nodes[x][y + 1]);

        for (const neighbor of neighbors) {
            if (neighbor.isObstacle || closedList.has(neighbor)) {
                continue;
            }

            const newGCost = currentNode.gCost + getDistance(currentNode, neighbor);
            if (newGCost < neighbor.gCost) {
                neighbor.parent = currentNode;
                neighbor.gCost = newGCost;
                neighbor.hCost = getDistance(neighbor, targetNode);
                neighbor.fCost = neighbor.gCost + neighbor.hCost;

                if (!openList.includes(neighbor)) {
                    openList.push(neighbor);
                }
            }
        }
    }

    return null; // No path found
}
