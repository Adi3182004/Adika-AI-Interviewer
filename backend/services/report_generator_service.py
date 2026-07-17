import io
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_interview_pdf_report(session: Dict[str, Any], messages: List[Dict[str, Any]]) -> bytes:
    buffer = io.BytesIO()
    
    # Page setup
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        name="TitleStyle",
        parent=styles["Heading1"],
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=12
    )
    
    subtitle_style = ParagraphStyle(
        name="SubtitleStyle",
        parent=styles["Normal"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=18
    )
    
    heading_style = ParagraphStyle(
        name="HeadingStyle",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        name="BodyStyle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155")
    )
    
    story = []
    
    # 1. Title Block
    role = session.get("role_target", "Software Engineer")
    company = session.get("company", "Adika Talent Labs")
    story.append(Paragraph(f"Adika AI — Technical Evaluation Report", title_style))
    story.append(Paragraph(f"Target Role: {role} | Employer: {company}", subtitle_style))
    story.append(Spacer(1, 12))
    
    # 2. Score Summary Table
    score = session.get("overall_score") or 0
    readiness = session.get("readiness_score") or 0
    summary = session.get("summary", "No evaluation summary recorded.")
    
    summary_data = [
        [Paragraph("<b>Overall Evaluation Score:</b>", body_style), f"{score}/100"],
        [Paragraph("<b>Readiness Rating:</b>", body_style), f"{readiness}/100"],
        [Paragraph("<b>Recruiter Summary:</b>", body_style), Paragraph(summary, body_style)]
    ]
    
    summary_table = Table(summary_data, colWidths=[150, 390])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    
    story.append(Paragraph("Performance Dashboard Summary", heading_style))
    story.append(summary_table)
    story.append(Spacer(1, 15))
    
    # 3. Strengths & Gaps
    strengths = session.get("strengths", []) or []
    gaps = session.get("gaps", []) or []
    
    strengths_text = ", ".join(strengths) if strengths else "None noted."
    gaps_text = ", ".join(gaps) if gaps else "None noted."
    
    skills_data = [
        [Paragraph("<b>Key Strengths:</b>", body_style), Paragraph(strengths_text, body_style)],
        [Paragraph("<b>Identified Gaps:</b>", body_style), Paragraph(gaps_text, body_style)]
    ]
    
    skills_table = Table(skills_data, colWidths=[150, 390])
    skills_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    
    story.append(Paragraph("Competency & Skills Mapping", heading_style))
    story.append(skills_table)
    story.append(Spacer(1, 15))
    
    # 4. Transcripts Table
    story.append(Paragraph("Interview Turn Transcript & Grading Logs", heading_style))
    
    transcript_data = [
        [Paragraph("<b>Role</b>", body_style), Paragraph("<b>Message Transcript Content</b>", body_style), Paragraph("<b>Score</b>", body_style)]
    ]
    
    for idx, msg in enumerate(messages):
        role_label = "Interviewer" if msg.get("role") == "assistant" else "Candidate"
        text = msg.get("content", "")
        m_score = msg.get("score")
        score_val = f"{m_score}/100" if m_score is not None else "-"
        
        transcript_data.append([
            Paragraph(f"<b>{role_label}</b>", body_style),
            Paragraph(text, body_style),
            score_val
        ])
        
    transcript_table = Table(transcript_data, colWidths=[90, 390, 60])
    transcript_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    
    story.append(transcript_table)
    
    # Build Document
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
