import os

SCHEMA_VERSION = '0021'
DB_PATH = os.path.join(os.getenv('APPDATA'), 'VITAL', f'vital-{SCHEMA_VERSION}.db')
