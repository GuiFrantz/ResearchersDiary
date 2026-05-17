from enum import Enum

APP_TITLE = "Researcher's Diary"
APP_VERSION = "0.1.0"
INVITATION_TTL_DAYS = 30


# Enums
class UserRole(str, Enum):
    RESEARCHER = "researcher"
    DEPARTMENT_HEAD = "department_head"
    INSTITUTION_HEAD = "institution_head"


class Visibility(str, Enum):
    PRIVATE = "private"
    INSTITUTION = "institution"


class AuthProvider(str, Enum):
    LOCAL = "local"
    GOOGLE = "google"


class ProjectStatus(str, Enum):
    ACTIVE = "active"
    CONCLUDED = "concluded"
    CANCELED = "canceled"


class ProposalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    DENIED = "denied"


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


# Routes
class ApiPrefix:
    AUTH = "/api/auth"
    USERS = "/api/users"
    INSTITUTIONS = "/api/institutions"
    DEPARTMENTS = "/api/departments"
    PUBLICATIONS = "/api/publications"
    PROJECTS = "/api/projects"
    PROPOSALS = "/api/proposals"
    EXPERIENCES = "/api/experiences"
    INVITATIONS = "/api/invitations"


# HTTP Exception messages
class Errors:
    # Auth
    INVALID_TOKEN = "Invalid or expired token"
    EMAIL_ALREADY_REGISTERED = "Email already registered"
    INVALID_CREDENTIALS = "Invalid email or password"

    # Generic
    INSUFFICIENT_PERMISSIONS = "Insufficient permissions"
    BAD_REQUEST = "Invalid request"
    INVALID_ROLE = "Invalid role"

    # Not found
    USER_NOT_FOUND = "User not found"
    INSTITUTION_NOT_FOUND = "Institution not found"
    DEPARTMENT_NOT_FOUND = "Department not found"
    PUBLICATION_NOT_FOUND = "Publication not found"
    PROJECT_NOT_FOUND = "Project not found"
    PROPOSAL_NOT_FOUND = "Proposal not found"
    EXPERIENCE_NOT_FOUND = "Experience not found"
    INVITATION_NOT_FOUND = "Invitation not found"

    # Membership
    NOT_A_MEMBER = "You are not a member of this institution or department"
    LAST_HEAD_CANNOT_LEAVE = "You must assign your Head role to another member first"
    INSTITUTION_HAS_USERS = "Institution still has assigned users"
    DEPARTMENT_HAS_USERS = "Department still has assigned users"

    # Invitations
    INVITATION_EXPIRED = "This invitation has expired"
    INVITATION_ALREADY_ANSWERED = "This invitation has already been answered"
    INVITATION_ALREADY_PENDING = (
        "A pending invitation already exists for this recipient and institution"
    )
