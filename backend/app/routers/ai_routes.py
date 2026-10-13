from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from backend.app.database import get_db
from backend.app.models import Bug, AIAnalysis, AIFeedback, User, AuditLog
from backend.app.schemas import AIFeedbackCreate, AIAnalysisResponse
from backend.app.auth import get_current_user
from backend.app.ai_service import analyze_bug_with_llm

router = APIRouter(prefix="/api/ai", tags=["AI Engine"])

@router.post("/feedback/{bug_id}")
def record_ai_feedback(
    bug_id: int,
    feedback: AIFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bug = db.query(Bug).filter(Bug.id == bug_id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found.")

    analysis = bug.ai_analysis
    if not analysis:
        raise HTTPException(status_code=400, detail="Bug does not have an AI analysis record.")

    # Record feedback entry
    fb_entry = AIFeedback(
        bug_id=bug.id,
        user_id=current_user.id,
        is_helpful=feedback.is_helpful,
        feedback_text=feedback.feedback_text
    )
    db.add(fb_entry)

    if feedback.is_helpful:
        analysis.helpful_count += 1
    else:
        analysis.unhelpful_count += 1

    audit = AuditLog(
        user_id=current_user.id,
        action="AI_FEEDBACK_SUBMITTED",
        entity_type="AIAnalysis",
        entity_id=str(analysis.id),
        details=f"Rated helpful={feedback.is_helpful}. Note: {feedback.feedback_text or 'None'}"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "helpful_count": analysis.helpful_count,
        "unhelpful_count": analysis.unhelpful_count,
        "message": "Thank you! Your feedback will help improve future AI triage accuracy."
    }

@router.post("/re-analyze/{bug_id}", response_model=AIAnalysisResponse)
async def reanalyze_bug(
    bug_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bug = db.query(Bug).filter(Bug.id == bug_id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found.")

    ai_result = await analyze_bug_with_llm(
        title=bug.title,
        description=bug.description,
        language=bug.language,
        framework=bug.framework,
        error_trace=bug.error_trace,
        code_snippet=bug.code_snippet,
        environment_info=bug.environment_info
    )

    analysis = bug.ai_analysis
    if not analysis:
        analysis = AIAnalysis(bug_id=bug.id)
        db.add(analysis)

    analysis.summary = ai_result.get("summary", "")
    analysis.bug_type = ai_result.get("bug_type", "Runtime Error")
    analysis.root_cause = ai_result.get("root_cause", "")
    analysis.line_numbers = ai_result.get("line_numbers", "")
    analysis.trigger_conditions = ai_result.get("trigger_conditions", "")
    analysis.is_hypothesis = ai_result.get("is_hypothesis", True)
    analysis.recommended_severity = ai_result.get("recommended_severity", "P2")
    analysis.severity_reasoning = ai_result.get("severity_reasoning", "")
    analysis.severity_evidence = ai_result.get("severity_evidence", "")
    analysis.solution_steps = json.dumps(ai_result.get("solution_steps", []))
    analysis.recommended_code_diff = ai_result.get("recommended_code_diff", "")
    analysis.original_snippet = ai_result.get("original_snippet", "")
    analysis.patched_snippet = ai_result.get("patched_snippet", "")
    analysis.fix_explanation = ai_result.get("fix_explanation", "")
    analysis.suggested_unit_tests = ai_result.get("suggested_unit_tests", "")
    analysis.potential_side_effects = ai_result.get("potential_side_effects", "")
    analysis.recommended_team_name = ai_result.get("recommended_team_name", "General Engineering Team")
    analysis.team_routing_reason = ai_result.get("team_routing_reason", "")
    analysis.required_expertise = ai_result.get("required_expertise", "")
    analysis.suggested_priority = ai_result.get("suggested_priority", "")
    analysis.confidence_score = ai_result.get("confidence_score", 0.90)
    analysis.model_name = ai_result.get("model_name", "AI Analysis Engine")
    analysis.is_demo_mode = ai_result.get("is_demo_mode", False)

    db.commit()
    db.refresh(analysis)

    steps = []
    try:
        steps = json.loads(analysis.solution_steps)
    except Exception:
        steps = [analysis.solution_steps]

    return {
        "id": analysis.id,
        "bug_id": analysis.bug_id,
        "summary": analysis.summary,
        "bug_type": analysis.bug_type,
        "root_cause": analysis.root_cause,
        "line_numbers": analysis.line_numbers,
        "trigger_conditions": analysis.trigger_conditions,
        "is_hypothesis": analysis.is_hypothesis,
        "recommended_severity": analysis.recommended_severity,
        "severity_reasoning": analysis.severity_reasoning,
        "severity_evidence": analysis.severity_evidence,
        "solution_steps": steps,
        "recommended_code_diff": analysis.recommended_code_diff,
        "original_snippet": analysis.original_snippet,
        "patched_snippet": analysis.patched_snippet,
        "fix_explanation": analysis.fix_explanation,
        "suggested_unit_tests": analysis.suggested_unit_tests,
        "potential_side_effects": analysis.potential_side_effects,
        "recommended_team_name": analysis.recommended_team_name,
        "team_routing_reason": analysis.team_routing_reason,
        "required_expertise": analysis.required_expertise,
        "suggested_priority": analysis.suggested_priority,
        "confidence_score": analysis.confidence_score,
        "model_name": analysis.model_name,
        "is_demo_mode": analysis.is_demo_mode,
        "helpful_count": analysis.helpful_count,
        "unhelpful_count": analysis.unhelpful_count,
        "created_at": analysis.created_at
    }
