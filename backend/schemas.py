from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

# Requests
class AnalyzeResumeRequest(BaseModel):
    resumeId: str

class ImproveSectionRequest(BaseModel):
    section: str
    current: str
    role: Optional[str] = None

class MatchJobRequest(BaseModel):
    jobId: str
    resumeId: str

class InterviewTurnRequest(BaseModel):
    sessionId: str
    userAnswer: Optional[str] = None

class SummarizeCandidateRequest(BaseModel):
    applicationId: str

class UploadParseResumeRequest(BaseModel):
    title: str
    fileName: str
    fileType: str
    fileDataUrl: str

class AnalyzeResumeForRoleRequest(BaseModel):
    resumeId: str
    role: str
    company: Optional[str] = None
    experienceLevel: str
    jobDescription: Optional[str] = None

class GenerateRoadmapRequest(BaseModel):
    itemId: str
    resumeId: Optional[str] = None

class GenerateGapAnalysisRequest(BaseModel):
    resumeId: str
    role: str
    company: Optional[str] = None

# Responses
class StandardResponse(BaseModel):
    status: str
    message: Optional[str] = None

class ImproveSectionResponse(BaseModel):
    improved: str

class ResumeUploadResponse(BaseModel):
    resumeId: str
