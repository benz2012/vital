from .settings_model import SettingsModel

class SettingsService:
    def __init__(self):
        self.model = SettingsModel()

    def get_association_file_path(self):
        return self.model.get_setting('association_file_path')

    def set_association_file_path(self, file_path):
        self.model.set_setting('association_file_path', file_path)

    def get_association_sheet_name(self):     
        return self.model.get_setting('association_sheet_name')
    
    def set_association_sheet_name(self, sheet_name):
        self.model.set_setting('association_sheet_name', sheet_name)   