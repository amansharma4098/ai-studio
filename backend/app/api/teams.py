"""
Teams & Workspace API — Enterprise multi-tenant team management.
POST   /api/teams/              — create team
GET    /api/teams/              — list user's teams
GET    /api/teams/{id}          — get team details
PUT    /api/teams/{id}          — update team
POST   /api/teams/{id}/invite   — invite member
DELETE /api/teams/{id}/members/{uid} — remove member
GET    /api/teams/{id}/members  — list members
"""
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.db.session import get_db
from app.db.models import Team, TeamMember, User
from app.api.deps import get_current_user

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────
class TeamCreate(BaseModel):
    name: str
    description: str = ""


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class InviteRequest(BaseModel):
    email: str
    role: str = "member"  # admin | member | viewer


class TeamResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    plan: str
    max_agents: int
    max_members: int
    max_runs_per_month: int
    runs_this_month: int
    member_count: int = 0
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class MemberResponse(BaseModel):
    id: str
    user_id: str
    email: str
    name: str
    role: str
    joined_at: str


# ── Create Team ──────────────────────────────────────────────
@router.post("/", response_model=TeamResponse)
async def create_team(
    payload: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    slug = re.sub(r'[^a-z0-9]+', '-', payload.name.lower()).strip('-')

    # Check slug uniqueness
    existing = await db.execute(select(Team).where(Team.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{str(current_user.id)[:4]}"

    team = Team(
        name=payload.name,
        slug=slug,
        description=payload.description,
        owner_id=current_user.id,
    )
    db.add(team)
    await db.flush()

    # Add owner as first member
    db.add(TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="owner",
    ))

    await db.commit()
    await db.refresh(team)

    return _team_response(team, 1)


# ── List Teams ───────────────────────────────────────────────
@router.get("/", response_model=List[TeamResponse])
async def list_teams(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == current_user.id)
    )
    teams = result.scalars().all()

    responses = []
    for team in teams:
        count_result = await db.execute(
            select(TeamMember).where(TeamMember.team_id == team.id)
        )
        count = len(count_result.scalars().all())
        responses.append(_team_response(team, count))

    return responses


# ── Get Team ────────────────────────────────────────────────
@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = await _get_team_or_404(db, team_id, current_user.id)
    count_result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team.id)
    )
    count = len(count_result.scalars().all())
    return _team_response(team, count)


# ── Update Team ─────────────────────────────────────────────
@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    payload: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = await _get_team_or_404(db, team_id, current_user.id, require_admin=True)
    if payload.name:
        team.name = payload.name
    if payload.description is not None:
        team.description = payload.description
    await db.commit()
    await db.refresh(team)
    return _team_response(team, 0)


# ── Invite Member ───────────────────────────────────────────
@router.post("/{team_id}/invite")
async def invite_member(
    team_id: str,
    payload: InviteRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    team = await _get_team_or_404(db, team_id, current_user.id, require_admin=True)

    # Find user by email
    user_result = await db.execute(
        select(User).where(User.email == payload.email)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found with that email")

    # Check not already member
    existing = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member")

    # Check member limit
    count_result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id)
    )
    current_count = len(count_result.scalars().all())
    if current_count >= team.max_members:
        raise HTTPException(status_code=403, detail=f"Team member limit reached ({team.max_members}). Upgrade your plan.")

    db.add(TeamMember(
        team_id=team_id,
        user_id=user.id,
        role=payload.role,
        invited_by=current_user.id,
    ))
    await db.commit()

    return {"status": "invited", "email": payload.email, "role": payload.role}


# ── List Members ────────────────────────────────────────────
@router.get("/{team_id}/members", response_model=List[MemberResponse])
async def list_members(
    team_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_team_or_404(db, team_id, current_user.id)

    result = await db.execute(
        select(TeamMember, User)
        .join(User, User.id == TeamMember.user_id)
        .where(TeamMember.team_id == team_id)
    )

    members = []
    for member, user in result.all():
        members.append(MemberResponse(
            id=member.id,
            user_id=member.user_id,
            email=user.email,
            name=user.name,
            role=member.role,
            joined_at=str(member.joined_at),
        ))

    return members


# ── Remove Member ───────────────────────────────────────────
@router.delete("/{team_id}/members/{user_id}")
async def remove_member(
    team_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_team_or_404(db, team_id, current_user.id, require_admin=True)

    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the team owner")

    await db.delete(member)
    await db.commit()
    return {"status": "removed"}


# ── Helpers ──────────────────────────────────────────────────
async def _get_team_or_404(db, team_id, user_id, require_admin=False):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check membership
    member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this team")

    if require_admin and member.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    return team


def _team_response(team, member_count):
    return TeamResponse(
        id=team.id,
        name=team.name,
        slug=team.slug,
        description=team.description,
        plan=team.plan,
        max_agents=team.max_agents,
        max_members=team.max_members,
        max_runs_per_month=team.max_runs_per_month,
        runs_this_month=team.runs_this_month,
        member_count=member_count,
        is_active=team.is_active,
        created_at=str(team.created_at),
    )
