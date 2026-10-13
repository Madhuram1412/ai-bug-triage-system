import json
import re
import difflib
from typing import Dict, Any, Optional
import httpx

from backend.app.config import settings
from backend.app.routing_engine import determine_team_routing

def sanitize_prompt_input(text: Optional[str]) -> str:
    """Sanitize user input against prompt injection techniques."""
    if not text:
        return ""
    # Strip potential adversarial LLM instruction injections
    sanitized = re.sub(r"(?i)(ignore previous instructions|you are now in developer mode|system prompt override)", "[FILTERED]", text)
    return sanitized.strip()

def generate_unified_diff(original: str, patched: str, filename: str = "solution_file.py") -> str:
    """Generate a clean unified git diff string between original and patched code."""
    if not original and not patched:
        return ""
    orig_lines = original.splitlines(keepends=True) if original else []
    patch_lines = patched.splitlines(keepends=True) if patched else []
    diff = difflib.unified_diff(
        orig_lines,
        patch_lines,
        fromfile=f"a/{filename}",
        tofile=f"b/{filename}",
        lineterm=""
    )
    return "\n".join(diff)

def analyze_bug_heuristic(
    title: str,
    description: str,
    language: str,
    framework: Optional[str],
    error_trace: Optional[str],
    code_snippet: Optional[str],
    environment_info: Optional[str]
) -> Dict[str, Any]:
    """
    Intelligent heuristic analysis engine used when API keys are not provided or as resilient offline fallback.
    Performs deterministic syntax, exception, and pattern inspection to formulate realistic triage.
    """
    combined = f"{title} {description} {error_trace or ''} {code_snippet or ''}".lower()

    # Routing determination
    routing = determine_team_routing(title, description, language, framework or "", error_trace or "")

    # 1. Bug Type Classification
    bug_type = "Runtime Error"
    if any(k in combined for k in ["syntaxerror", "unexpected token", "indentationerror", "parsing error", "invalid syntax"]):
        bug_type = "Syntax Error"
    elif any(k in combined for k in ["deadlock", "foreign key", "integrityerror", "sql", "table doesn't exist", "relation does not exist"]):
        bug_type = "Database Error"
    elif any(k in combined for k in ["xss", "csrf", "sqli", "injection", "vulnerability", "auth bypass", "unauthorized"]):
        bug_type = "Security Vulnerability"
    elif any(k in combined for k in ["memory leak", "out of memory", "oomkilled", "high ram"]):
        bug_type = "Memory Error"
    elif any(k in combined for k in ["timeout", "slow query", "cpu 100%", "high latency", "bottleneck"]):
        bug_type = "Performance Issue"
    elif any(k in combined for k in ["modulenotfounderror", "cannot find module", "package not found", "version mismatch"]):
        bug_type = "Dependency Error"
    elif any(k in combined for k in ["env", "config", "port already in use", "missing environment variable", "settings"]):
        bug_type = "Configuration Error"
    elif any(k in combined for k in ["404", "502", "503", "connection refused", "bad gateway", "rest api"]):
        bug_type = "API or Integration Error"
    elif any(k in combined for k in ["off by one", "incorrect calculation", "infinite loop", "condition", "boolean"]):
        bug_type = "Logic Error"

    # 2. Severity Classification (P0 to P4)
    severity = "P2"
    severity_reasoning = "Partial functionality affected with an accessible workaround or moderate user impact."
    severity_evidence = "The issue affects specific sub-workflows without precipitating system-wide collapse."

    if any(k in combined for k in ["crash", "outage", "production down", "critical security", "remote code execution", "data loss", "data corruption"]):
        severity = "P0"
        severity_reasoning = "P0 – Critical: Production outage, data loss potential, or actively exploitable critical vulnerability."
        severity_evidence = "Detected critical failure keywords affecting core runtime availability and data integrity."
    elif any(k in combined for k in ["500 internal server error", "unhandled exception", "payment failed", "auth broken", "login failing"]):
        severity = "P1"
        severity_reasoning = "P1 – High: Major functionality is broken; widespread business or operational impact."
        severity_evidence = "Primary customer interaction or authentication pathway is blocked."
    elif any(k in combined for k in ["typo", "color", "alignment", "cosmetic", "padding", "dark mode styling"]):
        severity = "P4"
        severity_reasoning = "P4 – Informational: Cosmetic issue, UI inconsistency, or minor suggestion."
        severity_evidence = "No core computational defect detected; visual polish or documentation improvement."
    elif any(k in combined for k in ["minor", "intermittent", "edge case", "rare"]):
        severity = "P3"
        severity_reasoning = "P3 – Low: Minor defect with localized or infrequent impact."
        severity_evidence = "Defect triggers only under constrained edge-case configurations."

    # 3. Line Number & Root Cause Deduction
    line_match = re.search(r"line\s+(\d+)", error_trace or "")
    if not line_match and code_snippet:
        line_match = re.search(r"(\d+):", code_snippet)
    line_number = line_match.group(1) if line_match else "42"

    root_cause = (
        f"Suspected root cause in {language or 'codebase'}: Unchecked variable access or state handling failure "
        f"around line {line_number}. An edge-case condition triggered an unhandled exception or improper state validation."
    )
    if "keyerror" in combined or "undefined" in combined:
        root_cause = f"Attempted to access an uninitialized or non-existent property on line {line_number} without defensive nil/presence checks."
    elif "zerodivision" in combined:
        root_cause = f"Mathematical divisor resolved to 0 on line {line_number} without antecedent boundary validation."
    elif "none" in combined or "nullpointer" in combined:
        root_cause = f"Null reference / NoneType dereference on line {line_number} prior to initialization."

    # 4. Patch & Diff Generation
    orig_code = code_snippet if code_snippet else (
        "# Sample defective code snippet\ndef handle_request(payload):\n    user_id = payload['user_id']\n    return fetch_data(user_id)\n"
    )

    # Generate a sensible patch
    if "keyerror" in combined or "payload" in orig_code:
        patched_code = orig_code.replace("payload['user_id']", "payload.get('user_id') if payload else None")
        if patched_code == orig_code:
            patched_code = (
                "# Fixed code with defensive guard checks\ndef handle_request(payload):\n"
                "    if not payload or 'user_id' not in payload:\n"
                "        raise ValueError('Missing required parameter: user_id')\n"
                "    user_id = payload['user_id']\n"
                "    return fetch_data(user_id)\n"
            )
    else:
        indented_lines = "\n".join("    " + l for l in orig_code.splitlines())
        patched_code = (
            "# Patched implementation with defensive error handling\n"
            "try:\n"
            f"{indented_lines}\n"
            "except Exception as err:\n"
            "    logger.error(f'Handled failure in triage block: {err}')\n"
            "    raise\n"
        )

    diff_str = generate_unified_diff(orig_code, patched_code, f"fix_{language.lower() if language else 'script'}.py")

    steps = [
        "1. Reproduce the bug in an isolated testing environment using the reported reproduction steps.",
        f"2. Inspect the call stack around line {line_number} and review variable bindings.",
        "3. Apply defensive null/type checking before executing the problematic operation.",
        "4. Verify exception recovery mechanisms and validate API contracts.",
        "5. Execute the recommended regression unit tests before submitting the patch for review."
    ]

    unit_test_sample = (
        f"def test_{language.lower() if language else 'component'}_edge_case_handling():\n"
        f"    # Test empty input / null boundary condition\n"
        f"    result = handle_request(None)\n"
        f"    assert result is not None, 'Handler must gracefully process missing inputs'\n"
    )

    return {
        "summary": f"Detected a {bug_type} in {language} module: '{title}'. The operation fails when processing inputs under unhandled boundary states.",
        "bug_type": bug_type,
        "root_cause": root_cause,
        "line_numbers": f"Line {line_number}",
        "trigger_conditions": "Triggers when unexpected null, malformed payload, or concurrent race condition occurs.",
        "is_hypothesis": True,
        "recommended_severity": severity,
        "severity_reasoning": severity_reasoning,
        "severity_evidence": severity_evidence,
        "solution_steps": steps,
        "recommended_code_diff": diff_str,
        "original_snippet": orig_code,
        "patched_snippet": patched_code,
        "fix_explanation": "The proposed patch inserts validation guards and defensive checks to prevent unhandled exceptions while preserving function contract integrity.",
        "suggested_unit_tests": unit_test_sample,
        "potential_side_effects": "Low risk; ensure caller functions correctly handle validated error returns and HTTP 400 responses.",
        "recommended_team_name": routing["recommended_team_name"],
        "team_routing_reason": routing["team_routing_reason"],
        "required_expertise": routing["required_expertise"],
        "suggested_priority": routing["suggested_priority"],
        "confidence_score": routing["confidence"],
        "model_name": "Demo Heuristic Engine (Offline Mode)",
        "is_demo_mode": True
    }

async def analyze_bug_with_llm(
    title: str,
    description: str,
    language: str,
    framework: Optional[str],
    error_trace: Optional[str],
    code_snippet: Optional[str],
    environment_info: Optional[str]
) -> Dict[str, Any]:
    """
    Main AI Bug Analysis Entrypoint.
    Integrates with Google Gemini or OpenAI when credentials are present,
    otherwise transparently uses the specialized Heuristic Engine in Demo Mode.
    """
    sanitized_title = sanitize_prompt_input(title)
    sanitized_desc = sanitize_prompt_input(description)
    sanitized_trace = sanitize_prompt_input(error_trace)
    sanitized_code = sanitize_prompt_input(code_snippet)

    # Check if Gemini API Key is available
    if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 10:
        try:
            return await _call_gemini_api(
                sanitized_title, sanitized_desc, language, framework,
                sanitized_trace, sanitized_code, environment_info
            )
        except Exception as e:
            # Fall back to heuristic if API fails or times out
            result = analyze_bug_heuristic(
                title, description, language, framework, error_trace, code_snippet, environment_info
            )
            result["summary"] += f" (Note: Gemini API fallback due to: {str(e)[:60]})"
            return result

    # Check if OpenAI API Key is available
    elif settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 10:
        try:
            return await _call_openai_api(
                sanitized_title, sanitized_desc, language, framework,
                sanitized_trace, sanitized_code, environment_info
            )
        except Exception as e:
            result = analyze_bug_heuristic(
                title, description, language, framework, error_trace, code_snippet, environment_info
            )
            result["summary"] += f" (Note: OpenAI API fallback due to: {str(e)[:60]})"
            return result

    # Default to Demo AI Mode as explicitly requested
    return analyze_bug_heuristic(
        title, description, language, framework, error_trace, code_snippet, environment_info
    )

async def _call_gemini_api(
    title: str, description: str, language: str, framework: Optional[str],
    error_trace: Optional[str], code_snippet: Optional[str], environment_info: Optional[str]
) -> Dict[str, Any]:
    """Invoke Google Gemini REST endpoint for structured triage analysis."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={settings.GEMINI_API_KEY}"
    system_instruction = (
        "You are an expert software triage engineer. Analyze the bug details and respond strictly with valid JSON "
        "matching the requested schema."
    )
    prompt = f"""
Analyze this software bug:
Title: {title}
Description: {description}
Language: {language}
Framework: {framework or 'N/A'}
Error Trace: {error_trace or 'None'}
Code Snippet: {code_snippet or 'None'}
Environment: {environment_info or 'N/A'}

Return a JSON object with:
- summary (string: plain English explanation)
- bug_type (one of: Syntax Error, Runtime Error, Logic Error, Database Error, API or Integration Error, Performance Issue, Security Vulnerability, Configuration Error, Memory Error, Dependency Error)
- root_cause (string)
- line_numbers (string)
- trigger_conditions (string)
- is_hypothesis (boolean: true if AI deduction)
- recommended_severity (one of: P0, P1, P2, P3, P4)
- severity_reasoning (string)
- severity_evidence (string)
- solution_steps (array of strings)
- original_snippet (string)
- patched_snippet (string)
- fix_explanation (string)
- suggested_unit_tests (string)
- potential_side_effects (string)
- recommended_team_name (one of: Backend API Team, Database Engineering Team, Frontend Engineering Team, DevOps & Infrastructure Team, Security Engineering Team, AI/ML Engineering Team, Performance & Reliability Team, General Engineering Team)
- team_routing_reason (string)
- required_expertise (string)
- suggested_priority (string)
- confidence_score (float between 0.0 and 1.0)
"""
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(raw_text)
        
        orig = parsed.get("original_snippet") or code_snippet or ""
        patched = parsed.get("patched_snippet") or ""
        diff_str = generate_unified_diff(orig, patched)
        
        parsed["recommended_code_diff"] = diff_str
        parsed["model_name"] = "Gemini 1.5 Pro"
        parsed["is_demo_mode"] = False
        return parsed

async def _call_openai_api(
    title: str, description: str, language: str, framework: Optional[str],
    error_trace: Optional[str], code_snippet: Optional[str], environment_info: Optional[str]
) -> Dict[str, Any]:
    """Invoke OpenAI REST endpoint for structured triage analysis."""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    prompt = f"""
Analyze this software bug and return strict JSON:
Title: {title}
Description: {description}
Language: {language}
Framework: {framework}
Error Trace: {error_trace}
Code Snippet: {code_snippet}
"""
    payload = {
        "model": "gpt-4o",
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": "You are a senior software bug triage and security engineer."},
            {"role": "user", "content": prompt}
        ]
    }
    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        raw_text = data["choices"][0]["message"]["content"]
        parsed = json.loads(raw_text)

        orig = parsed.get("original_snippet") or code_snippet or ""
        patched = parsed.get("patched_snippet") or ""
        parsed["recommended_code_diff"] = generate_unified_diff(orig, patched)
        parsed["model_name"] = "GPT-4o"
        parsed["is_demo_mode"] = False
        return parsed
