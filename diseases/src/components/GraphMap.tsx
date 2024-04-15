import { ForceGraph3D } from 'react-force-graph';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { useCallback, useEffect, useState } from 'react';
import { Graph, Pessoa } from '../types/GraphTypes';
import { useGraph } from '../contexts/GraphContext';

export function GraphMap() {
  const {
    graphData,
    setStartingNode,
    setEndingNode,
    startingNode,
    endingNode,
    selectedAlgorithm,
  } = useGraph();

  const extraRenderers = [new CSS2DRenderer() as any];
  const [pessoas, setPessoas] = useState<Graph>(graphData);

  // ================== Utils ==================
  function getAdjacentNodes(
    adjacencyList: Record<
      number,
      {
        outgoing: { target: number; value: number }[];
        incoming: { source: number; value: number }[];
      }
    >,
    targetNodeId: number
  ): number[] {
    const adjacentNodes = new Set<number>();

    adjacencyList[targetNodeId].outgoing.forEach((connection) => {
      adjacentNodes.add(connection.target);
    });

    adjacencyList[targetNodeId].incoming.forEach((connection) => {
      adjacentNodes.add(connection.source);
    });

    return Array.from(adjacentNodes);
  }

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const updateGraph = (nodes: Pessoa[]) => {
    const newNodes = [...nodes];

    newNodes.forEach((n) => {
      n.fx = n.x;
      n.fy = n.y;
      n.fz = n.z;
    });

    setPessoas((prevPessoas) => ({
      ...prevPessoas,
      nodes: newNodes,
    }));
  };

  // ================== Algoritmos de Busca ==================

  const BFS_GERAL = (nodeId: number) => {
    const queue = [nodeId];
    const newNodes = [...pessoas.nodes];
    newNodes[nodeId].isInfected = true;

    updateGraph(newNodes);

    const startInfection = () => {
      setTimeout(() => {
        processNode();
      }, 500);
    };

    const processNode = () => {
      if (queue.length === 0) {
        return;
      }

      const u = queue.shift();

      const adjNodes = getAdjacentNodes(pessoas.adjacencyList, u);
      let index = 0;

      const infectNode = () => {
        if (index < adjNodes.length) {
          const v = adjNodes[index];
          if (!newNodes[v].isInfected) {
            newNodes[v].isInfected = true;
            queue.push(v);

            index++;
            infectNode();
          } else {
            index++;
            infectNode();
          }
        } else {
          setTimeout(processNode, 100);
        }
      };

      infectNode();
      updateGraph(newNodes);
    };

    startInfection();
  };

  const BFS = (startNodeId: number, endNodeId: number) => {
    const queue = [startNodeId];
    const visited = new Set();
    const parent = Array(pessoas.nodes.length).fill(null);
    const newNodes = [...pessoas.nodes];

    visited.add(startNodeId);
    newNodes[startNodeId].isInfected = true;
    updateGraph(newNodes);

    const processQueue = async () => {
      while (queue.length > 0) {
        const currentNode = queue.shift();

        if (currentNode === endNodeId) {
          await delay(500);
          updateGraph(newNodes);
          return reconstructPath(parent, startNodeId, endNodeId);
        }

        const adjNodes = getAdjacentNodes(pessoas.adjacencyList, currentNode);
        for (const nextNode of adjNodes) {
          if (!visited.has(nextNode)) {
            visited.add(nextNode);
            queue.push(nextNode);
            parent[nextNode] = currentNode;
            newNodes[nextNode].isInfected = true;

            await delay(500);
            updateGraph(newNodes);
          }
        }
      }
      return [];
    };

    return processQueue();
  };

  const reconstructPath = (
    parent: number[],
    startNodeId: number,
    endNodeId: number
  ) => {
    let path = [];
    for (let at = endNodeId; at !== null; at = parent[at]) {
      if (at === undefined) return []; // Caso o caminho seja interrompido
      path.push(at);
    }
    path.reverse();

    if (path[0] === startNodeId) {
      return path.map((nodeId) => pessoas.nodes[nodeId]); // Retorna os nós do caminho
    } else {
      return []; // Caminho não encontrado
    }
  };

  const DFS_VISIT = async (node: Pessoa, newNodes: Pessoa[]) => {
    node.isInfected = true;
    updateGraph(newNodes);

    await delay(500);
    const adjNodes = getAdjacentNodes(pessoas.adjacencyList, node.id);

    for (const v of adjNodes) {
      if (!newNodes[v].isInfected) {
        await DFS_VISIT(newNodes[v], newNodes);
      }
    }
  };

  const DFS_GERAL = async (nodeId: number) => {
    const newNodes = [...pessoas.nodes];
    newNodes[nodeId].isInfected = true;
    updateGraph(newNodes);

    await delay(500);

    const adjNodes = getAdjacentNodes(pessoas.adjacencyList, nodeId);
    for (const v of adjNodes) {
      if (!newNodes[v].isInfected) {
        await DFS_VISIT(newNodes[v], newNodes);
      }
    }
  };

  const handleClick = useCallback(
    (node: Pessoa) => {
      switch (selectedAlgorithm) {
        case 'BFS':
          BFS_GERAL(node.id);
          break;
        case 'DFS':
          DFS_GERAL(node.id);
          break;
        default:
          break;
      }
    },
    [pessoas, selectedAlgorithm]
  );

  const handleSelectNode = (node: Pessoa) => {
    if (!startingNode) {
      setStartingNode(node);
    } else if (!endingNode) {
      setEndingNode(node);
    } else {
      // setStartingNode(node);
      // setEndingNode(null);
      BFS(startingNode.id, endingNode.id).then((path) => {
        if (path.length > 0) {
          console.log('Caminho encontrado:', path);
        } else {
          console.log('Caminho não encontrado');
        }
      });
    }
  };

  useEffect(() => {
    setPessoas(graphData);
  }, [graphData]);

  return (
    <ForceGraph3D
      graphData={pessoas}
      onNodeClick={handleClick}
      // onNodeClick={handleSelectNode}
      nodeVal={15}
      nodeColor={(node) => {
        if (startingNode && node.id === startingNode.id) {
          return '#FFCA80';
        } else if (endingNode && node.id === endingNode.id) {
          return '#FFCA80';
        } else if (node.isInfected) {
          return '#FF9580';
        } else {
          return '#80FFEA';
        }
      }}
      nodeLabel={(node) => `[${node.id}] ${node.name}`}
      nodeOpacity={0.9}
      nodeThreeObject={(node) => {
        const nodeEl = document.createElement('div');
        nodeEl.textContent = `[${node.id}] ${node.name}`;
        nodeEl.style.color = '#fff';
        nodeEl.style.fontSize = '12px';
        nodeEl.style.fontWeight = '600';
        nodeEl.className = 'node-label';
        return new CSS2DObject(nodeEl);
      }}
      nodeThreeObjectExtend={true}
      extraRenderers={extraRenderers}
      backgroundColor="#22212C"
    />
  );
}
