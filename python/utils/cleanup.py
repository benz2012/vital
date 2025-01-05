import os
import shutil

from services.transcode_service import TranscodeService

transcode_service = TranscodeService()

def cleanup_sample_dir():
    sample_image_dir = transcode_service.get_sample_image_dir()
    if not os.path.exists(sample_image_dir):
        return
    shutil.rmtree(sample_image_dir)

# List out each task as a method-call here
def init_cleanup_tasks():
    cleanup_sample_dir()
