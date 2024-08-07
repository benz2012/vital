from flask import Blueprint, jsonify, request
from services.ingest_service import IngestService
from services.job_service import JobService
from services.transcode_service import TranscodeService

from urllib.parse import unquote

bp = Blueprint('ingest', __name__)
ingest_service = IngestService()
job_service = JobService()
transcode_service = TranscodeService()


@bp.route('/count_files/<string:source_folder_as_encoded_uri_component>', methods=['GET'])
def count_media(source_folder_as_encoded_uri_component):
    try:
        source_folder = unquote(source_folder_as_encoded_uri_component)
        return jsonify(ingest_service.count_media(source_folder)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/parse_videos/<int:job_id>', methods=['GET'])
def get_parsed_videos(job_id):
    try:
        return jsonify(job_service.get_job_data(job_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/parse_videos', methods=['POST'])
def parse_videos():
    payload = request.json
    try:
        source_folder = unquote(payload['source_folder'])
        job_id = ingest_service.create_parse_video_job(source_folder)
        return jsonify({"job_id": job_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/job_status/<int:job_id>', methods=['GET'])
def job_status(job_id):
    try:
        return jsonify(job_service.check_job_status(job_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/transcode', methods=['POST'])
def start_transcode():
    payload = request.json
    transcode_list = payload['transcode_list']
    try:
        return jsonify(transcode_service.start_transcode_job(transcode_list)), 200
    except Exception as e:
        return jsonify({"error:", str(e)}), 400


@bp.route('/restart/<int:job_id>', methods=['GET'])
def restart_transcode(job_id):
    try:
        transcode_service.restart_transcode_job(job_id)
        return jsonify({"job_id": job_id}), 200 
    except Exception as e:
        return jsonify({"error": str(e)}), 400