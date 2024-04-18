from enum import Enum


class SettingsEnum(Enum):
    ASSOCIATION_FILE_PATH = 'association_file_path'
    ASSOCIATION_SHEET_NAME = 'association_sheet_name'

    SIGHTING_FILE_PATH = 'sighting_file_path'
    SIGHTING_SHEET_NAME = 'sighting_sheet_name'

    THUMBNAIL_DIR_PATH = 'thumbnail_dir_path'
    STILLFRAME_DIR_NAME = 'stillframe_dir_path'

    @classmethod
    def has_value(cls, value):
        return value in cls._value2member_map_
