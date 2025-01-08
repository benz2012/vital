import json

from model.ingest.task_model import TaskModel
from data.transcode_settings import TranscodeSettings
from data.task import TaskStatus
from model.ingest.job_model import JobModel
from services.metadata_service import MediaType

class TaskService:
    def __init__(self):
        self.task_model = TaskModel()
        self.job_model = JobModel()


    def create_task(self, job_id: int, transcode_settings: TranscodeSettings) -> int:
        return self.task_model.create(job_id, transcode_settings)

    def get_tasks_by_job_id(self, job_id: int):
        return self.task_model.get_tasks_by_job_id(job_id)

    def get_tasks_statuses_by_job_id(self, job_id: int):
        job_data = json.loads(self.job_model.get_data(job_id))
        media_type = MediaType[job_data['media_type'].upper()]
        tasks = self.get_tasks_by_job_id(job_id)
        if len(tasks) == 0:
            return {}
        status_report = {
            task.id: {
                "status": task.status,
                "progress": task.progress,
                "progress_message": task.progress_message,
                "size": self.get_task_size_for_video(task) if media_type == MediaType.VIDEO else 1,
                "error_message": task.error_message,
            }
            for task in tasks
        }
        return status_report

    def get_tasks_sample_file_data_by_job_id(self, job_id: int):
        tasks = self.get_tasks_by_job_id(job_id)
        data_list = [
            {
                "id": task.id,
                "original_file_path": task.transcode_settings.get('file_path'),
                "file_name": task.transcode_settings.get('new_name'),
                "jpeg_quality": task.transcode_settings.get('jpeg_quality'),
                "bucket_name": task.transcode_settings.get('input_height'),
            }
            for task in tasks
        ]
        return data_list

    def get_tasks_dark_data_by_job_id(self, job_id: int):
        tasks = self.get_tasks_by_job_id(job_id)
        dark_files = []
        for task in tasks:
            if task.transcode_settings.get('is_dark'):
                dark_files.append(task.transcode_settings.get('file_path'))
        return dark_files

    def get_transcode_settings(self, task_id: int) -> TranscodeSettings:
        return self.task_model.get_transcode_settings(task_id)

    def get_all_task_ids_by_status(self, job_id: int, status: str):    
        return self.task_model.get_all_task_ids_by_status(job_id, status)

    def set_task_status(self, task_id: int, status: TaskStatus):
        self.task_model.update_task_status(task_id, status)

    def set_task_progress(self, task_id: int, progress: int, message: str = ''):
        self.task_model.update_task_progress(task_id, progress, message)

    def set_task_settings(self, task_id: int, transcode_settings: TranscodeSettings):
        self.task_model.update_task_settings(task_id, transcode_settings)

    def set_task_error_message(self, task_id: int, error_message: str):
        self.task_model.set_task_error_message(task_id, error_message)

    def delete_by_job_id(self, job_id):
        orphaned_tasks = self.task_model.get_tasks_by_job_id(job_id)
        self.task_model.delete_by_job_id(job_id)
        return orphaned_tasks

    def force_delete(self, task_id):
        self.task_model.force_delete(task_id)

    """This method helps us compare tasks relativley to one another, so that
    we don't have some parts of the progress bar that fly by and others that
    that take forever. The size is an estimate based on the core tenets of bitrate
    and file size of a video.
    """
    def get_task_size_for_video(self, task):
        num_frames = task.transcode_settings.get('num_frames', 1)
        height = task.transcode_settings.get('input_height', 1080)
        height_squared_with_smaller_normal = (height * height) / (1080 * 1080)
        return num_frames * height_squared_with_smaller_normal

    def delete_old_tasks(self):
        return self.task_model.delete_old_tasks()
