"""Skills package - auto-imported by registry."""
from app.skills import other_skills


def register_web(registry): other_skills.register(registry)
def register_data(registry): other_skills.register(registry)
def register_comm(registry): other_skills.register(registry)
def register_devops(registry): other_skills.register(registry)


# Stub modules for import by registry
class web_skills:
    @staticmethod
    def register(r): other_skills.register(r)

class data_skills:
    @staticmethod
    def register(r): other_skills.register(r)

class comm_skills:
    @staticmethod
    def register(r): other_skills.register(r)

class devops_skills:
    @staticmethod
    def register(r): other_skills.register(r)
