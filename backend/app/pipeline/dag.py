from typing import Dict, List, Set
from app.pipeline.task import PipelineTaskOperator

class DAG:
    def __init__(self, dag_id: str):
        self.dag_id = dag_id
        self.tasks: Dict[str, PipelineTaskOperator] = {}
        self.adjacency_list: Dict[str, List[str]] = {}  # task -> downstream tasks
        self.in_degree: Dict[str, int] = {}

    def add_task(self, task: PipelineTaskOperator):
        if task.task_name in self.tasks:
            raise ValueError(f"Task '{task.task_name}' already exists in DAG '{self.dag_id}'.")
        self.tasks[task.task_name] = task
        self.adjacency_list[task.task_name] = []
        self.in_degree[task.task_name] = len(task.upstream_tasks)

    def build_graph(self):
        # Reset graph structures
        for name in self.tasks:
            self.adjacency_list[name] = []
            self.in_degree[name] = 0

        for task_name, task in self.tasks.items():
            for upstream in task.upstream_tasks:
                if upstream not in self.tasks:
                    raise ValueError(f"Upstream task '{upstream}' not found in DAG '{self.dag_id}'.")
                self.adjacency_list[upstream].append(task_name)
                self.in_degree[task_name] += 1

    def topological_sort(self) -> List[PipelineTaskOperator]:
        self.build_graph()
        in_deg = self.in_degree.copy()
        queue = [name for name, deg in in_deg.items() if deg == 0]
        sorted_tasks = []

        while queue:
            current = queue.pop(0)
            sorted_tasks.append(self.tasks[current])

            for downstream in self.adjacency_list.get(current, []):
                in_deg[downstream] -= 1
                if in_deg[downstream] == 0:
                    queue.append(downstream)

        if len(sorted_tasks) != len(self.tasks):
            raise ValueError(f"Cycle detected in DAG '{self.dag_id}'.")

        return sorted_tasks

    def get_downstream_tasks(self, task_name: str) -> Set[str]:
        """Returns all recursive downstream tasks from a given failed or blocked task."""
        self.build_graph()
        visited = set()
        queue = list(self.adjacency_list.get(task_name, []))

        while queue:
            node = queue.pop(0)
            if node not in visited:
                visited.add(node)
                queue.extend(self.adjacency_list.get(node, []))

        return visited
