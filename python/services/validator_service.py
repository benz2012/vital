import os

from datetime import datetime
from data.validation_status import ValidationStatus

class ValidatorService:


    LENGTH_ERROR = 'LENGTH_ERROR'
    VIDEO_PATH_WARNING = 'VIDEO_PATH_WARNING'
    VIDEO_PATH_ERROR = 'VIDEO_PATH_ERROR'

    INCORRECT_CREATED_TIME = 'INCORRECT_CREATED_TIME'

    VALID = 'VALID'

    # TODO: Change back to 20
    MAX_LENGTH = 100

    def validate_video(self, source_dir, video_metadata):
        validation_status = ValidationStatus()

        if not self.validate_length(video_metadata.file_path):
            validation_status.errors.append(self.LENGTH_ERROR)

        if not self.validate_video_date(source_dir, video_metadata):
            validation_status.warnings.append(self.INCORRECT_CREATED_TIME)

        validate_path = self.validate_path(source_dir, video_metadata.file_path)

        if validate_path == self.VIDEO_PATH_WARNING:
            validation_status.warnings.append(self.VIDEO_PATH_WARNING)

        if validate_path == self.VIDEO_PATH_ERROR:
            validation_status.errors.append(self.VIDEO_PATH_ERROR)

        return validation_status


    def validate_length(self, video_path):
        return len(os.path.basename(video_path)) <= self.MAX_LENGTH


    def validate_video_date(self, source_dir, video_metadata):
        folder_name = os.path.basename(source_dir)

        date_string = '-'.join(folder_name.split('-')[:3])
        folder_date = datetime.strptime(date_string, "%Y-%m-%d").date()

        video_creation_date = datetime.fromtimestamp(video_metadata.created_date).date()

        video_modification_date = datetime.fromtimestamp(video_metadata.modified_date).date()

        return (folder_date == video_creation_date) or (folder_date == video_modification_date)


    def validate_path(self, source_dir, video_path):
        if self.is_direct_parent(source_dir, video_path):
            return self.VALID

        if self.is_second_descendant(source_dir, video_path):
            return self.VIDEO_PATH_WARNING

        return self.VIDEO_PATH_ERROR


    def is_direct_parent(self, source_dir, file_path):
        parent_dir = os.path.dirname(file_path)
        return parent_dir == source_dir


    def is_second_descendant(self, source_dir, file_path):
        parent_dir = os.path.dirname(file_path)
        grandparent_dir = os.path.dirname(parent_dir)
        return grandparent_dir == source_dir
