import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal, engine, Base
from backend.app.models import (
    User, Team, Bug, AIAnalysis, Comment, StatusHistory, AuditLog, Notification, AIFeedback
)
from backend.app.auth import hash_password
from backend.app.routing_engine import TEAM_DEFINITIONS
from backend.app.ai_service import generate_unified_diff

def seed_database():
    """Populate database with essential demo users, teams, and realistic sample bugs."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains data. Skipping seeding.")
            return

        print("Seeding database with demo users, development teams, and realistic bugs...")

        # 1. Create Teams
        created_teams = {}
        for tdef in TEAM_DEFINITIONS:
            team = Team(
                name=tdef["name"],
                slug=tdef["slug"],
                description=tdef["description"],
                color=tdef["color"]
            )
            db.add(team)
            db.flush()
            created_teams[tdef["name"]] = team

        # 2. Create Demo Users
        admin_user = User(
            email="admin@bugtriage.io",
            full_name="Alex Rivera",
            hashed_password=hash_password("AdminPass123!"),
            role="admin",
            avatar_color="#ef4444",
            team_id=created_teams["General Engineering Team"].id
        )

        reporter_user = User(
            email="reporter@bugtriage.io",
            full_name="Sarah Chen",
            hashed_password=hash_password("ReporterPass123!"),
            role="reporter",
            avatar_color="#10b981",
            team_id=None
        )

        dev_user = User(
            email="dev@bugtriage.io",
            full_name="Marcus Vance",
            hashed_password=hash_password("DevPass123!"),
            role="developer",
            avatar_color="#3b82f6",
            team_id=created_teams["Backend API Team"].id
        )

        db.add_all([admin_user, reporter_user, dev_user])
        db.flush()

        # Update Team Leads
        created_teams["Backend API Team"].lead_id = dev_user.id
        created_teams["General Engineering Team"].lead_id = admin_user.id

        # 3. Create Sample Realistic Bugs
        sample_bugs_data = [
            {
                "code": "BUG-1001",
                "title": "Unhandled Null Pointer in Stripe Webhook Currency Normalization",
                "description": "Production checkout occasionally throws 500 Internal Server Error when processing Japanese Yen (zero-decimal currency) via webhook callbacks.",
                "language": "Python",
                "framework": "FastAPI",
                "steps": "1. Dispatch a webhook event with currency 'JPY' and amount 5000.\n2. Normalizer attempts fractional division by 100 without zero-decimal check.\n3. Decimal parser crashes on undefined decimal place parameter.",
                "expected": "Normalizer preserves whole integer amounts for zero-decimal currencies without throwing.",
                "actual": "Throws TypeError / AttributeError: cannot convert NoneType to float in currency_helper.py line 42.",
                "error_trace": "Traceback (most recent call last):\n  File 'app/services/currency_helper.py', line 42, in normalize_amount\n    return round(raw_amount / (10 ** decimal_places), 2)\nTypeError: unsupported operand type(s) for **: 'int' and 'NoneType'",
                "env": "Production | Python 3.12 | FastAPI 0.115 | Stripe API v2024-04",
                "severity": "P0",
                "status": "In Progress",
                "team_name": "Backend API Team",
                "assigned_dev": dev_user.id,
                "orig_code": "def normalize_amount(raw_amount: int, currency: str):\n    decimal_places = CURRENCY_DECIMALS.get(currency.upper())\n    # Defective line: decimal_places is None for zero-decimal currencies\n    return round(raw_amount / (10 ** decimal_places), 2)\n",
                "patched_code": "def normalize_amount(raw_amount: int, currency: str):\n    decimal_places = CURRENCY_DECIMALS.get(currency.upper())\n    if decimal_places is None or decimal_places == 0:\n        return float(raw_amount)\n    return round(raw_amount / (10 ** decimal_places), 2)\n",
                "line": "Line 42",
                "bug_type": "Runtime Error",
                "unit_test": "def test_normalize_zero_decimal_jpy():\n    assert normalize_amount(5000, 'JPY') == 5000.0\n    assert normalize_amount(1500, 'USD') == 15.00"
            },
            {
                "code": "BUG-1002",
                "title": "PostgreSQL Connection Pool Exhaustion on High Concurrency Checkout",
                "description": "During flash sale traffic spikes, database connections saturate connection pool (pool size 20), resulting in timeout errors after 30 seconds.",
                "language": "Python",
                "framework": "SQLAlchemy / PostgreSQL",
                "steps": "1. Simulate 200 concurrent user checkouts using k6 or locust.\n2. Observe connection pool saturation and pending transaction locks.\n3. SQLAlchemy throws TimeoutError: QueuePool limit of size 20 overflow 10 reached.",
                "expected": "Connections are recycled efficiently; read-heavy queries routed to replica pool.",
                "actual": "QueuePool overflow error causing 60% of checkout requests to drop.",
                "error_trace": "sqlalchemy.exc.TimeoutError: QueuePool limit of size 20 overflow 10 reached, connection timed out, timeout 30.00 (Background on this error at: https://sqlalche.me/e/20/3o7r)",
                "env": "Staging Cluster | Postgres 16 | SQLAlchemy 2.0 | AsyncPG",
                "severity": "P1",
                "status": "Triaged",
                "team_name": "Database Engineering Team",
                "assigned_dev": None,
                "orig_code": "# Database session without context manager reuse\ndef get_user_cart(db: Session, user_id: int):\n    cart = db.query(Cart).filter(Cart.user_id == user_id).first()\n    # Connection remains checked out without explicit closing\n    return cart\n",
                "patched_code": "# Proper scoped context session handling\ndef get_user_cart(db: Session, user_id: int):\n    try:\n        return db.query(Cart).filter(Cart.user_id == user_id).first()\n    finally:\n        # Ensure connection returned to pool promptly\n        db.close()\n",
                "line": "Line 118",
                "bug_type": "Database Error",
                "unit_test": "def test_connection_returned_to_pool(db_pool):\n    for _ in range(50):\n        with get_session() as s:\n            pass\n    assert db_pool.checkedout() == 0"
            },
            {
                "code": "BUG-1003",
                "title": "JWT Auth Token Missing Algorithm Whitelist and Expiration Check",
                "description": "Security audit found that token verification accepts 'none' algorithm header, allowing forged unsigned tokens to impersonate admin accounts.",
                "language": "Python",
                "framework": "PyJWT / FastAPI",
                "steps": "1. Craft a JWT token with header {'alg': 'none', 'typ': 'JWT'}.\n2. Send Authorization: Bearer <unsigned_token> to /api/admin/users.\n3. Server accepts payload without cryptographic signature verification.",
                "expected": "Tokens without explicit HS256/RS256 signature are rejected with 401 Unauthorized.",
                "actual": "Server accepts unsigned token and grants privileged access.",
                "error_trace": "Security Audit Advisory SEC-2026-09: Insecure JWT algorithm validation detected in auth/security.py line 28.",
                "env": "All Environments | Python 3.12 | pyjwt",
                "severity": "P0",
                "status": "In Review",
                "team_name": "Security Engineering Team",
                "assigned_dev": dev_user.id,
                "orig_code": "def verify_token(token: str):\n    # Vulnerable: algorithms parameter missing\n    return jwt.decode(token, SECRET_KEY, verify=False)\n",
                "patched_code": "def verify_token(token: str):\n    # Secure: strict algorithm enforcement and mandatory verification\n    return jwt.decode(token, SECRET_KEY, algorithms=['HS256'], options={'verify_exp': True})\n",
                "line": "Line 28",
                "bug_type": "Security Vulnerability",
                "unit_test": "def test_reject_none_alg_token():\n    unsigned_token = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.'\n    with pytest.raises(jwt.InvalidAlgorithmError):\n        verify_token(unsigned_token)"
            },
            {
                "code": "BUG-1004",
                "title": "Memory Leak in Monaco Editor Modal Due to Missing Disposer Cleanup",
                "description": "Opening and closing the code review dialog repeatedly increases client browser heap size by 45MB per cycle until browser tab crashes.",
                "language": "JavaScript",
                "framework": "React / Monaco Editor",
                "steps": "1. Open bug triage detail modal containing Monaco code diff.\n2. Close modal.\n3. Repeat 10 times; inspect Chrome DevTools Memory Heap Snapshot.",
                "expected": "Editor instance and DOM event listeners are disposed on unmount.",
                "actual": "Editor models stay retained in window global listener registry.",
                "error_trace": "DevTools Snapshot: Detached HTMLDivElement retains 45.2 MB in MonacoStandaloneCodeEditor.",
                "env": "Client Chrome 128 / Safari 18 | Frontend SPA",
                "severity": "P2",
                "status": "In Progress",
                "team_name": "Frontend Engineering Team",
                "assigned_dev": None,
                "orig_code": "function EditorModal({ code, onClose }) {\n  useEffect(() => {\n    const editor = monaco.editor.create(document.getElementById('container'), { value: code });\n    // Missing return cleanup callback\n  }, []);\n  return <div id='container' />;\n}\n",
                "patched_code": "function EditorModal({ code, onClose }) {\n  useEffect(() => {\n    const container = document.getElementById('container');\n    const editor = monaco.editor.create(container, { value: code });\n    return () => {\n      // Dispose editor models and detach listeners\n      editor.dispose();\n    };\n  }, []);\n  return <div id='container' />;\n}\n",
                "line": "Line 54",
                "bug_type": "Memory Error",
                "unit_test": "test('disposes monaco editor on component unmount', () => {\n  const { unmount } = render(<EditorModal code='test' />);\n  unmount();\n  expect(editorInstance.isDisposed()).toBe(true);\n});"
            },
            {
                "code": "BUG-1005",
                "title": "Kubernetes Ingress Controller TLS Certificate Expired Leading to 502 Bad Gateway",
                "description": "Cert-Manager renewal cron failed due to Let's Encrypt rate-limiting, causing public API gateway SSL handshake termination failures.",
                "language": "YAML",
                "framework": "Kubernetes / Nginx Ingress / Cert-Manager",
                "steps": "1. Execute curl -iv https://api.bugtriage.io/healthz\n2. SSL certificate verification fails with CERT_HAS_EXPIRED.",
                "expected": "Valid SSL certificate renewed automatically 30 days prior to expiry.",
                "actual": "Connection terminates with SSL_ERROR_SYSCALL.",
                "error_trace": "cert-manager-controller: Error syncing ClusterIssuer: 429 Too Many Requests from acme-v02.api.letsencrypt.org",
                "env": "Production Kubernetes Cluster (EKS) v1.29",
                "severity": "P0",
                "status": "Assigned",
                "team_name": "DevOps & Infrastructure Team",
                "assigned_dev": None,
                "orig_code": "apiVersion: cert-manager.io/v1\nkind: Certificate\nmetadata:\n  name: api-tls\nspec:\n  dnsNames:\n    - api.bugtriage.io\n  issuerRef:\n    name: letsencrypt-prod\n",
                "patched_code": "apiVersion: cert-manager.io/v1\nkind: Certificate\nmetadata:\n  name: api-tls\nspec:\n  renewBefore: 720h # 30 days before expiration\n  dnsNames:\n    - api.bugtriage.io\n  issuerRef:\n    name: letsencrypt-prod\n    kind: ClusterIssuer\n",
                "line": "Line 12",
                "bug_type": "Configuration Error",
                "unit_test": "kuttl test assert-tls-validity --timeout 30s"
            },
            {
                "code": "BUG-1006",
                "title": "Embedding Vector Dimension Incompatibility in Similarity Retrieval",
                "description": "Switching embedding model from 768-dim (MiniLM) to 1536-dim (Text-Embedding-3) causes pgvector cosine operator '<=>' to reject search queries.",
                "language": "Python",
                "framework": "PyTorch / pgvector",
                "steps": "1. Run semantic similarity search query.\n2. pgvector encounters vector dimension mismatch (1536 vs column 768).",
                "expected": "Column schema migrated to vector(1536) with dimension guard check.",
                "actual": "Database throws: ERROR: different vector dimensions 1536 and 768.",
                "error_trace": "psycopg2.errors.DataException: different vector dimensions 1536 and 768 in cosine_distance operator",
                "env": "Staging | Python 3.11 | pgvector 0.6.0",
                "severity": "P2",
                "status": "Resolved",
                "team_name": "AI/ML Engineering Team",
                "assigned_dev": dev_user.id,
                "orig_code": "# Direct vector query without dimension check\ndef search_similar(query_vector: list[float]):\n    return db.query(Document).order_by(Document.embedding.cosine_distance(query_vector)).limit(5)\n",
                "patched_code": "def search_similar(query_vector: list[float]):\n    if len(query_vector) != EXPECTED_EMBEDDING_DIM:\n        raise ValueError(f'Dimension mismatch: query has {len(query_vector)}, expected {EXPECTED_EMBEDDING_DIM}')\n    return db.query(Document).order_by(Document.embedding.cosine_distance(query_vector)).limit(5)\n",
                "line": "Line 82",
                "bug_type": "Logic Error",
                "unit_test": "def test_embedding_dimension_guard():\n    with pytest.raises(ValueError):\n        search_similar([0.1] * 768)  # Expected 1536"
            },
            {
                "code": "BUG-1007",
                "title": "Redis Cache Miss Storm on Non-Existent User Profile Lookups",
                "description": "Requests for deleted user avatars continuously bypass Redis and query primary database directly, causing periodic CPU spikes.",
                "language": "Python",
                "framework": "Redis / FastAPI",
                "steps": "1. Request /avatars/non_existent_id 1000 times.\n2. Observe Postgres query load without caching empty result.",
                "expected": "Cache negative results with short TTL (e.g., 60 seconds).",
                "actual": "Cache misses hit primary database on every single request.",
                "error_trace": "Cache miss rate exceeds 98% for invalid avatar requests; CPU spikes to 88%.",
                "env": "Production | Redis Cluster 7.2 | Postgres 16",
                "severity": "P3",
                "status": "Resolved",
                "team_name": "Performance & Reliability Team",
                "assigned_dev": dev_user.id,
                "orig_code": "async def get_avatar(user_id: str):\n    cached = await redis.get(f'avatar:{user_id}')\n    if cached:\n        return cached\n    avatar = await db.fetch_avatar(user_id)\n    if avatar:\n        await redis.set(f'avatar:{user_id}', avatar, ex=3600)\n    return avatar\n",
                "patched_code": "async def get_avatar(user_id: str):\n    cached = await redis.get(f'avatar:{user_id}')\n    if cached is not None:\n        return None if cached == '__NULL__' else cached\n    avatar = await db.fetch_avatar(user_id)\n    if avatar:\n        await redis.set(f'avatar:{user_id}', avatar, ex=3600)\n    else:\n        # Cache negative result with short TTL to prevent cache storm\n        await redis.set(f'avatar:{user_id}', '__NULL__', ex=60)\n    return avatar\n",
                "line": "Line 64",
                "bug_type": "Performance Issue",
                "unit_test": "async def test_cache_null_avatar_stored():\n    await get_avatar('missing_user')\n    cached = await redis.get('avatar:missing_user')\n    assert cached == '__NULL__'"
            },
            {
                "code": "BUG-1008",
                "title": "Dark Mode Contrast Ratio Insufficient on Secondary Breadcrumbs",
                "description": "Secondary breadcrumb links use #64748b on #0f172a background, failing WCAG 2.1 AA accessibility contrast guidelines (2.8:1 vs required 4.5:1).",
                "language": "CSS",
                "framework": "Tailwind CSS / Vanilla CSS",
                "steps": "1. Enable dark mode toggle.\n2. Inspect breadcrumbs using Lighthouse Accessibility Audit.",
                "expected": "Contrast ratio exceeds 4.5:1 for all text elements.",
                "actual": "Contrast ratio fails with score 2.8:1.",
                "error_trace": "Lighthouse Audit: Elements must have sufficient color contrast (failed on .breadcrumb-subtext).",
                "env": "Browser UI",
                "severity": "P4",
                "status": "Closed",
                "team_name": "Frontend Engineering Team",
                "assigned_dev": None,
                "orig_code": ".breadcrumb-item {\n  color: #64748b; /* Contrast 2.8:1 */\n}\n",
                "patched_code": ".breadcrumb-item {\n  color: #94a3b8; /* Contrast 4.9:1 meeting WCAG AA requirements */\n}\n",
                "line": "Line 104",
                "bug_type": "Syntax Error",
                "unit_test": "test('breadcrumb meets wcag color contrast', async () => {\n  const results = await axe(container);\n  expect(results).toHaveNoViolations();\n});"
            }
        ]

        for bdata in sample_bugs_data:
            team = created_teams.get(bdata["team_name"])
            diff_text = generate_unified_diff(bdata["orig_code"], bdata["patched_code"], f"{bdata['code'].lower()}_fix.py")
            
            bug = Bug(
                bug_code=bdata["code"],
                title=bdata["title"],
                description=bdata["description"],
                language=bdata["language"],
                framework=bdata["framework"],
                steps_to_reproduce=bdata["steps"],
                expected_behavior=bdata["expected"],
                actual_behavior=bdata["actual"],
                error_trace=bdata["error_trace"],
                environment_info=bdata["env"],
                code_snippet=bdata["orig_code"],
                severity=bdata["severity"],
                original_severity=bdata["severity"],
                status=bdata["status"],
                reporter_id=reporter_user.id,
                assigned_team_id=team.id if team else None,
                assigned_developer_id=bdata["assigned_dev"],
                created_at=datetime.utcnow() - timedelta(days=len(sample_bugs_data) - int(bdata["code"].split("-")[1]) % 5)
            )
            db.add(bug)
            db.flush()

            # AI Analysis record
            solution_steps = [
                f"1. Reproduce error state using test harness: {bdata['title']}.",
                f"2. Inspect call stack at {bdata['line']}.",
                "3. Apply defensive guards and boundary error handling.",
                "4. Verify test assertions and measure regression impacts."
            ]

            analysis = AIAnalysis(
                bug_id=bug.id,
                summary=f"Automated AI assessment: {bdata['title']}. Root cause traced to {bdata['line']} defect.",
                bug_type=bdata["bug_type"],
                root_cause=f"Failure at {bdata['line']} due to improper edge boundary handling.",
                line_numbers=bdata["line"],
                trigger_conditions="Triggered when specific input or load condition violates implicit assumptions.",
                is_hypothesis=False if bdata["status"] in ["Resolved", "Closed"] else True,
                recommended_severity=bdata["severity"],
                severity_reasoning=f"Severity {bdata['severity']} classified according to enterprise incident triage criteria.",
                severity_evidence=f"Identified error markers in trace: '{bdata['error_trace'][:80]}...'",
                solution_steps=json.dumps(solution_steps),
                recommended_code_diff=diff_text,
                original_snippet=bdata["orig_code"],
                patched_snippet=bdata["patched_code"],
                fix_explanation="Patch introduces validation guards to prevent state degradation while preserving API contracts.",
                suggested_unit_tests=bdata["unit_test"],
                potential_side_effects="Low risk; verify callers handle standard error returns.",
                recommended_team_name=bdata["team_name"],
                team_routing_reason=f"Keyword matching and structural taxonomy routed to {bdata['team_name']}.",
                required_expertise=f"{bdata['language']} / {bdata['framework']} engineering",
                suggested_priority="Immediate Attention" if bdata["severity"] in ["P0", "P1"] else "Normal Sprint",
                confidence_score=0.94,
                model_name="Demo Heuristic Engine (Offline Mode)",
                is_demo_mode=True,
                helpful_count=5 if bdata["status"] in ["Resolved", "Closed"] else 2,
                unhelpful_count=0
            )
            db.add(analysis)

            # Add comments
            comm = Comment(
                bug_id=bug.id,
                user_id=dev_user.id,
                message=f"I have reviewed the AI-suggested diff for {bug.bug_code}. Looking solid, initiating test verification.",
                is_technical=True
            )
            db.add(comm)

            # Add status history
            sh1 = StatusHistory(
                bug_id=bug.id,
                user_id=reporter_user.id,
                old_status="None",
                new_status="Submitted",
                notes="Bug submitted via report form"
            )
            sh2 = StatusHistory(
                bug_id=bug.id,
                user_id=None,
                old_status="Submitted",
                new_status=bug.status,
                notes=f"AI automated triage completed. Assigned to {bdata['team_name']}."
            )
            db.add_all([sh1, sh2])

            # Feedback
            fb = AIFeedback(
                bug_id=bug.id,
                user_id=dev_user.id,
                is_helpful=True,
                feedback_text="Patch was accurate and easy to apply."
            )
            db.add(fb)

        # Audit logs for seed data
        db.add(AuditLog(
            user_id=admin_user.id,
            action="SYSTEM_INITIALIZED",
            entity_type="System",
            entity_id="0",
            details="Database initialized and seeded with enterprise demo datasets."
        ))

        db.commit()
        print("Database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
