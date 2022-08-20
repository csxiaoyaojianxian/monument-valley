/* eslint-disable */
function removeByValue(arr, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] == val) {
      arr.splice(i, 1);
      break;
    }
  }
}

class GraphPath {
  constructor(pathInfo) {
    this.pathInfo = pathInfo;
  }

  addEdge(a, b) {
    const nb = this.pathInfo[a].neighbors;
    for (const i in nb) {
      if (nb[i] == b) {
        return;
      }
    }
    this.pathInfo[a].neighbors.push(b);
    this.pathInfo[b].neighbors.push(a);
  }

  removeEdge(a, b) {
    let nb = this.pathInfo[a].neighbors;
    removeByValue(nb, b);
    nb = this.pathInfo[b].neighbors;
    removeByValue(nb, a);
  }

  removeEdges(arr) {
    for (const pair of arr) {
      this.removeEdge(pair[0], pair[1]);
    }
  }

  shortestPath(source, target) {
    if (source == target) {
      return [source];
    }
    const queue = [source];
    const visited = {
      source: true,
    };
    const predecessor = {};
    let tail = 0;
    while (tail < queue.length) {
      let u = queue[tail++];
      const { neighbors } = this.pathInfo[u];
      for (let i = 0; i < neighbors.length; ++i) {
        const v = neighbors[i];
        if (visited[v]) {
          continue;
        }
        visited[v] = true;
        if (v === target) {
          const path = [v];
          while (u !== source) {
            path.push(u);
            u = predecessor[u];
          }
          path.push(u);
          path.reverse();
          return path;
        }
        predecessor[v] = u;
        queue.push(v);
      }
    }
    return false;
  }

  findPath(start, end) {
    return this.shortestPath(start, end);
  }
}

export default GraphPath;
