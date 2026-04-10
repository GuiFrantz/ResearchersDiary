# Demo seed router — creates a fixed set of demo personas and sample data.

from datetime import date

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import create_access_token, hash_password
from app.constants import (
    AuthProvider,
    ProjectStatus,
    ProposalStatus,
    UserRole,
    Visibility,
)
from app.database import get_session
from app.models.department import Department
from app.models.experience import Experience
from app.models.institution import Institution
from app.models.project import Project
from app.models.proposal import Proposal
from app.models.publication import Publication
from app.models.user import User

router = APIRouter(prefix="/api/demo", tags=["Demo"])

DEMO_PASSWORD = "demo1234"

DEMO_USERS = [
    {"email": "admin@platform.com", "name": "Global Admin", "role": UserRole.ADMIN},
    {
        "email": "carol@tech.edu",
        "name": "Carol Tech-Head",
        "role": UserRole.INSTITUTION_HEAD,
    },
    {"email": "bob@tech.edu", "name": "Bob Robotics", "role": UserRole.DEPARTMENT_HEAD},
    {"email": "alice@tech.edu", "name": "Alice AI", "role": UserRole.RESEARCHER},
    {"email": "dave@tech.edu", "name": "Dave Software", "role": UserRole.RESEARCHER},
    {
        "email": "elena@med.org",
        "name": "Elena Med-Head",
        "role": UserRole.INSTITUTION_HEAD,
    },
    {
        "email": "frank@med.org",
        "name": "Frank Surgery",
        "role": UserRole.DEPARTMENT_HEAD,
    },
    {"email": "grace@med.org", "name": "Grace Genetics", "role": UserRole.RESEARCHER},
]


async def _find_user(session: AsyncSession, email: str) -> User | None:
    result = await session.exec(select(User).where(User.email == email))
    return result.first()


async def _seed(session: AsyncSession) -> dict:
    """Core seed logic. Creates everything from scratch."""

    pw = hash_password(DEMO_PASSWORD)

    # ── Institution 1: Tech University ────────────────────────────────────────
    inst1 = Institution(name="Tech University")
    session.add(inst1)
    await session.flush()

    cs = Department(name="Robotics Lab", code="ROBO", institution_id=inst1.id)
    math = Department(name="Software Engineering", code="SOFT", institution_id=inst1.id)
    session.add(cs)
    session.add(math)
    await session.flush()

    # ── Institution 2: Medical Center ─────────────────────────────────────────
    inst2 = Institution(name="Medical Center")
    session.add(inst2)
    await session.flush()

    eng = Department(name="Clinical Surgery", code="SURG", institution_id=inst2.id)
    phys = Department(name="Genetics Research", code="GENE", institution_id=inst2.id)
    session.add(eng)
    session.add(phys)
    await session.flush()

    # ── Users ─────────────────────────────────────────────────────────────────
    users = {}
    for spec in DEMO_USERS:
        u = User(
            email=spec["email"],
            name=spec["name"],
            password_hash=pw,
            auth_provider=AuthProvider.LOCAL,
            role=spec["role"],
        )
        session.add(u)
        users[spec["email"]] = u
    await session.flush()

    # Tech University assignments
    for email in ("carol@tech.edu", "bob@tech.edu", "alice@tech.edu", "dave@tech.edu"):
        users[email].institution_id = inst1.id
    users["bob@tech.edu"].department_id = cs.id
    users["alice@tech.edu"].department_id = cs.id
    users["dave@tech.edu"].department_id = math.id
    users["carol@tech.edu"].position_title = "University Dean"
    users["bob@tech.edu"].position_title = "Head of Robotics"

    # Medical Center assignments
    for email in ("elena@med.org", "frank@med.org", "grace@med.org"):
        users[email].institution_id = inst2.id
    users["frank@med.org"].department_id = eng.id
    users["grace@med.org"].department_id = eng.id
    users["elena@med.org"].position_title = "Chief Medical Officer"
    users["frank@med.org"].position_title = "Head of Surgery"
    await session.flush()

    # ── Alice's records (Tech - Robotics) ─────────────────────────────────────
    alice = users["alice@tech.edu"]

    session.add(
        Publication(
            user_id=alice.id,
            title="How to Build a Robot Arm",
            type="Article",
            publisher="Tech Journal",
            publication_date=date(2024, 3, 15),
            doi="10.1109/robot.001",
            visibility=Visibility.INSTITUTION,
            status="published",
        )
    )
    session.add(
        Publication(
            user_id=alice.id,
            title="AI for Autonomous Drones",
            type="Article",
            publisher="AI Weekly",
            publication_date=date(2023, 9, 10),
            visibility=Visibility.INSTITUTION,
            status="published",
        )
    )
    session.add(
        Publication(
            user_id=alice.id,
            title="Secret Robot Designs (Draft)",
            type="Book",
            visibility=Visibility.PRIVATE,
            status="draft",
        )
    )

    proj = Project(
        user_id=alice.id,
        title="Global Drone Network",
        agency="Tech Foundation",
        grant_number="TECH-2024",
        role="Lead Engineer",
        status=ProjectStatus.ACTIVE,
        start_date=date(2024, 1, 1),
        budget=500000,
        visibility=Visibility.INSTITUTION,
    )
    session.add(proj)
    session.add(
        Project(
            user_id=alice.id,
            title="Lab 5 Robot Setup",
            role="Assistant",
            status=ProjectStatus.ACTIVE,
            start_date=date(2023, 6, 1),
            visibility=Visibility.INSTITUTION,
        )
    )
    await session.flush()

    session.add(
        Proposal(
            user_id=alice.id,
            title="Next-Gen AI Grant",
            funding_body="Future Labs",
            reference="FL-2025",
            role="Lead Researcher",
            status=ProposalStatus.SUBMITTED,
            submission_date=date(2025, 2, 1),
            visibility=Visibility.INSTITUTION,
        )
    )
    session.add(
        Proposal(
            user_id=alice.id,
            title="Internal Battery Grant",
            funding_body="Tech University",
            role="PI",
            status=ProposalStatus.DRAFT,
            visibility=Visibility.PRIVATE,
        )
    )

    session.add(
        Experience(
            user_id=alice.id,
            category="Teaching",
            organization="Tech University",
            role_title="Robotics Instructor",
            start_date=date(2022, 9, 1),
            is_current=True,
            visibility=Visibility.INSTITUTION,
        )
    )
    session.add(
        Experience(
            user_id=alice.id,
            category="Industry",
            organization="NASA",
            role_title="Summer Intern",
            start_date=date(2021, 6, 1),
            end_date=date(2021, 9, 1),
            visibility=Visibility.PRIVATE,
        )
    )

    # ── Dave's records (Tech - Software) ──────────────────────────────────────
    dave = users["dave@tech.edu"]

    session.add(
        Publication(
            user_id=dave.id,
            title="Optimizing Python for Speed",
            type="Article",
            publisher="Code Mag",
            publication_date=date(2024, 5, 20),
            visibility=Visibility.INSTITUTION,
            status="published",
        )
    )
    session.add(
        Publication(
            user_id=dave.id,
            title="Personal Coding Blog",
            type="Other",
            visibility=Visibility.PRIVATE,
        )
    )
    session.add(
        Project(
            user_id=dave.id,
            title="Open Source Compiler",
            agency="Software Council",
            role="Maintainer",
            status=ProjectStatus.ACTIVE,
            start_date=date(2023, 1, 1),
            budget=20000,
            visibility=Visibility.INSTITUTION,
        )
    )

    # ── Bob's records (Tech - Dept Head) ──────────────────────────────────────
    bob = users["bob@tech.edu"]

    session.add(
        Publication(
            user_id=bob.id,
            title="Teaching Robotics 101",
            type="Conference",
            publisher="EduTech",
            publication_date=date(2023, 3, 1),
            visibility=Visibility.INSTITUTION,
            status="published",
        )
    )
    session.add(
        Experience(
            user_id=bob.id,
            category="Supervision",
            organization="Tech University",
            role_title="PhD Advisor",
            start_date=date(2020, 9, 1),
            is_current=True,
            visibility=Visibility.INSTITUTION,
        )
    )

    # ── Grace's records (Medical - Genetics) ──────────────────────────────────
    grace = users["grace@med.org"]

    session.add(
        Publication(
            user_id=grace.id,
            title="New Heart Surgery Method",
            type="Article",
            publisher="The Lancet",
            publication_date=date(2024, 7, 12),
            visibility=Visibility.INSTITUTION,
            status="published",
        )
    )
    session.add(
        Publication(
            user_id=grace.id,
            title="Laser Scalpel Trends",
            type="Conference",
            publisher="Surgery Expo",
            publication_date=date(2023, 11, 5),
            visibility=Visibility.INSTITUTION,
            status="published",
        )
    )
    session.add(
        Project(
            user_id=grace.id,
            title="Better Surgery Tools",
            agency="Health Ministry",
            grant_number="MED-77",
            role="Lead Surgeon",
            status=ProjectStatus.ACTIVE,
            start_date=date(2024, 3, 1),
            budget=300000,
            visibility=Visibility.INSTITUTION,
        )
    )
    session.add(
        Proposal(
            user_id=grace.id,
            title="New Operating Room Grant",
            funding_body="World Health",
            role="Co-PI",
            status=ProposalStatus.SUBMITTED,
            submission_date=date(2025, 1, 15),
            visibility=Visibility.INSTITUTION,
        )
    )

    # ── Frank's records (Medical - Dept Head) ─────────────────────────────────
    frank = users["frank@med.org"]

    session.add(
        Publication(
            user_id=frank.id,
            title="Managing a Surgery Ward",
            type="Article",
            publisher="Health Admin",
            publication_date=date(2024, 1, 20),
            visibility=Visibility.INSTITUTION,
            status="published",
        )
    )
    session.add(
        Experience(
            user_id=frank.id,
            category="Teaching",
            organization="Medical Center",
            role_title="Senior Surgeon",
            start_date=date(2019, 9, 1),
            is_current=True,
            visibility=Visibility.INSTITUTION,
        )
    )

    await session.commit()

    # Build response
    credentials = []
    inst_map = {
        "carol@tech.edu": "Tech University",
        "bob@tech.edu": "Tech University",
        "alice@tech.edu": "Tech University",
        "dave@tech.edu": "Tech University",
        "elena@med.org": "Medical Center",
        "frank@med.org": "Medical Center",
        "grace@med.org": "Medical Center",
    }
    dept_map = {
        "bob@tech.edu": "Robotics Lab",
        "alice@tech.edu": "Robotics Lab",
        "dave@tech.edu": "Software Engineering",
        "frank@med.org": "Clinical Surgery",
        "grace@med.org": "Clinical Surgery",
    }
    for spec in DEMO_USERS:
        u = users[spec["email"]]
        credentials.append(
            {
                "email": spec["email"],
                "name": spec["name"],
                "role": spec["role"],
                "password": DEMO_PASSWORD,
                "token": create_access_token(u.id),
                "institution": inst_map.get(spec["email"]),
                "department": dept_map.get(spec["email"]),
            }
        )

    return {"seeded": True, "credentials": credentials}


@router.post("/seed")
async def seed_demo(session: AsyncSession = Depends(get_session)):
    """
    Idempotent seed. If demo data already exists, returns existing credentials
    (new tokens). Safe to call multiple times.
    """
    existing = await _find_user(session, "admin@platform.com")
    if existing:
        credentials = []
        for spec in DEMO_USERS:
            u = await _find_user(session, spec["email"])
            if u:
                credentials.append(
                    {
                        "email": spec["email"],
                        "name": spec["name"],
                        "role": spec["role"],
                        "password": DEMO_PASSWORD,
                        "token": create_access_token(u.id),
                    }
                )
        return {"seeded": False, "already_existed": True, "credentials": credentials}

    return await _seed(session)


@router.post("/reset")
async def reset_demo(session: AsyncSession = Depends(get_session)):
    """
    Wipes all demo users and their data, then re-seeds from scratch.
    """
    for spec in DEMO_USERS:
        u = await _find_user(session, spec["email"])
        if u:
            for model in (Publication, Project, Proposal, Experience):
                rows = await session.exec(select(model).where(model.user_id == u.id))
                for row in rows.all():
                    await session.delete(row)
            await session.delete(u)

    # Delete both demo institutions
    for inst_name in ("Tech University", "Medical Center"):
        inst_result = await session.exec(
            select(Institution).where(Institution.name == inst_name)
        )
        inst = inst_result.first()
        if inst:
            dept_result = await session.exec(
                select(Department).where(Department.institution_id == inst.id)
            )
            for dept in dept_result.all():
                await session.delete(dept)
            await session.delete(inst)

    await session.commit()
    return await _seed(session)
