import logging
import sys
from flask import Flask
from flask_cors import CORS

from utils.custom_flask_logs import FilterRequestLogs
from utils.death import terminate_all
from utils.cleanup import init_cleanup_tasks

from blueprints.linkages_controller.linkages import bp as linkages_bp
from blueprints.sightings_controller.sightings import bp as sightings_bp
from blueprints.settings_controller.settings import bp as settings_bp
from blueprints.videos_controller.videos import bp as videos_bp
from blueprints.folders_controller.folders import bp as folders_bp
from blueprints.thumbnails_controller.thumbnails import bp as thumbnails_bp
from blueprints.still_exports_controller.still_exports import bp as still_exports_bp
from blueprints.ingest_controller.ingest import bp as ingest_bp
from blueprints.queue_controller.queue import bp as queue_bp
from blueprints.observer_controller.observer import bp as observer_bp

from services.scheduler_service import SchedulerService

log_werkzeug = logging.getLogger("werkzeug")
log_werkzeug.addFilter(FilterRequestLogs())

app = Flask(__name__)
CORS(app)

app.register_blueprint(linkages_bp, url_prefix='/linkages')
app.register_blueprint(sightings_bp, url_prefix='/sightings')
app.register_blueprint(settings_bp, url_prefix='/settings')
app.register_blueprint(videos_bp, url_prefix='/videos')
app.register_blueprint(folders_bp, url_prefix='/folders')
app.register_blueprint(thumbnails_bp, url_prefix='/thumbnails')
app.register_blueprint(still_exports_bp, url_prefix='/still_exports')
app.register_blueprint(ingest_bp, url_prefix='/ingest')
app.register_blueprint(queue_bp, url_prefix='/queue')
app.register_blueprint(observer_bp, url_prefix='/observers')

scheduler = SchedulerService()
init_cleanup_tasks()

@app.route('/ping', methods=['GET'])
def ping():
    return 'pong'


@app.route('/terminate', methods=['GET'])
def terminate():
    terminate_all()
    sys.exit(0)

if __name__ == '__main__':
    scheduler.start()
    app.run(host='127.0.0.1', port=5000)
