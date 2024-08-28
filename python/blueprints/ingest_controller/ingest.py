from flask import Blueprint, jsonify, request
from services.ingest_service import IngestService
from services.job_service import JobService, JobType
from services.transcode_service import TranscodeService
from services.task_service import TaskService
from services.metadata_service import MediaType

from utils.prints import print_out

from urllib.parse import unquote

bp = Blueprint('ingest', __name__)
ingest_service = IngestService()
job_service = JobService()
transcode_service = TranscodeService()
task_service = TaskService()


@bp.route('/count_files/<string:source_folder_as_encoded_uri_component>', methods=['GET'])
def count_media(source_folder_as_encoded_uri_component):
    try:
        source_folder = unquote(source_folder_as_encoded_uri_component)
        return jsonify(ingest_service.count_media(source_folder)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/job_data/<int:job_id>', methods=['GET'])
def get_parsed_videos(job_id):
    try:
        return jsonify(job_service.get_job_data(job_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/parse_images', methods=['POST'])
def parse_images():
    payload = request.json
    try:
        source_dir = payload['source_dir']
        job_id = ingest_service.create_parse_media_job(source_dir, MediaType.IMAGE)
        return jsonify({"job_id": job_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400



@bp.route('/parse_videos', methods=['POST'])
def parse_videos():
    payload = request.json
    try:
        source_dir = payload['source_dir']
        job_id = ingest_service.create_parse_media_job(source_dir, MediaType.VIDEO)
        return jsonify({"job_id": job_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/job/<int:job_id>', methods=['GET'])
def get_job(job_id):
    try:
        return jsonify(job_service.get_job(job_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/job_status/<int:job_id>', methods=['GET'])
def job_status(job_id):
    try:
        return jsonify(job_service.check_job_status(job_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/job/<int:job_id>/tasks', methods=['GET'])
def task_statuses(job_id):
    try:
        return jsonify(task_service.get_tasks_statuses_by_job_id(job_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/transcode', methods=['POST'])
def queue_transcode():
    payload = request.json
    try:
        media_type = payload['media_type']
        source_dir = payload['source_dir']
        local_export_path = payload['local_export_path']
        transcode_list = payload['transcode_list']
        job_id = transcode_service.queue_transcode_job(source_dir, local_export_path, media_type, transcode_list)
        return jsonify({"job_id": job_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/job/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    try:
        orphaned_tasks = job_service.delete_job(job_id)
        return jsonify({"orphaned_tasks": orphaned_tasks}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/job', methods=["GET"])
def get_jobs():
    try:
        completed = str_to_bool(request.args.get('completed', default="true", type=str))
        page = request.args.get('page', type=int)
        page_size = request.args.get('page_size', type=int)

        jobs = job_service.get_jobs(JobType.TRANSCODE, completed, page, page_size)
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

def str_to_bool(value):
    return value.lower() == 'true'


@bp.route('/compress_images', methods=["POST"])
def compress_images():
    try:
        payload = request.json
        small_image_file_path = payload.get('small_image_file_path', None)
        medium_image_file_path = payload.get('medium_image_file_path', None)
        large_image_file_path = payload.get('large_image_file_path', None)
        
        job_id = transcode_service.run_compress_images(small_image_file_path, medium_image_file_path, large_image_file_path)
        return jsonify({"job_id": job_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400