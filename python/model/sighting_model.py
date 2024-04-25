import sys
import json

from model.sql import SQL
from settings.settings_enum import SettingsEnum


class SightingModel(SQL):

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SQL, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        super().__init__()

        self.file_path = None
        self.worksheet_name = None

        self.refresh_table()

    def refresh_table(self):
        self.file_path = self.settings.get_setting(SettingsEnum.SIGHTING_FILE_PATH.value)
        self.worksheet_name = self.settings.get_setting(SettingsEnum.SIGHTING_SHEET_NAME.value)
        sighting_create = f"""
                    CREATE TABLE sighting  (
                       SightingId INTEGER PRIMARY KEY AUTOINCREMENT,
                       SightingEGNo INTEGER,
                       AssociationId INTEGER,
                       SightingYear INTEGER,
                       SightingMonth INTEGER,
                       SightingDay INTEGER,
                       ObserverCode TEXT,
                       SightingTime INTEGER,
                       SightingLetter TEXT
                    )"""
        self.load_table('sighting', sighting_create, self.file_path, self.worksheet_name, 'SightingId')

    def get_all_sightings(self):
        try:
            self.cursor.execute('SELECT * FROM sighting')
            rows = self.cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            sys.stderr.write(f"Failed to execute SQL query get_all_sightings: {e}")
        return None

    def get_sighting_by_id(self, sighting_id):
        try:
            self.cursor.execute(f'SELECT * FROM sighting WHERE SightingId = {sighting_id}')
            rows = self.cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            sys.stderr.write(f"Failed to execute SQL query get_sighting_by_id: {e}")
        return None
