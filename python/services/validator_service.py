import os

from datetime import datetime
from data.validation_status import ValidationStatus
from services.metadata_service import MediaType
from settings.settings_service import SettingsService, SettingsEnum

from utils.file_path import extract_catalog_folder_info, construct_catalog_folder_path

class ValidatorService:
    LENGTH_ERROR = 'LENGTH_ERROR'
    WHITESPACE_ERROR = 'WHITESPACE_ERROR'
    MEDIA_PATH_WARNING = 'MEDIA_PATH_WARNING'
    MEDIA_PATH_ERROR = 'MEDIA_PATH_ERROR'
    FILE_EXISTS_WARNING = 'FILE_EXISTS_WARNING'
    WINDOWS_MAX_PATH_LENGTH_ERROR = 'WINDOWS_MAX_PATH_LENGTH_ERROR'

    INCORRECT_CREATED_TIME = 'INCORRECT_CREATED_TIME'

    VALID = 'VALID'

    MAX_LENGTH = 20

    def __init__(self):
        self.settings_service = SettingsService()

    def validate_media(self, source_dir, observer_code, media_metadata, media_type):
        validation_status = ValidationStatus()

        if not self.validate_length(media_metadata.file_path):
            validation_status.errors.append(self.LENGTH_ERROR)

        if not self.validate_whitespace(media_metadata.file_path):
            validation_status.errors.append(self.WHITESPACE_ERROR)

        if not self.validate_media_date(source_dir, media_metadata):
            validation_status.warnings.append(self.INCORRECT_CREATED_TIME)

        validate_path = self.validate_path(source_dir, media_metadata.file_path, media_type)

        if validate_path == self.MEDIA_PATH_WARNING:
            validation_status.warnings.append(self.MEDIA_PATH_WARNING)

        if validate_path == self.MEDIA_PATH_ERROR:
            validation_status.errors.append(self.MEDIA_PATH_ERROR)

        if not self.validate_non_existence(source_dir, observer_code, media_metadata.file_path, media_type):
            validation_status.warnings.append(self.FILE_EXISTS_WARNING)

        return validation_status


    def validate_length(self, media_path):
        basename = os.path.basename(media_path)
        name_no_ext = os.path.splitext(basename)[0]
        return len(name_no_ext) <= self.MAX_LENGTH


    def validate_whitespace(self, media_path):
        basename = os.path.basename(media_path)
        name_no_ext = os.path.splitext(basename)[0]
        starts_with_space = name_no_ext.startswith(' ')
        ends_with_space = name_no_ext.endswith(' ')
        return (starts_with_space or ends_with_space) == False


    def validate_media_date(self, source_dir, media_metadata):
        folder_name = os.path.basename(source_dir)

        date_string = '-'.join(folder_name.split('-')[:3])
        folder_date = datetime.strptime(date_string, "%Y-%m-%d").date()

        media_creation_date = datetime.fromtimestamp(media_metadata.created_date).date()
        media_modification_date = datetime.fromtimestamp(media_metadata.modified_date).date()
        media_original_date = datetime.fromtimestamp(media_metadata.original_date).date() if media_metadata.original_date else None

        return (
            folder_date == media_creation_date
            or folder_date == media_modification_date
            or folder_date == media_original_date
        )


    def validate_path(self, source_dir, media_path, media_type):
        if self.is_direct_parent(source_dir, media_path):
            return self.VALID

        if self.is_second_descendant(source_dir, media_path):
            if media_type == MediaType.VIDEO:
                return self.MEDIA_PATH_WARNING

        return self.MEDIA_PATH_ERROR


    def is_direct_parent(self, source_dir, file_path):
        parent_dir = os.path.dirname(file_path)
        return parent_dir == source_dir


    def is_second_descendant(self, source_dir, file_path):
        parent_dir = os.path.dirname(file_path)
        grandparent_dir = os.path.dirname(parent_dir)
        return grandparent_dir == source_dir

    def make_path_for_validators(self, source_dir, observer_code, original_file_path, media_type, new_name=None):
        source_dir_name = os.path.basename(source_dir)
        catalog_folder_info = extract_catalog_folder_info(source_dir_name)
        # remove the source observer code and replace it with the observer code explictly set by the user
        # later, construct_catalog_folder_path will clean the observer code if it has illegal characters
        catalog_folder_info = catalog_folder_info[:-1] + (observer_code,)

        original_file_name = os.path.splitext(os.path.basename(original_file_path))[0]
        output_file_name = new_name or original_file_name

        if media_type == MediaType.VIDEO:
            optimized_base_dir = self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_VIDEOS.value)
            optimized_dir_path = construct_catalog_folder_path(optimized_base_dir, *catalog_folder_info)
            original_subdirs = original_file_path.replace(source_dir, '').lstrip(os.path.sep).split(os.path.sep)[:-1]
            expected_final_dir = os.path.join(optimized_dir_path, *original_subdirs, output_file_name)
            return expected_final_dir

        # MediaType.IMAGE
        optimized_base_dir = self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_OPTIMIZED_IMAGES.value)
        optimized_dir_path = construct_catalog_folder_path(optimized_base_dir, *catalog_folder_info)
        expected_final_file_path = os.path.join(optimized_dir_path, f'{output_file_name}.jpg')
        return expected_final_file_path

    def validate_path_lengths(self, source_dir, observer_code, original_file_path, media_type, new_name=None):
        # This is a WindowsOS limitation
        return len(
            self.make_path_for_validators(source_dir, observer_code, original_file_path, media_type, new_name)
        ) < 256

    def validate_non_existence(self, source_dir, observer_code, original_file_path, media_type, new_name=None):
        return not os.path.exists(
            self.make_path_for_validators(source_dir, observer_code, original_file_path, media_type, new_name)
        )

    def validate_year_for_source(self, source_dir):
        source_dir_name = os.path.basename(source_dir)
        catalog_folder_info = extract_catalog_folder_info(source_dir_name)

        for base_dir in [
            self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_ORIGINAL_IMAGES.value),
            self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_OPTIMIZED_IMAGES.value),
            self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_ORIGINAL_VIDEOS.value),
            self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_VIDEOS.value),
        ]:
            expected_dir_path = construct_catalog_folder_path(base_dir, *catalog_folder_info)
            expected_year_dir = os.path.split(expected_dir_path)[0]
            if not os.path.exists(expected_year_dir):
                return expected_year_dir

        return None
