import os
import uuid
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import (
    User, Bug, AIAnalysis, Team, Attachment, Comment, StatusHistory, AuditLog, Notification
)
from backend.app.schemas import (
    BugCreate, BugResponse, BugDetailResponse, BugStatusUpdate, BugSeverityOverride,
    BugReassign, CommentCreate, CommentResponse
)
from backend.app.auth import get_current_user
from backend.app.ai_service import analyze_bug_with_llm

router = APIRouter(prefix="/api/bugs", tags=["Bugs"])

ALLOWED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".cpp", ".c", ".h",
    ".cs", ".go", ".rs", ".rb", ".php", ".sql", ".html", ".css", ".json",
    ".txt", ".log", ".md", ".png", ".jpg", ".jpeg", ".webp"
}

def format_bug_summary(bug: Bug) -> dict:
    return {
        "id": bug.id,
        "bug_code": bug.bug_code,
        "title": bug.title,
        "description": bug.description,
        "language": bug.language,
        "framework": bug.framework,
        "severity": bug.severity,
        "original_severity": bug.original_severity,
        "severity_override_reason": bug.severity_override_reason,
        "status": bug.status,
        "reporter_id": bug.reporter_id,
        "reporter_name": bug.reporter.full_name if bug.reporter else "Unknown",
        "reporter_email": bug.reporter.email if bug.reporter else None,
        "assigned_team_id": bug.assigned_team_id,
        "assigned_team_name": bug.assigned_team.name if bug.assigned_team else "Unassigned",
        "assigned_team_color": bug.assigned_team.color if bug.assigned_team else "#64748b",
        "assigned_developer_id": bug.assigned_developer_id,
        "assigned_developer_name": bug.assigned_developer.full_name if bug.assigned_developer else None,
        "created_at": bug.created_at,
        "updated_at": bug.updated_at
    }

def format_bug_detail(bug: Bug) -> dict:
    base = format_bug_summary(bug)
    base.update({
        "steps_to_reproduce": bug.steps_to_reproduce,
        "expected_behavior": bug.expected_behavior,
        "actual_behavior": bug.actual_behavior,
        "error_trace": bug.error_trace,
        "environment_info": bug.environment_info,
        "code_snippet": bug.code_snippet,
        "resolution_notes": bug.resolution_notes,
        "ai_analysis": None,
        "attachments": [],
        "comments": [],
        "status_history": []
    })

    if bug.ai_analysis:
        analysis = bug.ai_analysis
        steps = []
        try:
            steps = json.loads(analysis.solution_steps) if analysis.solution_steps else []
        except Exception:
            steps = [analysis.solution_steps]

        base["ai_analysis"] = {
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

    base["attachments"] = [
        {
            "id": att.id,
            "filename": att.filename,
            "original_name": att.original_name,
            "file_size": att.file_size,
            "file_type": att.file_type,
            "created_at": att.created_at
        } for att in bug.attachments
    ]

    base["comments"] = [
        {
            "id": c.id,
            "bug_id": c.bug_id,
            "user_id": c.user_id,
            "user_name": c.user.full_name if c.user else "User",
            "user_role": c.user.role if c.user else "developer",
            "message": c.message,
            "is_technical": c.is_technical,
            "created_at": c.created_at
        } for c in sorted(bug.comments, key=lambda x: x.created_at)
    ]

    base["status_history"] = [
        {
            "id": sh.id,
            "old_status": sh.old_status,
            "new_status": sh.new_status,
            "notes": sh.notes,
            "user_id": sh.user_id,
            "user_name": "System" if not sh.user_id else ("User"),
            "created_at": sh.created_at
        } for sh in sorted(bug.status_history, key=lambda x: x.created_at)
    ]

    return base

@router.get("", response_model=List[BugResponse])
def get_bugs(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    team_id: Optional[int] = None,
    reporter_id: Optional[int] = None,
    assigned_to_me: Optional[bool] = False,
    assigned_to_my_team: Optional[bool] = False,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Bug)

    # Role-based scoping: Reporters can only view their own reports unless admin
    if current_user.role == "reporter":
        query = query.filter(Bug.reporter_id == current_user.id)
    elif assigned_to_me and current_user.role == "developer":
        query = query.filter(Bug.assigned_developer_id == current_user.id)
    elif assigned_to_my_team and current_user.team_id:
        query = query.filter(Bug.assigned_team_id == current_user.team_id)

    if status and status != "All":
        query = query.filter(Bug.status == status)
    if severity and severity != "All":
        query = query.filter(Bug.severity == severity)
    if team_id:
        query = query.filter(Bug.assigned_team_id == team_id)
    if reporter_id and current_user.role == "admin":
        query = query.filter(Bug.reporter_id == reporter_id)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Bug.title.ilike(search_filter),
                Bug.bug_code.ilike(search_filter),
                Bug.description.ilike(search_filter),
                Bug.language.ilike(search_filter)
            )
        )

    bugs = query.order_by(desc(Bug.created_at)).all()
    return [format_bug_summary(b) for b in bugs]

@router.post("", response_model=BugDetailResponse)
async def create_bug(
    bug_in: BugCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Determine next bug code (e.g. BUG-1001)
    last_bug = db.query(Bug).order_by(desc(Bug.id)).first()
    next_id = (last_bug.id + 1) if last_bug else 1
    bug_code = f"BUG-{1000 + next_id}"

    # Initial Bug entity in 'Submitted' state
    bug = Bug(
        bug_code=bug_code,
        title=bug_in.title,
        description=bug_in.description,
        language=bug_in.language or "Python",
        framework=bug_in.framework,
        steps_to_reproduce=bug_in.steps_to_reproduce,
        expected_behavior=bug_in.expected_behavior,
        actual_behavior=bug_in.actual_behavior,
        error_trace=bug_in.error_trace,
        environment_info=bug_in.environment_info,
        code_snippet=bug_in.code_snippet,
        severity="P2",
        original_severity="P2",
        status="Submitted",
        reporter_id=current_user.id
    )
    db.add(bug)
    db.commit()
    db.refresh(bug)

    # Record initial status history
    h1 = StatusHistory(
        bug_id=bug.id,
        user_id=current_user.id,
        old_status="None",
        new_status="Submitted",
        notes="Bug report submitted by user"
    )
    db.add(h1)

    # 2. Run AI Bug Analysis Engine
    ai_result = await analyze_bug_with_llm(
        title=bug.title,
        description=bug.description,
        language=bug.language,
        framework=bug.framework,
        error_trace=bug.error_trace,
        code_snippet=bug.code_snippet,
        environment_info=bug.environment_info
    )

    # Update severity based on AI analysis
    ai_severity = ai_result.get("recommended_severity", "P2")
    bug.severity = ai_severity
    bug.original_severity = ai_severity

    # Resolve recommended team
    rec_team_name = ai_result.get("recommended_team_name", "General Engineering Team")
    team = db.query(Team).filter(Team.name == rec_team_name).first()
    if not team:
        # Fallback to general engineering or first available
        team = db.query(Team).filter(Team.name == "General Engineering Team").first()
        if not team:
            team = db.query(Team).first()

    if team:
        bug.assigned_team_id = team.id

    # Auto-advance lifecycle: Submitted -> Analyzing -> Triaged -> Assigned
    bug.status = "Assigned" if bug.assigned_team_id else "Triaged"

    h2 = StatusHistory(
        bug_id=bug.id,
        user_id=None,
        old_status="Submitted",
        new_status=bug.status,
        notes=f"Automated AI triage completed. Classified as {bug.severity} and routed to {rec_team_name}."
    )
    db.add(h2)

    # Persist AI Analysis Record
    ai_record = AIAnalysis(
        bug_id=bug.id,
        summary=ai_result.get("summary", ""),
        bug_type=ai_result.get("bug_type", "Runtime Error"),
        root_cause=ai_result.get("root_cause", ""),
        line_numbers=ai_result.get("line_numbers", ""),
        trigger_conditions=ai_result.get("trigger_conditions", ""),
        is_hypothesis=ai_result.get("is_hypothesis", True),
        recommended_severity=ai_severity,
        severity_reasoning=ai_result.get("severity_reasoning", ""),
        severity_evidence=ai_result.get("severity_evidence", ""),
        solution_steps=json.dumps(ai_result.get("solution_steps", [])),
        recommended_code_diff=ai_result.get("recommended_code_diff", ""),
        original_snippet=ai_result.get("original_snippet", ""),
        patched_snippet=ai_result.get("patched_snippet", ""),
        fix_explanation=ai_result.get("fix_explanation", ""),
        suggested_unit_tests=ai_result.get("suggested_unit_tests", ""),
        potential_side_effects=ai_result.get("potential_side_effects", ""),
        recommended_team_name=rec_team_name,
        team_routing_reason=ai_result.get("team_routing_reason", ""),
        required_expertise=ai_result.get("required_expertise", ""),
        suggested_priority=ai_result.get("suggested_priority", ""),
        confidence_score=ai_result.get("confidence_score", 0.90),
        model_name=ai_result.get("model_name", "AI Analysis Engine"),
        is_demo_mode=ai_result.get("is_demo_mode", False)
    )
    db.add(ai_record)

    # Create notifications
    notif = Notification(
        user_id=current_user.id,
        bug_id=bug.id,
        title=f"Bug {bug.bug_code} Triaged",
        message=f"AI analysis finished: Severity {bug.severity}, Assigned to {rec_team_name}.",
        notification_type="assignment"
    )
    db.add(notif)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="BUG_CREATED",
        entity_type="Bug",
        entity_id=str(bug.id),
        details=f"Created {bug.bug_code}: '{bug.title}' with severity {bug.severity}"
    )
    db.add(audit)

    db.commit()
    db.refresh(bug)

    return format_bug_detail(bug)

@router.get("/{id}", response_model=BugDetailResponse)
def get_bug_by_id(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bug = db.query(Bug).filter(Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found.")

    if current_user.role == "reporter" and bug.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to view this bug.")

    return format_bug_detail(bug)

@router.put("/{id}/status", response_model=BugDetailResponse)
def update_bug_status(
    id: int,
    status_update: BugStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bug = db.query(Bug).filter(Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found.")

    if current_user.role not in ["admin", "developer"]:
        raise HTTPException(status_code=403, detail="Only developers or admins can transition bug statuses.")

    old_status = bug.status
    bug.status = status_update.status

    if status_update.resolution_notes:
        bug.resolution_notes = status_update.resolution_notes

    # Record history
    sh = StatusHistory(
        bug_id=bug.id,
        user_id=current_user.id,
        old_status=old_status,
        new_status=bug.status,
        notes=status_update.notes or f"Status changed to {bug.status}"
    )
    db.add(sh)

    # Notify reporter
    notif = Notification(
        user_id=bug.reporter_id,
        bug_id=bug.id,
        title=f"Bug {bug.bug_code} Status Updated",
        message=f"Status transitioned from '{old_status}' to '{bug.status}'.",
        notification_type="status_change"
    )
    db.add(notif)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="BUG_STATUS_UPDATED",
        entity_type="Bug",
        entity_id=str(bug.id),
        details=f"Status updated from '{old_status}' to '{bug.status}'"
    )
    db.add(audit)

    db.commit()
    db.refresh(bug)
    return format_bug_detail(bug)

@router.put("/{id}/severity", response_model=BugDetailResponse)
def override_severity(
    id: int,
    override: BugSeverityOverride,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bug = db.query(Bug).filter(Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found.")

    if current_user.role not in ["admin", "developer"]:
        raise HTTPException(status_code=403, detail="Permission denied to override severity.")

    if not override.reason or len(override.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="A recorded reason of at least 5 characters is required to override severity.")

    old_sev = bug.severity
    bug.severity = override.severity
    bug.severity_override_reason = override.reason

    audit = AuditLog(
        user_id=current_user.id,
        action="SEVERITY_OVERRIDDEN",
        entity_type="Bug",
        entity_id=str(bug.id),
        details=f"Severity overridden from {old_sev} to {bug.severity}. Reason: {override.reason}"
    )
    db.add(audit)
    db.commit()
    db.refresh(bug)
    return format_bug_detail(bug)

@router.put("/{id}/reassign", response_model=BugDetailResponse)
def reassign_bug(
    id: int,
    reassign: BugReassign,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bug = db.query(Bug).filter(Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found.")

    if current_user.role not in ["admin", "developer"]:
        raise HTTPException(status_code=403, detail="Permission denied to reassign bug.")

    old_team_name = bug.assigned_team.name if bug.assigned_team else "None"
    if reassign.team_id:
        team = db.query(Team).filter(Team.id == reassign.team_id).first()
        if team:
            bug.assigned_team_id = team.id

    if reassign.developer_id is not None:
        if reassign.developer_id == 0:
            bug.assigned_developer_id = None
        else:
            dev = db.query(User).filter(User.id == reassign.developer_id).first()
            if dev:
                bug.assigned_developer_id = dev.id

    audit = AuditLog(
        user_id=current_user.id,
        action="BUG_REASSIGNED",
        entity_type="Bug",
        entity_id=str(bug.id),
        details=f"Reassigned from {old_team_name} to Team #{reassign.team_id}, Dev #{reassign.developer_id}. Reason: {reassign.reason or 'Manual review'}"
    )
    db.add(audit)
    db.commit()
    db.refresh(bug)
    return format_bug_detail(bug)

@router.post("/{id}/comments", response_model=CommentResponse)
def add_comment(
    id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bug = db.query(Bug).filter(Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found.")

    comment = Comment(
        bug_id=bug.id,
        user_id=current_user.id,
        message=comment_in.message,
        is_technical=comment_in.is_technical
    )
    db.add(comment)

    # Notify bug reporter if commented by developer/admin
    if current_user.id != bug.reporter_id:
        notif = Notification(
            user_id=bug.reporter_id,
            bug_id=bug.id,
            title=f"New comment on {bug.bug_code}",
            message=f"{current_user.full_name}: {comment_in.message[:80]}...",
            notification_type="comment"
        )
        db.add(notif)

    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "bug_id": comment.bug_id,
        "user_id": comment.user_id,
        "user_name": current_user.full_name,
        "user_role": current_user.role,
        "message": comment.message,
        "is_technical": comment.is_technical,
        "created_at": comment.created_at
    }

@router.post("/{id}/upload")
async def upload_attachment(
    id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bug = db.query(Bug).filter(Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found.")

    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '{ext}' is not permitted. Permitted types: code, logs, screenshots."
        )

    # Read and check size
    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # Save safely
    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, safe_name)
    with open(dest_path, "wb") as f:
        f.write(contents)

    attachment = Attachment(
        bug_id=bug.id,
        filename=safe_name,
        original_name=file.filename,
        file_size=len(contents),
        file_type=file.content_type or ext,
        file_path=dest_path,
        uploaded_by_id=current_user.id
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "id": attachment.id,
        "filename": attachment.filename,
        "original_name": attachment.original_name,
        "file_size": attachment.file_size,
        "file_type": attachment.file_type,
        "created_at": attachment.created_at
    }

@router.get("/{id}/attachments/{att_id}/download")
def download_attachment(
    id: int,
    att_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attachment = db.query(Attachment).filter(Attachment.id == att_id, Attachment.bug_id == id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found.")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File content missing from disk.")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.original_name,
        media_type=attachment.file_type
    )
