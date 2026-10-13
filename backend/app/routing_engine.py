import re
from typing import Dict, Any, Tuple

TEAM_DEFINITIONS = [
    {
        "name": "Backend API Team",
        "slug": "backend-api",
        "color": "#3b82f6",
        "description": "Handles REST/GraphQL APIs, business logic, authentication services, and microservices.",
        "keywords": ["api", "fastapi", "django", "flask", "endpoint", "controller", "route", "http", "status code", "rest", "json", "graphql", "500 internal", "timeout", "jwt", "token"]
    },
    {
        "name": "Database Engineering Team",
        "slug": "database",
        "color": "#10b981",
        "description": "Specializes in relational & NoSQL databases, ORM models, SQL queries, transactions, migrations, and indexing.",
        "keywords": ["sql", "database", "postgres", "mysql", "sqlite", "query", "deadlock", "transaction", "migration", "foreign key", "constraint", "sqlalchemy", "prisma", "indexing", "slow query"]
    },
    {
        "name": "Frontend Engineering Team",
        "slug": "frontend",
        "color": "#8b5cf6",
        "description": "Builds user interfaces, DOM components, CSS styles, client-side state, React, Vue, and cross-browser experiences.",
        "keywords": ["ui", "frontend", "css", "html", "react", "vue", "angular", "dom", "rendering", "javascript", "tailwind", "modal", "button", "browser", "component", "state", "flexbox"]
    },
    {
        "name": "DevOps & Infrastructure Team",
        "slug": "devops-infra",
        "color": "#f59e0b",
        "description": "Manages cloud infrastructure, Docker containers, Kubernetes, CI/CD pipelines, SSL certificates, and deployments.",
        "keywords": ["docker", "kubernetes", "k8s", "ci/cd", "deployment", "github actions", "aws", "gcp", "helm", "cluster", "pod", "oomkilled", "pipeline", "env", "port", "ingress"]
    },
    {
        "name": "Security Engineering Team",
        "slug": "security",
        "color": "#ef4444",
        "description": "Investigates vulnerabilities, authorization bypasses, XSS, CSRF, SQL injections, sanitization, and cryptographic issues.",
        "keywords": ["security", "vulnerability", "xss", "csrf", "injection", "cve", "auth bypass", "sanitize", "privilege escalation", "dos", "secret", "leak", "encryption", "exploit"]
    },
    {
        "name": "AI/ML Engineering Team",
        "slug": "ai-ml",
        "color": "#ec4899",
        "description": "Responsible for machine learning pipelines, LLM inference, embeddings, PyTorch, model latency, and prompt engineering.",
        "keywords": ["ai", "ml", "model", "llm", "inference", "pytorch", "tensorflow", "transformer", "prompt", "embeddings", "token limit", "hallucination", "weights", "cuda"]
    },
    {
        "name": "Performance & Reliability Team",
        "slug": "performance-reliability",
        "color": "#06b6d4",
        "description": "Focuses on high memory consumption, CPU spikes, latency bottlenecks, caching (Redis), race conditions, and load limits.",
        "keywords": ["memory leak", "cpu spike", "slow", "latency", "bottleneck", "concurrency", "race condition", "cache", "redis", "load", "profiling", "throughput"]
    },
    {
        "name": "General Engineering Team",
        "slug": "general-engineering",
        "color": "#64748b",
        "description": "Triages cross-cutting bugs, utility libraries, general algorithmic logic, and unclassified software defects.",
        "keywords": ["logic", "util", "helper", "general", "typo", "unhandled", "exception"]
    }
]

def determine_team_routing(title: str, description: str, language: str, framework: str, error_trace: str) -> Dict[str, Any]:
    """
    Deterministic rule engine mapping bug context to team assignments.
    Provides team name, reason, required technical expertise, and suggested priority.
    """
    combined_text = f"{title} {description} {language} {framework or ''} {error_trace or ''}".lower()

    # Rule-based scoring
    team_scores = {team["name"]: 0 for team in TEAM_DEFINITIONS}
    reasons = {}

    # Specific strong indicators
    if re.search(r"(security|xss|sql injection|cve|unauthorized access|exploit|secret leak)", combined_text):
        team_scores["Security Engineering Team"] += 10
        reasons["Security Engineering Team"] = "Security vulnerability or access control indicator detected in error context."

    if re.search(r"(select\s+|insert\s+into|foreign key|deadlock|database|postgres|sqlite|integrityerror|operationalerror|migration)", combined_text):
        team_scores["Database Engineering Team"] += 8
        reasons["Database Engineering Team"] = "SQL query execution, schema constraint, or database transaction defect identified."

    if re.search(r"(docker|container|kubernetes|pod|k8s|deployment|ci/cd|oomkilled|ingress|helm)", combined_text):
        team_scores["DevOps & Infrastructure Team"] += 8
        reasons["DevOps & Infrastructure Team"] = "Infrastructure, container runtime, or deployment pipeline failure detected."

    if re.search(r"(css|dom|react|component|render|undefined \(reading 'map'\)|usestate|useeffect|jsx|tsx|html)", combined_text):
        team_scores["Frontend Engineering Team"] += 8
        reasons["Frontend Engineering Team"] = "Client-side rendering, component lifecycle, or DOM styling anomaly identified."

    if re.search(r"(memory leak|cpu 100%|high latency|timeout after 30s|redis|cache miss|bottleneck)", combined_text):
        team_scores["Performance & Reliability Team"] += 7
        reasons["Performance & Reliability Team"] = "System performance degradation or resource exhaustion pattern detected."

    if re.search(r"(fastapi|endpoint|http\s*500|route|payload|pydantic|controller|rest api|jsondecodeerror)", combined_text):
        team_scores["Backend API Team"] += 7
        reasons["Backend API Team"] = "Backend service routing, API payload serialization, or endpoint handler failure."

    if re.search(r"(model|inference|embedding|llm|pytorch|tensor|cuda|tokenizer)", combined_text):
        team_scores["AI/ML Engineering Team"] += 8
        reasons["AI/ML Engineering Team"] = "Machine learning model execution or AI inference pipeline failure detected."

    # General keyword scanning
    for team in TEAM_DEFINITIONS:
        for kw in team["keywords"]:
            if kw in combined_text:
                team_scores[team["name"]] += 1

    # Select best scoring team
    sorted_teams = sorted(team_scores.items(), key=lambda item: item[1], reverse=True)
    best_team_name, top_score = sorted_teams[0]

    if top_score <= 1:
        best_team_name = "General Engineering Team"
        reason = "Context provided insufficient distinct markers; routed to General Engineering for initial review."
        expertise = "General Full-stack Debugging, Root Cause Analysis"
        priority = "P3 – Normal Review"
    else:
        reason = reasons.get(best_team_name, f"Identified matching architectural markers for {best_team_name}.")
        expertise = f"{best_team_name.replace(' Team', '')} domain knowledge, debugging tools & frameworks"
        priority = "P1 – High Priority" if "Security" in best_team_name else "P2 – Standard Priority"

    return {
        "recommended_team_name": best_team_name,
        "team_routing_reason": reason,
        "required_expertise": expertise,
        "suggested_priority": priority,
        "confidence": min(0.96, 0.70 + (top_score * 0.04))
    }
