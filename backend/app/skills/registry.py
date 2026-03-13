"""
Skills Registry — maps skill function names → handler implementations.
"""
from typing import Any, Callable, Dict, Optional
import structlog

logger = structlog.get_logger()


class SkillRegistry:
    def __init__(self):
        self._registry: Dict[str, Callable] = {}
        self._descriptions: Dict[str, str] = {}

    def register(self, name: str, description: str):
        """Decorator to register a skill function."""
        def decorator(fn: Callable):
            self._registry[name] = fn
            self._descriptions[name] = description
            return fn
        return decorator

    def get(self, name: str) -> Optional[Callable]:
        return self._registry.get(name)

    def get_description(self, name: str) -> str:
        return self._descriptions.get(name, f"Execute the {name} skill")

    def list_skills(self) -> Dict[str, str]:
        return dict(self._descriptions)

    def load_all(self):
        """Import every skill module so they self-register."""
        from app.skills import entra_skills, azure_skills, web_skills, data_skills, comm_skills, devops_skills
        from app.skills import sales_skills, finance_skills, hr_skills, marketing_skills, devit_skills, support_skills
        entra_skills.register(self)
        azure_skills.register(self)
        web_skills.register(self)
        data_skills.register(self)
        comm_skills.register(self)
        devops_skills.register(self)
        sales_skills.register(self)
        finance_skills.register(self)
        hr_skills.register(self)
        marketing_skills.register(self)
        devit_skills.register(self)
        support_skills.register(self)
        logger.info("Skill registry loaded", total=len(self._registry))


# Global singleton
skill_registry = SkillRegistry()
