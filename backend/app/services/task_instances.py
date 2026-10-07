from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task_instance import TaskInstance


async def get_or_create_task_instance(session_id: str, task_type: str, db: AsyncSession) -> TaskInstance:
    """The session's active instance of a task, created on first use."""
    stmt = select(TaskInstance).where(
        TaskInstance.session_id == session_id,
        TaskInstance.task_type == task_type,
        TaskInstance.status == "active"
    )
    result = await db.execute(stmt)
    task_instance = result.scalar_one_or_none()
    if not task_instance:
        task_instance = TaskInstance(session_id=session_id, task_type=task_type, status="active")
        db.add(task_instance)
        await db.flush()
    return task_instance
