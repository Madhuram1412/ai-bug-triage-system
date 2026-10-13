from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="developer")  # "admin", "reporter", "developer"
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    avatar_color = Column(String(20), default="#3b82f6")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("Team", back_populates="members", foreign_keys=[team_id])
    reported_bugs = relationship("Bug", back_populates="reporter", foreign_keys="Bug.reporter_id")
    assigned_bugs = relationship("Bug", back_populates="assigned_developer", foreign_keys="Bug.assigned_developer_id")
    comments = relationship("Comment", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#6366f1")
    lead_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("User", back_populates="team", foreign_keys="User.team_id")
    bugs = relationship("Bug", back_populates="assigned_team")


class Bug(Base):
    __tablename__ = "bugs"

    id = Column(Integer, primary_key=True, index=True)
    bug_code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    language = Column(String(50), default="Python")
    framework = Column(String(100), nullable=True)
    steps_to_reproduce = Column(Text, nullable=True)
    expected_behavior = Column(Text, nullable=True)
    actual_behavior = Column(Text, nullable=True)
    error_trace = Column(Text, nullable=True)
    environment_info = Column(Text, nullable=True)
    code_snippet = Column(Text, nullable=True)

    severity = Column(String(10), default="P2")  # P0, P1, P2, P3, P4
    original_severity = Column(String(10), default="P2")
    severity_override_reason = Column(Text, nullable=True)

    # Lifecycle: Submitted -> Analyzing -> Triaged -> Assigned -> In Progress -> In Review -> Resolved -> Closed -> Reopened
    status = Column(String(50), default="Submitted")

    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    assigned_developer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reporter = relationship("User", back_populates="reported_bugs", foreign_keys=[reporter_id])
    assigned_team = relationship("Team", back_populates="bugs", foreign_keys=[assigned_team_id])
    assigned_developer = relationship("User", back_populates="assigned_bugs", foreign_keys=[assigned_developer_id])

    ai_analysis = relationship("AIAnalysis", back_populates="bug", uselist=False, cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="bug", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="bug", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="bug", cascade="all, delete-orphan")
    ai_feedbacks = relationship("AIFeedback", back_populates="bug", cascade="all, delete-orphan")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    bug_id = Column(Integer, ForeignKey("bugs.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(100), nullable=False)
    file_path = Column(String(500), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bug = relationship("Bug", back_populates="attachments")


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    bug_id = Column(Integer, ForeignKey("bugs.id"), unique=True, nullable=False)
    
    # Bug Summary
    summary = Column(Text, nullable=False)
    
    # Bug Type Classification
    bug_type = Column(String(100), nullable=False)  # Syntax Error, Runtime Error, Logic Error, etc.
    
    # Root Cause Analysis
    root_cause = Column(Text, nullable=False)
    line_numbers = Column(String(100), nullable=True)
    trigger_conditions = Column(Text, nullable=True)
    is_hypothesis = Column(Boolean, default=True)
    
    # Severity Classification
    recommended_severity = Column(String(10), nullable=False)
    severity_reasoning = Column(Text, nullable=False)
    severity_evidence = Column(Text, nullable=False)
    
    # AI-Generated Solution & Code Diff
    solution_steps = Column(Text, nullable=False)  # JSON array string
    recommended_code_diff = Column(Text, nullable=True)
    original_snippet = Column(Text, nullable=True)
    patched_snippet = Column(Text, nullable=True)
    fix_explanation = Column(Text, nullable=False)
    suggested_unit_tests = Column(Text, nullable=True)
    potential_side_effects = Column(Text, nullable=True)
    
    # Team Assignment Recommendation
    recommended_team_name = Column(String(100), nullable=False)
    team_routing_reason = Column(Text, nullable=False)
    required_expertise = Column(String(255), nullable=True)
    suggested_priority = Column(String(50), nullable=True)
    
    # Metadata & Evaluation
    confidence_score = Column(Float, default=0.92)
    model_name = Column(String(100), default="Gemini 1.5 Pro")
    is_demo_mode = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)
    unhelpful_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    bug = relationship("Bug", back_populates="ai_analysis")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    bug_id = Column(Integer, ForeignKey("bugs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_technical = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bug = relationship("Bug", back_populates="comments")
    user = relationship("User", back_populates="comments")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    bug_id = Column(Integer, ForeignKey("bugs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    old_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    bug = relationship("Bug", back_populates="status_history")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bug_id = Column(Integer, ForeignKey("bugs.id"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class AIFeedback(Base):
    __tablename__ = "ai_feedback"

    id = Column(Integer, primary_key=True, index=True)
    bug_id = Column(Integer, ForeignKey("bugs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_helpful = Column(Boolean, nullable=False)
    feedback_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    bug = relationship("Bug", back_populates="ai_feedbacks")
