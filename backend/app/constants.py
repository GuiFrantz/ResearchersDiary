from enum import Enum

APP_TITLE = "Researcher's Diary"
APP_VERSION = "0.1.0"

CORS_ORIGINS = ["http://localhost:3000"]  # TODO: move to env var


# Enums
class UserRole(str, Enum):
    RESEARCHER = "researcher"
    DEPARTMENT_HEAD = "department_head"
    INSTITUTION_HEAD = "institution_head"
    ADMIN = "admin"


class Visibility(str, Enum):
    PRIVATE = "private"
    DEPARTMENT = "department"
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


# HTTP Exception messages
class Errors:
    # Auth
    INVALID_TOKEN = "Invalid or expired token"
    EMAIL_ALREADY_REGISTERED = "Email already registered"
    INVALID_CREDENTIALS = "Invalid email or password"
    USER_NOT_FOUND = "User not found"

    # Permission
    INSUFFICIENT_PERMISSIONS = "Insufficient permissions"
    INVALID_ROLE = "Invalid role"

    # Not found
    INSTITUTION_NOT_FOUND = "Institution not found"
    DEPARTMENT_NOT_FOUND = "Department not found"
    PUBLICATION_NOT_FOUND = "Publication not found"
    PROJECT_NOT_FOUND = "Project not found"
    PROPOSAL_NOT_FOUND = "Proposal not found"
    EXPERIENCE_NOT_FOUND = "Experience not found"

    # Other
    INSTITUTION_HAS_USERS = "Institution still has assigned users"
    DEPARTMENT_HAS_USERS = "Department still has assigned users"
    INVALID_PROJECT = "Invalid project"
