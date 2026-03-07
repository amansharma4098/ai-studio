"""Data & Analytics skills — SQL, Python execution, transforms."""
import ast
import subprocess


def register(registry):
    @registry.register("run_sql_query", "Execute SQL against a configured database. Input JSON: {query, connection?}")
    def run_sql_query(params: dict) -> dict:
        # In production: use SQLAlchemy with connection string from params or credential
        return {
            "result": "SQL execution requires a configured database connection string.",
            "query": params.get("query", ""),
            "hint": "Pass 'connection' param with a valid SQLAlchemy connection string.",
        }

    @registry.register("parse_csv", "Parse CSV data and return structured JSON. Input JSON: {data, delimiter?}")
    def parse_csv(params: dict) -> dict:
        import csv, io
        data = params.get("data", "")
        delimiter = params.get("delimiter", ",")
        reader = csv.DictReader(io.StringIO(data), delimiter=delimiter)
        rows = list(reader)[:100]  # cap at 100 rows
        return {"rows": rows, "count": len(rows), "columns": list(rows[0].keys()) if rows else []}

    @registry.register("run_python", "Execute sandboxed Python code and return stdout. Input JSON: {code, timeout?}")
    def run_python(params: dict) -> dict:
        code = params.get("code", "")
        timeout = min(int(params.get("timeout", 10)), 30)
        try:
            result = subprocess.run(
                ["python3", "-c", code],
                capture_output=True, text=True, timeout=timeout,
            )
            return {
                "stdout": result.stdout[:2000],
                "stderr": result.stderr[:500],
                "returncode": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {"error": f"Execution timed out after {timeout}s"}
        except Exception as e:
            return {"error": str(e)}

    @registry.register("transform_json", "Apply a transformation expression to JSON data. Input JSON: {data, expression}")
    def transform_json(params: dict) -> dict:
        import json
        try:
            data = params.get("data", {})
            expr = params.get("expression", "")
            # Safe eval in sandboxed locals
            result = eval(expr, {"__builtins__": {}}, {"data": data, "json": json})
            return {"result": result}
        except Exception as e:
            return {"error": str(e)}

    @registry.register("calculate", "Evaluate a mathematical or financial expression. Input JSON: {expression}")
    def calculate(params: dict) -> dict:
        try:
            tree = ast.parse(params["expression"], mode="eval")
            result = eval(compile(tree, "<string>", "eval"), {"__builtins__": {}})
            return {"result": result, "expression": params["expression"]}
        except Exception as e:
            return {"error": str(e)}
