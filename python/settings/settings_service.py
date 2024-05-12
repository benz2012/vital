from settings.settings_model import SettingsModel
from settings.settings_enum import SettingsEnum


class SettingsService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SettingsService, cls).__new__(cls)
            cls._instance.model = SettingsModel()
        return cls._instance

    def get_setting(self, key):
        return self.model.get_setting(key)

    def set_setting(self, key, value):
        if SettingsEnum.has_value(key):
            self.model.set_setting(key, value)
        else:
            raise ValueError(f"Invalid setting key: {key}")
