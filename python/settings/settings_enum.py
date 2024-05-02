from enum import Enum


class SettingsEnum(Enum):
    CATALOG_FOLDER_FILE_PATH = 'catalog_folder_file_path'
    CATALOG_FOLDER_SHEET_NAME = 'catalog_folder_sheet_name'

    CATALOG_VIDEO_FILE_PATH = 'catalog_video_file_path'
    CATALOG_VIDEO_SHEET_NAME = 'catalog_video_sheet_name'

    ASSOCIATION_FILE_PATH = 'association_file_path'
    ASSOCIATION_SHEET_NAME = 'association_sheet_name'

    SIGHTING_FILE_PATH = 'sighting_file_path'
    SIGHTING_SHEET_NAME = 'sighting_sheet_name'

    THUMBNAIL_DIR_PATH = 'thumbnail_dir_path'
    STILLFRAME_DIR_NAME = 'stillframe_dir_path'

    FOLDER_OF_VIDEOS = 'folder_of_videos'
    CURRENT_VIDEO = 'current_video'

    @classmethod
    def has_value(cls, value):
        return value in cls._value2member_map_
