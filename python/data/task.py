import json
from dataclasses import dataclass, asdict

from data.transcode_settings import TranscodeSettings

from enum import Enum

@dataclass
class Task:
    id: int
    job_id: int
    status: str
    progress: int
    transcode_settings: TranscodeSettings
    error_message: str

    def to_dict(self):  
        return asdict(self) 



class TaskStatus(Enum):
    QUEUED = "QUEUED"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"

