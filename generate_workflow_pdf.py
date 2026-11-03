# generate_workflow_pdf.py
import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "College Bus Management System (CBMS) — Role Workflow & Architecture Specification")
            self.setStrokeColor(colors.HexColor("#1e293b"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
        # Footer
        self.setStrokeColor(colors.HexColor("#1e293b"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Confidential — Internal Architecture & Operational Specification v1.2")
        self.drawRightString(558, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def create_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=60,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#475569'),
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#047857'),
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#334155'),
        leftIndent=12,
        spaceAfter=3
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1e293b')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0f172a')
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#0369a1')
    )

    diagram_style = ParagraphStyle(
        'DiagramStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.2,
        leading=9.5,
        textColor=colors.HexColor('#0f172a')
    )

    story = []

    # TITLE & METADATA BANNER
    story.append(Paragraph("College Bus Management System (CBMS)", title_style))
    story.append(Paragraph("Complete Role Workflows, Situation Handling & State Transitions Specification", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=2, spaceAfter=12))

    # EXECUTIVE SUMMARY
    story.append(Paragraph("1. System Overview & Multi-Actor Paradigm", h1_style))
    story.append(Paragraph(
        "The College Bus Management System (CBMS) coordinates four distinct human actors across hardware telemetry, "
        "trip state transitions, academic compliance, and safety grievance workflows. The backend serves as the frozen, "
        "single source of truth enforcing 48 validated REST endpoints across an immutable audit ledger.",
        body_style
    ))

    overview_data = [
        [Paragraph("Role", table_header), Paragraph("Primary Scope & Responsibilities", table_header), Paragraph("Key Constraints & Security Invariants", table_header)],
        [Paragraph("<b>Student</b>", table_cell), Paragraph("View assigned bus, live telemetry map, route progress, ETAs, submit grievance reports, file delay attendance excuses.", table_cell), Paragraph("No GPS telemetry emitted. Client clock never trusted for staleness. View locked to assigned bus/route only.", table_cell)],
        [Paragraph("<b>Representative (Rep)</b>", table_cell), Paragraph("Student promoted to primary/vice rep. Manages trip lifecycle, broadcasts live GPS pings, fallback stop check-ins, transit delays, handover.", table_cell), Paragraph("HTTPS only with Screen Wake Lock. Early trip termination requires >=10 char reason. Dual-rep concurrency control.", table_cell)],
        [Paragraph("<b>Staff / Faculty</b>", table_cell), Paragraph("Review transit excuse attendance requests, verify automated bus delay badges, view passenger roster, access announcements.", table_cell), Paragraph("Read-only transit access. Can only approve/reject attendance requests for enrolled courses.", table_cell)],
        [Paragraph("<b>Admin</b>", table_cell), Paragraph("Fleet provisioning, route geometry, bus assignment, representative elevation, grievance resolution, security audit inspections.", table_cell), Paragraph("Desktop-first portal. Role strictly verified via server session. Immutable audit log recorded on every write action.", table_cell)],
    ]
    t_overview = Table(overview_data, colWidths=[80, 224, 200])
    t_overview.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#065f46')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_overview)
    story.append(Spacer(1, 10))

    # SECTION 2: STUDENT WORKFLOW
    story.append(Paragraph("2. Student Workflow & State Handling", h1_style))
    story.append(Paragraph("<b>2.1 Core Lifecycle Sequence</b>", h2_style))
    story.append(Paragraph("1. <b>Session Initialization:</b> Student authenticates via <code>POST /api/auth/login</code>. Client loads session profile from <code>GET /api/auth/me</code>.", bullet_style))
    story.append(Paragraph("2. <b>Assignment Retrieval:</b> Calls <code>GET /api/student/bus</code> to retrieve assigned bus details, route geometry, and stop sequence.", bullet_style))
    story.append(Paragraph("3. <b>Live Polling Cycle:</b> Polling initiates against <code>GET /api/student/bus/location</code> every 30 seconds. Pauses automatically if document is hidden.", bullet_style))
    story.append(Paragraph("4. <b>Attendance Filing:</b> If bus is delayed, student submits <code>POST /api/student/attendance</code> with date, classHour, course, and facultyId.", bullet_style))
    story.append(Paragraph("5. <b>Grievance Submission:</b> Student files tickets via <code>POST /api/student/reports</code> categorized into delay, driver behaviour, condition, or stop issue.", bullet_style))
    story.append(Spacer(1, 4))

    # Student Diagram
    story.append(Paragraph("<b>Student Operational Flow Diagram:</b>", h2_style))
    student_diag = [
        [Paragraph("""<font face="Courier" size="7">
[Student Login] ---> GET /api/auth/me ---> GET /api/student/bus (Route, Stops, Bus)
                            |
                            v
               [Student Dashboard Loaded]
                            |
           +----------------+----------------+
           |                                 |
           v                                 v
[Poll /bus/location (30s)]         [Grievance / Attendance]
   |--> If status=='UNAVAILABLE'      |--> POST /student/attendance
   |    --> Show last stop fallback   |    (Automated delay verification)
   |--> If recordedAt > 30s ago       |--> POST /student/reports
   |    --> Show Amber Stale Badge    |    (Grievance ticket created)
   |--> If normal                     |--> PUT /student/reports/:id/close
        --> Pulse Green Marker             (Student self-service closure)
</font>""", diagram_style)]
    ]
    t_sdiag = Table(student_diag, colWidths=[504])
    t_sdiag.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94a3b8')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_sdiag)
    story.append(Spacer(1, 6))

    # Student Situational Matrix
    story.append(Paragraph("<b>Student Situational Handling Matrix:</b>", h2_style))
    student_matrix = [
        [Paragraph("Situation / Trigger", table_header), Paragraph("System Detection", table_header), Paragraph("Frontend UI Behavior", table_header), Paragraph("Backend Enforcement", table_header)],
        [
            Paragraph("No active trip running", table_cell_bold),
            Paragraph("locationStatus == 'UNAVAILABLE'", table_cell),
            Paragraph("Hides live bus icon; defaults map bounds to static route stops; shows 'Awaiting trip start'.", table_cell),
            Paragraph("Returns <code>{ location: null, locationStatus: 'UNAVAILABLE' }</code> with 200 OK.", code_style)
        ],
        [
            Paragraph("GPS ping stale (>30s)", table_cell_bold),
            Paragraph("isStale == true flag from API", table_cell),
            Paragraph("Displays amber alert banner: 'Location may be inaccurate'; preserves last coordinates.", table_cell),
            Paragraph("Compares server timestamp with latest <code>BusLocationUpdate.recordedAt</code>.", table_cell)
        ],
        [
            Paragraph("Bus delayed arriving at college", table_cell_bold),
            Paragraph("delayStatus == 'delayed'", table_cell),
            Paragraph("NextStop card turns amber; reveals 'Excuse Attendance' quick-action button.", table_cell),
            Paragraph("Trip document <code>delayStatus</code> evaluated by accumulator.", table_cell)
        ],
        [
            Paragraph("Attendance submission during delay", table_cell_bold),
            Paragraph("Student submits attendance form", table_cell),
            Paragraph("Shows 'Delay Verified' emerald badge immediately upon response.", table_cell),
            Paragraph("Cross-checks active trip delay status; sets <code>delayVerified: true</code>.", table_cell)
        ],
        [
            Paragraph("Grievance ticket resolved", table_cell_bold),
            Paragraph("Report status == 'resolved'", table_cell),
            Paragraph("Shows status timeline and enables 'Close Ticket' self-service button.", table_cell),
            Paragraph("<code>PUT /api/student/reports/:id/close</code> locks ticket permanently.", code_style)
        ]
    ]
    t_smatrix = Table(student_matrix, colWidths=[100, 104, 150, 150])
    t_smatrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#047857')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_smatrix)

    story.append(PageBreak())

    # SECTION 3: REPRESENTATIVE WORKFLOW
    story.append(Paragraph("3. Representative (Rep) Console & Transit Telemetry", h1_style))
    story.append(Paragraph(
        "A representative is a designated student assigned as <code>primary</code> or <code>vice</code> via "
        "<code>RepresentativeAssignment</code>. The Rep Console is a mission-critical mobile control interface.",
        body_style
    ))
    story.append(Paragraph("<b>3.1 Operational Lifecycle:</b>", h2_style))
    story.append(Paragraph("1. <b>Access Verification:</b> Rep opens <code>/rep/transit</code>. System verifies representative assignment from server session.", bullet_style))
    story.append(Paragraph("2. <b>Trip Start:</b> Rep clicks 'Start Trip'. Request <code>POST /api/trips/start</code> initializes trip with status <code>in_progress</code>.", bullet_style))
    story.append(Paragraph("3. <b>Screen Wake Lock & Telemetry:</b> Acquires browser Wake Lock API to prevent device sleep. Activates <code>navigator.geolocation.watchPosition</code> (HTTPS only).", bullet_style))
    story.append(Paragraph("4. <b>Batch Coordinate Transmission:</b> Emits coordinates via <code>POST /api/tracking/location</code>. Accumulator evaluates stop proximity and updates <code>nearStopOrder</code>.", bullet_style))
    story.append(Paragraph("5. <b>Manual Fallback Mode:</b> If GPS degrades or permission is revoked, rep checks into stops manually using <code>POST /api/trips/:id/stop-checkin</code>.", bullet_style))
    story.append(Paragraph("6. <b>Delay Broadcast:</b> In heavy traffic/breakdown, rep broadcasts delay via <code>POST /api/trips/:id/delay</code> (triggers student notifications).", bullet_style))
    story.append(Paragraph("7. <b>Two-Step Trip End:</b> Standard end requires dual-confirmation. Early termination requires mandatory reason (>=10 chars).", bullet_style))
    story.append(Spacer(1, 4))

    # Rep Diagram
    story.append(Paragraph("<b>Representative State Machine & Telemetry Flow:</b>", h2_style))
    rep_diag = [
        [Paragraph("""<font face="Courier" size="7">
+---------------------+     POST /api/trips/start      +---------------------+
|   TRIP: SCHEDULED   | -----------------------------> |  TRIP: IN_PROGRESS  |
+---------------------+                                +---------------------+
                                                                  |
             +--------------------+-------------------------------+
             |                    |                               |
             v                    v                               v
    [GPS Watcher (HTTPS)]  [Manual Fallback]              [Delay Broadcast]
     POST /tracking/loc    POST /stop-checkin             POST /trips/:id/delay
     (Lat, Lng, Speed)     (Stop Sequence ID)             (Reason, Est. Delay)
             |                    |                               |
             +--------------------+-------------------------------+
                                  |
                   +--------------+--------------+
                   |                             |
      [Normal Destination End]        [Early Termination]
      2-Step Confirmation Modal       Reason String (min 10 chars)
      POST /api/trips/:id/end         POST /api/trips/:id/terminate
                   |                             |
                   +--------------+--------------+
                                  v
                        +-------------------+
                        |  TRIP: COMPLETED  |
                        +-------------------+
</font>""", diagram_style)]
    ]
    t_rdiag = Table(rep_diag, colWidths=[504])
    t_rdiag.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94a3b8')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_rdiag)
    story.append(Spacer(1, 6))

    # Rep Situational Matrix
    story.append(Paragraph("<b>Representative Situational Handling Matrix:</b>", h2_style))
    rep_matrix = [
        [Paragraph("Situation / Trigger", table_header), Paragraph("System Detection", table_header), Paragraph("Frontend UI Behavior", table_header), Paragraph("Backend Enforcement", table_header)],
        [
            Paragraph("GPS permission denied / Hardware failure", table_cell_bold),
            Paragraph("watchPosition error code 1 / TIMEOUT", table_cell),
            Paragraph("Switches immediately to Manual Mode; displays stop-by-stop check-in stepper.", table_cell),
            Paragraph("Accepts manual check-ins with <code>source: 'manual'</code>; sets <code>gpsQuality: 'unavailable'</code>.", code_style)
        ],
        [
            Paragraph("Traffic jam / road blockage", table_cell_bold),
            Paragraph("Rep taps 'Broadcast Delay' button", table_cell),
            Paragraph("Prompts for delay minutes & reason; displays active amber delay pill in console.", table_cell),
            Paragraph("Updates <code>Trip.delayStatus = 'delayed'</code>; automatically qualifies student attendance.", table_cell)
        ],
        [
            Paragraph("Rep battery dying / Handover", table_cell_bold),
            Paragraph("Voluntary handover or Vice Rep claims", table_cell),
            Paragraph("Primary transfers code/approval; on Vice claiming, Primary console immediately disarms.", table_cell),
            Paragraph("Re-assigns <code>Trip.startedBy</code>; logs dual-party audit event in <code>AuditLog</code>.", table_cell)
        ],
        [
            Paragraph("Bus breakdown / Emergency", table_cell_bold),
            Paragraph("Rep triggers 'Early Terminate'", table_cell),
            Paragraph("Enforces 10+ character explanation dialog; confirms irreversible trip abortion.", table_cell),
            Paragraph("Rejects if reason < 10 chars; marks <code>tripStatus: 'terminated'</code>; frees bus.", table_cell)
        ]
    ]
    t_rmatrix = Table(rep_matrix, colWidths=[100, 104, 150, 150])
    t_rmatrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#047857')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_rmatrix)

    story.append(PageBreak())

    # SECTION 4: STAFF WORKFLOW
    story.append(Paragraph("4. Staff / Faculty Workflow & Academic Integrity", h1_style))
    story.append(Paragraph(
        "Staff members oversee academic continuity and attendance compliance. CBMS bridges transit telemetry with "
        "classroom attendance validation, eliminating fraudulent delay claims.",
        body_style
    ))
    story.append(Paragraph("<b>4.1 Operational Lifecycle:</b>", h2_style))
    story.append(Paragraph("1. <b>Dashboard Overview:</b> Staff logs in; dashboard highlights pending attendance excuse requests for their specific courses.", bullet_style))
    story.append(Paragraph("2. <b>Verification Audit:</b> Staff inspects request list from <code>GET /api/staff/attendance/requests</code>.", bullet_style))
    story.append(Paragraph("3. <b>Automated Delay Cross-Referencing:</b> System displays an automated <b>'Delay Verified'</b> badge if the student's assigned bus experienced a verified trip delay.", bullet_style))
    story.append(Paragraph("4. <b>Action Decision:</b> Staff approves (<code>PUT /api/staff/attendance/:id/approve</code>) or rejects with mandatory reason.", bullet_style))
    story.append(Paragraph("5. <b>Campus Transit Status:</b> Staff checks <code>GET /api/staff/fleet-overview</code> to observe whether campus arrival times are globally compromised.", bullet_style))
    story.append(Spacer(1, 4))

    # Staff Diagram
    story.append(Paragraph("<b>Staff Attendance Verification Workflow:</b>", h2_style))
    staff_diag = [
        [Paragraph("""<font face="Courier" size="7">
[Student Submits Late Request] ---> [Trip Telemetry Engine]
                                            |
              +-----------------------------+-----------------------------+
              |                                                           |
  (Trip delayStatus == 'delayed')                             (Trip on_time or no delay)
              |                                                           |
              v                                                           v
  [delayVerified: TRUE]                                       [delayVerified: FALSE]
              |                                                           |
              +-----------------------------+-----------------------------+
                                            |
                                            v
                         [Staff Request Queue (GET /staff/requests)]
                                            |
                         +------------------+------------------+
                         |                                     |
                         v                                     v
                 [Staff Approves]                      [Staff Rejects]
              PUT /attendance/:id/approve            PUT /attendance/:id/reject
              (Attendance marked Excused)            (Mandatory Feedback Reason)
                         |                                     |
                         +------------------+------------------+
                                            v
                                 [Student Notified]
</font>""", diagram_style)]
    ]
    t_fdiag = Table(staff_diag, colWidths=[504])
    t_fdiag.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94a3b8')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_fdiag)
    story.append(Spacer(1, 6))

    # Staff Situational Matrix
    story.append(Paragraph("<b>Staff Situational Handling Matrix:</b>", h2_style))
    staff_matrix = [
        [Paragraph("Situation / Trigger", table_header), Paragraph("System Detection", table_header), Paragraph("Frontend UI Behavior", table_header), Paragraph("Backend Enforcement", table_header)],
        [
            Paragraph("Request with verified transit delay", table_cell_bold),
            Paragraph("request.delayVerified == true", table_cell),
            Paragraph("Renders glowing green shield badge: 'Verified Bus Delay (Trip #...)'.", table_cell),
            Paragraph("Backend automatically tagged record during student submission.", table_cell)
        ],
        [
            Paragraph("Student claims delay but bus was on time", table_cell_bold),
            Paragraph("request.delayVerified == false", table_cell),
            Paragraph("Renders warning amber badge: 'Unverified Transit Claim'.", table_cell),
            Paragraph("Prevents automated bypass; forces manual staff discretion.", table_cell)
        ],
        [
            Paragraph("Rejecting attendance excuse", table_cell_bold),
            Paragraph("Staff clicks 'Reject Request'", table_cell),
            Paragraph("Opens modal requiring explanatory remark for student records.", table_cell),
            Paragraph("Rejects if rejection comment is blank; updates status to 'rejected'.", code_style)
        ],
        [
            Paragraph("Global campus weather emergency", table_cell_bold),
            Paragraph("Admin broadcasts campus notice", table_cell),
            Paragraph("Renders high-priority emergency banner atop staff portal.", table_cell),
            Paragraph("Restricts announcement queries via audience-isolated endpoint.", table_cell)
        ]
    ]
    t_fmatrix = Table(staff_matrix, colWidths=[100, 104, 150, 150])
    t_fmatrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#047857')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_fmatrix)

    story.append(PageBreak())

    # SECTION 5: ADMIN WORKFLOW
    story.append(Paragraph("5. Admin Workflow & System Governance", h1_style))
    story.append(Paragraph(
        "Administrators maintain master fleet registries, route geometries, staff assignments, grievance escalations, "
        "and security audit trails.",
        body_style
    ))
    story.append(Paragraph("<b>5.1 Administrative Core Workflows:</b>", h2_style))
    story.append(Paragraph("1. <b>Fleet Provisioning:</b> Manage buses via <code>/api/admin/buses</code> (capacity, availabilityStatus, registration).", bullet_style))
    story.append(Paragraph("2. <b>Route Topography:</b> Build ordered route waypoint paths and stops via <code>/api/admin/routes</code>.", bullet_style))
    story.append(Paragraph("3. <b>Representative Promotion:</b> Assign primary and vice reps with strict database unique partial index constraints.", bullet_style))
    story.append(Paragraph("4. <b>Grievance Lifecycle:</b> Manage student tickets across <code>open -> in_review -> resolved -> closed</code>.", bullet_style))
    story.append(Paragraph("5. <b>Security Audit Trail:</b> Review immutable system audit logs with actor ID, IP, user-agent, and correlation ID.", bullet_style))
    story.append(Spacer(1, 4))

    # Admin Diagram
    story.append(Paragraph("<b>Admin Enterprise Governance Architecture:</b>", h2_style))
    admin_diag = [
        [Paragraph("""<font face="Courier" size="7">
                           [ADMIN CONTROL PORTAL]
                                     |
      +---------------+--------------+--------------+---------------+
      |               |                             |               |
      v               v                             v               v
[Fleet Ops]    [Route Engine]                [Assignment Hub]  [Grievance Hub]
Buses: Create  Routes: Create / Edit Stops   Students -> Bus   Ticket Triage
Status toggle  Geofence sequencing           Reps: Primary     Status History
(POST /buses)  (POST /routes)                (Unique Index)    (PATCH /reports)
      |               |                             |               |
      +---------------+--------------+--------------+---------------+
                                     |
                                     v
                        [IMMUTABLE AUDIT LEDGER]
                        Recorded on every write:
                        - Actor ID & User Role
                        - IP Address & User Agent
                        - Action & Resource ID
                        - Unique Request Correlation ID
</font>""", diagram_style)]
    ]
    t_adiag = Table(admin_diag, colWidths=[504])
    t_adiag.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94a3b8')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_adiag)
    story.append(Spacer(1, 6))

    # Admin Situational Matrix
    story.append(Paragraph("<b>Admin Situational Handling Matrix:</b>", h2_style))
    admin_matrix = [
        [Paragraph("Situation / Trigger", table_header), Paragraph("System Detection", table_header), Paragraph("Frontend UI Behavior", table_header), Paragraph("Backend Enforcement", table_header)],
        [
            Paragraph("Bus breakdown / Out of service", table_cell_bold),
            Paragraph("Admin switches bus status to 'maintenance'", table_cell),
            Paragraph("Instantly unlinks active routes; badges bus as amber in fleet grid.", table_cell),
            Paragraph("Aborts scheduling; disallows new trips until status restored to 'available'.", code_style)
        ],
        [
            Paragraph("Attempted dual primary rep assignment", table_cell_bold),
            Paragraph("Admin tries to assign second primary rep", table_cell),
            Paragraph("Form highlights error: 'An active primary rep already exists for this bus'.", table_cell),
            Paragraph("MongoDB partial unique index throws 409 STATE_CONFLICT.", code_style)
        ],
        [
            Paragraph("High-severity grievance submitted", table_cell_bold),
            Paragraph("Report category == 'driver_staff_behaviour' && severity == 'high'", table_cell),
            Paragraph("Flashes rose notification badge at top of Admin Reports dashboard.", table_cell),
            Paragraph("Auto-escalates priority in query sorting; sends staff notification.", table_cell)
        ],
        [
            Paragraph("Security breach / brute-force alert", table_cell_bold),
            Paragraph("5 failed login attempts in 15 mins", table_cell),
            Paragraph("Displays account lockout alert with 15-minute countdown.", table_cell),
            Paragraph("User <code>lockUntil</code> set to Date.now() + 15m; rejects with 429.", table_cell)
        ]
    ]
    t_amatrix = Table(admin_matrix, colWidths=[100, 104, 150, 150])
    t_amatrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#047857')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_amatrix)

    story.append(Spacer(1, 14))
    story.append(Paragraph("6. Cross-Cutting Security, Audit & Fault-Tolerance Invariants", h1_style))
    story.append(Paragraph("• <b>Idempotency Keys:</b> All mutating requests generate a single UUID per user intent, reused across retries to prevent double trip starts or double ticket creation.", bullet_style))
    story.append(Paragraph("• <b>Single-Flight Token Refresh:</b> Expired access tokens trigger a queued single-flight refresh via <code>/api/auth/refresh</code>. If refresh fails, storage clears without hard window reload.", bullet_style))
    story.append(Paragraph("• <b>Screen Wake Lock:</b> Rep console holds active screen lock during running trips, ensuring GPS polling continues uninterrupted in background mobile browsers.", bullet_style))
    story.append(Paragraph("• <b>Zero Data Leakage:</b> Sensitive auth tokens, decoded password hashes, and student real-time physical locations are never exposed to other students or logged to consoles.", bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF successfully generated at:", filename)

if __name__ == '__main__':
    target_path = r"C:\Users\lavanya.LAPTOP-MPLKHD3F\.gemini\antigravity\brain\109cbbec-9818-4ded-b921-317e2b854fdf\CBMS_Role_Workflows_and_Specifications.pdf"
    create_pdf(target_path)
