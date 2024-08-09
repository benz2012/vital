import threading
import os
import sys
import tempfile
import subprocess
import shutil

from typing import List
from data.transcode_settings import TranscodeSettings
from services.job_service import JobService
from services.task_service import TaskService
from model.ingest.job_model import JobType
from settings.settings_service import SettingsService, SettingsEnum
from data.task import TaskStatus

from utils.file_path import extract_catalog_folder_info, construct_catalog_folder_path


class TranscodeService:

    def __init__(self):
        self.job_service = JobService()
        self.task_service = TaskService()
        self.settings_service = SettingsService()

        base_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
        self.ffmpeg_path = os.path.join(base_dir, 'resources', 'ffmpeg.exe')
        self.mp4box_path = os.path.join(base_dir, 'resources', 'mp4box.exe')

    def start_transcode_job(self, source_dir: str, transcode_settings_list: List[TranscodeSettings]) -> int:

        transcode_job_id = self.job_service.create_job(JobType.TRANSCODE)

        transcode_task_ids = []
        for transcode_settings_json in transcode_settings_list:
            transcode_settings = TranscodeSettings(**transcode_settings_json)
            transcode_task_id = self.task_service.create_task(transcode_job_id, transcode_settings)
            transcode_task_ids.append(transcode_task_id)

        threading.Thread(target=self.transcode_videos, args=(source_dir, transcode_task_ids,)).start()
        
        return transcode_job_id

    def restart_transcode_job(self, job_id: int, source_dir: str) -> int:
        failed_transcode_task_ids = self.task_service.get_all_task_ids_by_status(job_id, TaskStatus.PENDING)
        failed_transcode_task_ids.extend(self.task_service.get_all_task_ids_by_status(job_id, TaskStatus.ERROR))
        
        threading.Thread(target=self.transcode_videos, args=(source_dir, failed_transcode_task_ids,)).start()

        return job_id

    def transcode_videos(self, source_dir, transcode_task_ids: List[int]):   
        optimized_base_dir = self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_VIDEOS.value)
        original_base_dir = self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_ORIGINAL_VIDEOS.value)

        source_dir_name = os.path.basename(source_dir)
        catalog_folder_info = extract_catalog_folder_info(source_dir_name)
        optimized_dir_path = construct_catalog_folder_path(optimized_base_dir, *catalog_folder_info)
        original_dir_path = construct_catalog_folder_path(original_base_dir, *catalog_folder_info)

        os.makedirs(optimized_dir_path, exist_ok=True)
        os.makedirs(original_dir_path, exist_ok=True)

        with tempfile.TemporaryDirectory() as temp_dir:
            for transcode_task_id in transcode_task_ids:
                try:
                    transcode_settings = self.task_service.get_transcode_settings(transcode_task_id)
                    original_file = transcode_settings.file_path

                    shutil.copy(original_file, original_dir_path)
                    
                    original_file_name = os.path.basename(original_file)
                    temp_file = os.path.join(temp_dir, original_file_name)

                    # sample ffmpeg command, will be substituted
                    ffmpeg_command = [
                        self.ffmpeg_path,
                        '-i',original_file,
                    temp_file 
                    ]
                    
                    subprocess.run(ffmpeg_command, check=True) 

                    # sample command, not really sure what I'm doing here but the mp4box seems to be running correctly
                    mp4box_command = [
                        self.mp4box_path,
                           '-dash', "1000",
                            '-out', optimized_dir_path,
                            temp_file
                    ]

                    subprocess.run(mp4box_command, check=True)

                    self.task_service.set_task_status(transcode_task_id, TaskStatus.COMPLETED) 

                except Exception as e:
                    # will need to catch specific exceptions in the future for more granular error messages
                    self.task_service.set_task_status(transcode_task_id, TaskStatus.ERROR)
                    self.task_service.set_task_error_message(transcode_task_id, str(e))
            