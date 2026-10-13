from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

# ----------------- User & Auth Schemas -----------------
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role_requested: Optional[str] = None  # UI hint; validated strictly via database role

class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "developer"  # admin, reporter, developer
    team_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    is_active: bool
    avatar_color: Optional[str] = "#3b82f6"
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserRoleUpdate(BaseModel):
    role: str
    team_id: Optional[int] = None

# ----------------- Team Schemas -----------------
class TeamMemberResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str

    class Config:
        from_attributes = True

class TeamResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    color: str
    lead_id: Optional[int] = None
    member_count: Optional[int] = 0
    bug_count: Optional[int] = 0
    members: Optional[List[TeamMemberResponse]] = []

    class Config:
        from_attributes = True

class TeamCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"

# ----------------- Attachment Schemas -----------------
class AttachmentResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    file_size: int
    file_type: str
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- AI Analysis Schemas -----------------
class AIAnalysisResponse(BaseModel):
    id: int
    bug_id: int
    summary: str
    bug_type: str
    root_cause: str
    line_numbers: Optional[str] = None
    trigger_conditions: Optional[str] = None
    is_hypothesis: bool
    recommended_severity: str
    severity_reasoning: str
    severity_evidence: str
    solution_steps: Any  # list of strings or JSON
    recommended_code_diff: Optional[str] = None
    original_snippet: Optional[str] = None
    patched_snippet: Optional[str] = None
    fix_explanation: str
    suggested_unit_tests: Optional[str] = None
    potential_side_effects: Optional[str] = None
    recommended_team_name: str
    team_routing_reason: str
    required_expertise: Optional[str] = None
    suggested_priority: Optional[str] = None
    confidence_score: float
    model_name: str
    is_demo_mode: bool
    helpful_count: int
    unhelpful_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class AIFeedbackCreate(BaseModel):
    is_helpful: bool
    feedback_text: Optional[str] = None

# ----------------- Comments & History Schemas -----------------
class CommentCreate(BaseModel):
    message: str
    is_technical: bool = False

class CommentResponse(BaseModel):
    id: int
    bug_id: int
    user_id: int
    user_name: str
    user_role: str
    message: str
    is_technical: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StatusHistoryResponse(BaseModel):
    id: int
    old_status: str
    new_status: str
    notes: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Bug Schemas -----------------
class BugCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    language: Optional[str] = "Python"
    framework: Optional[str] = None
    steps_to_reproduce: Optional[str] = None
    expected_behavior: Optional[str] = None
    actual_behavior: Optional[str] = None
    error_trace: Optional[str] = None
    environment_info: Optional[str] = None
    code_snippet: Optional[str] = None

class BugStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    resolution_notes: Optional[str] = None

class BugSeverityOverride(BaseModel):
    severity: str  # P0, P1, P2, P3, P4
    reason: str

class BugReassign(BaseModel):
    team_id: Optional[int] = None
    developer_id: Optional[int] = None
    reason: Optional[str] = None

class BugResponse(BaseModel):
    id: int
    bug_code: str
    title: str
    description: str
    language: Optional[str] = None
    framework: Optional[str] = None
    severity: str
    original_severity: str
    severity_override_reason: Optional[str] = None
    status: str
    reporter_id: int
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    assigned_team_id: Optional[int] = None
    assigned_team_name: Optional[str] = None
    assigned_team_color: Optional[str] = None
    assigned_developer_id: Optional[int] = None
    assigned_developer_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BugDetailResponse(BugResponse):
    steps_to_reproduce: Optional[str] = None
    expected_behavior: Optional[str] = None
    actual_behavior: Optional[str] = None
    error_trace: Optional[str] = None
    environment_info: Optional[str] = None
    code_snippet: Optional[str] = None
    resolution_notes: Optional[str] = None
    ai_analysis: Optional[AIAnalysisResponse] = None
    attachments: List[AttachmentResponse] = []
    comments: List[CommentResponse] = []
    status_history: List[StatusHistoryResponse] = []

# ----------------- Audit & Notification Schemas -----------------
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    bug_id: Optional[int] = None
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Dashboard & Analytics Schemas -----------------
class OverviewStats(BaseModel):
    total_bugs: int
    open_bugs: int
    critical_bugs: int
    resolved_bugs: int
    avg_resolution_time_hours: float
    triaged_rate_percent: float
    ai_accuracy_percent: float
    total_feedback_count: int
    helpful_feedback_count: int

class AnalyticsChartsData(BaseModel):
    severity_distribution: dict
    status_distribution: dict
    bugs_by_team: List[dict]
    bugs_over_time: List[dict]
    ai_accuracy_metrics: dict
