from .department import DepartmentCreate, DepartmentRead, DepartmentUpdate
from .experience import ExperienceCreate, ExperienceRead, ExperienceUpdate
from .institution import InstitutionCreate, InstitutionRead, InstitutionUpdate
from .invitation import InvitationCreate, InvitationRead
from .project import ProjectCreate, ProjectRead, ProjectUpdate
from .proposal import ProposalCreate, ProposalRead, ProposalUpdate
from .publication import PublicationCreate, PublicationRead, PublicationUpdate
from .user import (
    AssignDepartment,
    AssignRole,
    Token,
    UserLogin,
    UserProfileUpdate,
    UserRead,
    UserRegister,
)

__all__ = [
    # User
    "UserRegister",
    "UserLogin",
    "Token",
    "UserRead",
    "UserProfileUpdate",
    "AssignDepartment",
    "AssignRole",
    # Institution
    "InstitutionCreate",
    "InstitutionUpdate",
    "InstitutionRead",
    # Department
    "DepartmentCreate",
    "DepartmentUpdate",
    "DepartmentRead",
    # Invitation
    "InvitationCreate",
    "InvitationRead",
    # Publication
    "PublicationCreate",
    "PublicationUpdate",
    "PublicationRead",
    # Project
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectRead",
    # Proposal
    "ProposalCreate",
    "ProposalUpdate",
    "ProposalRead",
    # Experience
    "ExperienceCreate",
    "ExperienceUpdate",
    "ExperienceRead",
]
