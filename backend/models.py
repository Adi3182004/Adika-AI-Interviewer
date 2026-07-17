import datetime
import json
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Numeric, Text, TypeDecorator
from sqlalchemy.orm import relationship
from .database import Base

class SqliteSafeJSON(TypeDecorator):
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import JSONB
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        try:
            return json.loads(value)
        except Exception:
            return value

class SqliteSafeArray(TypeDecorator):
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import ARRAY
            return dialect.type_descriptor(ARRAY(String))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        try:
            return json.loads(value)
        except Exception:
            return value

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    primary_role = Column(String, default="candidate")
    company_name = Column(String, nullable=True)
    company_size = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    hiring_goals = Column(Text, nullable=True)
    education = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    resumes = relationship("Resume", back_populates="user")
    jobs = relationship("Job", back_populates="recruiter")

class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(String, primary_key=True, default=lambda: str(datetime.datetime.utcnow().timestamp()))
    user_id = Column(String, index=True)
    role = Column(String)

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("profiles.id"), index=True)
    title = Column(String)
    content = Column(SqliteSafeJSON)
    parsed_skills = Column(SqliteSafeArray)
    ats_score = Column(Integer, nullable=True)
    ats_feedback = Column(SqliteSafeJSON, nullable=True)
    targeted_feedback = Column(SqliteSafeJSON, nullable=True)
    is_primary = Column(Boolean, default=False)
    file_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("Profile", back_populates="resumes")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    recruiter_id = Column(String, ForeignKey("profiles.id"), index=True)
    title = Column(String)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)
    seniority = Column(String, nullable=True)
    salary_min = Column(Numeric, nullable=True)
    salary_max = Column(Numeric, nullable=True)
    description = Column(Text, nullable=True)
    skills = Column(SqliteSafeArray)
    status = Column(String, default="published")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    recruiter = relationship("Profile", back_populates="jobs")

class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, index=True)
    job_id = Column(String, ForeignKey("jobs.id"), index=True)
    candidate_id = Column(String, ForeignKey("profiles.id"), index=True)
    resume_id = Column(String, ForeignKey("resumes.id"), nullable=True)
    match_score = Column(Integer, nullable=True)
    skill_gaps = Column(SqliteSafeArray, nullable=True)
    stage = Column(String, default="new")
    cover_note = Column(Text, nullable=True)
    recruiter_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, index=True)
    candidate_id = Column(String, ForeignKey("profiles.id"), index=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)
    role_target = Column(String)
    difficulty = Column(String, default="mid")
    status = Column(String, default="pending")
    question_count = Column(Integer, default=0)
    overall_score = Column(Integer, nullable=True)
    readiness_score = Column(Integer, nullable=True)
    strengths = Column(SqliteSafeArray, nullable=True)
    gaps = Column(SqliteSafeArray, nullable=True)
    summary = Column(Text, nullable=True)
    experience_level = Column(String, nullable=True)
    job_description = Column(Text, nullable=True)
    company = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class InterviewMessage(Base):
    __tablename__ = "interview_messages"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("interview_sessions.id"), index=True)
    role = Column(String)
    content = Column(Text)
    score = Column(Integer, nullable=True)
    signals = Column(SqliteSafeJSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class LearningItem(Base):
    __tablename__ = "learning_items"

    id = Column(String, primary_key=True, index=True)
    candidate_id = Column(String, ForeignKey("profiles.id"), index=True)
    skill = Column(String)
    source_session_id = Column(String, ForeignKey("interview_sessions.id"), nullable=True)
    status = Column(String, default="todo")
    roadmap = Column(SqliteSafeJSON, nullable=True)
    resource_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
