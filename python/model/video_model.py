from model.sql import SQL
from settings.settings_enum import SettingsEnum
from utils.prints import print_err

class VideoModel(SQL):
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SQL, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        try:
            super().__init__()

            self.file_path = None

            self.refresh_table()
        except Exception as e:
            (print_err
             (f"Failed to initialize  VideoModel: {e}"))

    def refresh_table(self):
        self.file_path = self.settings.get_setting(SettingsEnum.VIDEO_FILE_PATH.value)
        video_model = f"""
                    CREATE TABLE video  (
                       CatalogVideoId INTEGER PRIMARY KEY AUTOINCREMENT,
                       CatalogFolderId INTEGER,
                       OriginalFileName TEXT,
                       OptimizedFileName TEXT,
                       FrameRate TEXT,
                       Hidden BOOLEAN,
                       CreatedBy TEXT,
                       CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP
                    )"""
        self.load_table('video', video_model, self.file_path, 'CatalogVideoId')

    def get_videos_by_folder_id(self, folder_id):
        try:
            cursor = self.conn.cursor()
            cursor.execute(f'SELECT * FROM video WHERE CatalogFolderId = {folder_id} AND Hidden = False')
            rows = cursor.fetchall()
            cursor.close()
            return [dict(row) for row in rows]
        except Exception as e:
            print_err(f"Failed to execute SQL query get_videos_by_folder_id: {e}")
        return None

    def get_video_by_id(self, video_id):
        try:
            cursor = self.conn.cursor()
            cursor.execute(f'SELECT * FROM video WHERE CatalogVideoId = {video_id}')
            row = cursor.fetchone()
            cursor.close()
            return dict(row) if row else None
        except Exception as e:
            print_err(f"Failed to execute SQL query get_video_by_id: {e}")
        return None

    def update_video(self, video_id, payload):
        try:
            cursor = self.conn.cursor()
            cursor.execute(f"UPDATE video SET FrameRate = {payload['frameRate']}, Hidden = {payload['hidden']} WHERE CatalogVideoId = {video_id}")
            self.conn.commit()
            cursor.close()
            self.flush_to_excel()
        except Exception as e:
            print_err(f"Failed to execute SQL query update_video: {e}")

    def flush_to_excel(self):
        return super().flush_to_excel('video', self.file_path, self.worksheet_name)
