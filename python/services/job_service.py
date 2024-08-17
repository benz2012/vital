import json

from model.ingest.job_model import JobModel, JobType, JobStatus
from services.task_service import TaskService
from model.ingest.task_model import TaskStatus




class JobService:
    def __init__(self):
        self.job_model = JobModel()
        self.task_service = TaskService()

    def create_job(self, job_type: JobType, job_status: JobStatus, data=None):
        json_data = json.dumps(data)
        return self.job_model.create(job_type, job_status, json_data)

    def store_job_data(self, job_id, data):
        json_data = json.dumps(data)
        self.job_model.store_data(job_id, json_data)

    def get_job_data(self, job_id):
        return json.loads(self.job_model.get_data(job_id))
    
    def get_non_complete_jobs(self, ):
        return self.job_model.get_non_complete_jobs()

    def check_job_status(self, job_id):
        return self.job_model.get_status(job_id)

    def set_job_status(self, job_id):
        tasks = self.task_service.get_tasks_by_job_id(job_id)

        for task in tasks:
            if task.status != TaskStatus.COMPLETED.value:
                self.job_model.set_status(JobStatus.INCOMPLETE)
                return
        
        self.job_model.set_status(JobStatus.COMPLETED)