import os
import subprocess
import json
import threading
import sys

import time

from services.job_service import JobService
from utils.prints import print_err


class IngestService:

    def __init__(self):
        self.video_extensions = ['.mp4', '.avi', '.mov', '.flv', '.wmv', '.ts', '.m4v']
        self.image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff', '.orf', '.cr2', '.dng']

        base_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
        self.ffprobe_path = os.path.join(base_dir, 'resources', 'ffprobe.exe')
        if not os.path.isfile(self.ffprobe_path):
            print_err(f"ffprobe_path.exe does not exist at {self.ffprobe_path}")
            raise FileNotFoundError(f"ffprobe_path.exe does not exist at {self.ffprobe_path}")

        self.job_service = JobService()

    def create_parse_video_job(self, source_dir):
        job_id = self.job_service.create_job()
        threading.Thread(target=self.parse_videos, args=(job_id, source_dir,)).start()
        return job_id

    def parse_videos(self, job_id, source_dir):
        video_files = self.get_files(source_dir, self.video_extensions)

        video_metadata_arr = []
        for video in video_files:
            video_metadata = self.ffprobe_metadata(video)

            video_metadata_arr.append(video_metadata)

        self.job_service.store_job_data(job_id, video_metadata_arr)

    def get_files(self, source_dir, extensions):
        found_files = []
        for root, dirs, filenames in os.walk(source_dir):
            for filename in filenames:
                file_extension = os.path.splitext(filename)[1]
                if file_extension:
                    file_extension = file_extension.lower()
                if file_extension in extensions:
                    found_files.append(os.path.join(root, filename))

        return found_files

    def ffprobe_metadata(self, input_path, start_number=None):
        command = [
            "ffprobe",
            "-loglevel",
            "panic",
            "-hide_banner",
            "-show_streams",
            "-select_streams",
            "v",
            "-print_format",
            "json",
            input_path,
        ]
        if start_number:
            command.extend(["-start_number", str(start_number)])
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        metadata_json, error = process.communicate()
        if error:
            print_err.error("ffprobe error: %s", error)

        metadata_obj = json.loads(metadata_json)
        try:
            metadata = metadata_obj["streams"][0]
        except KeyError:
            print_err.error("No FFprobe metadata was found at path %s", input_path)
            return None
        return {
            "file_name": os.path.basename(input_path),
            "width": metadata.get("width"),
            "height": metadata.get("height"),
            "duration": metadata.get("duration"),
            "frame_rate": self.parse_frame_rate_str(metadata.get("r_frame_rate")),
        }

    def parse_frame_rate_str(self, frame_rate_str):
        if frame_rate_str:
            rates = frame_rate_str.split("/")
            if len(rates) > 1:
                rate = float(rates[0]) / float(rates[1])
            else:
                rate = float(rates[0])
            return str(rate)
        return ""

    def count_media(self, source_dir):
        video_files_count = len(self.get_files(source_dir, self.video_extensions))
        image_files_count = len(self.get_files(source_dir, self.image_extensions))

        return {
            'images': image_files_count,
            'videos': video_files_count,
        }
