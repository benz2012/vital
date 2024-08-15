import sqlite3
from enum import Enum

from model.config import DB_PATH

class JobStatus(Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"

class JobType(Enum):
    METADATA = "METADATA"
    TRANSCODE = "TRANSCODE"


class JobModel:
    def __init__(self, db_name=DB_PATH):
        self.db_name = db_name
        self.conn = sqlite3.connect(self.db_name, check_same_thread=False)
        self.cursor = self.conn.cursor()

        self.cursor.execute("""
               CREATE TABLE IF NOT EXISTS job (
                   id INTEGER PRIMARY KEY,
                   type TEXT,
                   status TEXT,
                   data TEXT
               )
           """)

        self.conn.commit()

    def create(self, job_type: JobType):
        self.cursor.execute("INSERT INTO job (type, status) VALUES (?, ?)", (job_type.value, JobStatus.PENDING.value,))
        self.conn.commit()
        return self.cursor.lastrowid

    def store_data(self, job_id, data):
        self.cursor.execute("UPDATE job SET status = ?, data = ? WHERE id = ?", (JobStatus.COMPLETED.value, data, job_id))
        self.conn.commit()

    def get_data(self, job_id):
        print(job_id)
        self.cursor.execute("SELECT data FROM job WHERE id = ?", (job_id,))
        return self.cursor.fetchone()[0]

    def get_status(self, job_id):
        self.cursor.execute("SELECT status FROM job WHERE id = ?", (job_id,))
        return self.cursor.fetchone()[0]
