from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class ResourceTierConfig:
    name: str
    cpu_cores: int
    memory_gb: int
    cost_per_minute: float
    speed_factor: float  # < 1.0 = faster, > 1.0 = slower

RESOURCE_TIERS = {
    "small": ResourceTierConfig(name="small", cpu_cores=1, memory_gb=2, cost_per_minute=0.02, speed_factor=1.6),
    "medium": ResourceTierConfig(name="medium", cpu_cores=2, memory_gb=4, cost_per_minute=0.05, speed_factor=1.0),
    "large": ResourceTierConfig(name="large", cpu_cores=4, memory_gb=8, cost_per_minute=0.12, speed_factor=0.55),
}
