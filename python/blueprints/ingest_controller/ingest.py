from flask import Blueprint, request, send_from_directory
from urllib.parse import unquote

from services.ingest_service import IngestService
from services.validator_service import ValidatorService
from services.job_service import JobService, JobType
from services.transcode_service import TranscodeService
from services.task_service import TaskService
from services.metadata_service import MediaType
from services.color_correct_service import ColorCorrectService
from utils.endpoints import tryable_json_endpoint
from utils.prints import print_out


bp = Blueprint('ingest', __name__)
ingest_service = IngestService()
job_service = JobService()
transcode_service = TranscodeService()
task_service = TaskService()
validator_service = ValidatorService()
color_correct_service = ColorCorrectService()

def str_to_bool(value):
    return value.lower() == 'true'


@bp.route('/count_files/<string:source_folder_as_encoded_uri_component>', methods=['GET'])
@tryable_json_endpoint
def count_media(source_folder_as_encoded_uri_component):
    source_folder = unquote(source_folder_as_encoded_uri_component)
    return ingest_service.count_media(source_folder)


@bp.route('/job_data/<int:job_id>', methods=['GET'])
@tryable_json_endpoint
def get_parsed_videos(job_id):
    return job_service.get_job_data(job_id)


@bp.route('/parse_images', methods=['POST'])
@tryable_json_endpoint
def parse_images():
    payload = request.json
    source_dir = payload['source_dir']
    observer_code = payload['observer_code']
    job_id = ingest_service.create_parse_media_job(source_dir, observer_code, MediaType.IMAGE)
    return {"job_id": job_id}


@bp.route('/parse_videos', methods=['POST'])
@tryable_json_endpoint
def parse_videos():
    payload = request.json
    source_dir = payload['source_dir']
    observer_code = payload['observer_code']
    job_id = ingest_service.create_parse_media_job(source_dir, observer_code, MediaType.VIDEO)
    return {"job_id": job_id}


@bp.route('/validate_path_lengths/<string:media_str>', methods=['POST'])
@tryable_json_endpoint
def validate_path_lengths(media_str):
    payload = request.json
    source_dir = payload['source_dir']
    observer_code = payload['observer_code']
    media_type = MediaType(media_str)
    file_path_list = payload['file_path_list']

    invalid_files = []
    for file_path_obj in file_path_list:
        is_valid = validator_service.validate_path_lengths(
            source_dir,
            observer_code,
            file_path_obj['file_path'],
            media_type,
            file_path_obj.get('new_name')
        )
        if not is_valid:
            invalid_files.append(file_path_obj['file_path'])

    return len(invalid_files) > 0


@bp.route('/validate_non_existence/<string:media_str>', methods=['POST'])
@tryable_json_endpoint
def validate_non_existence(media_str):
    payload = request.json
    source_dir = payload['source_dir']
    observer_code = payload['observer_code']
    media_type = MediaType(media_str)
    file_path_list = payload['file_path_list']

    invalid_files = []
    for file_path_obj in file_path_list:
        is_valid = validator_service.validate_non_existence(
            source_dir,
            observer_code,
            file_path_obj['file_path'],
            media_type,
            file_path_obj.get('new_name')
        )
        if not is_valid:
            invalid_files.append(file_path_obj['file_path'])

    return invalid_files


@bp.route('/job/<int:job_id>', methods=['GET'])
@tryable_json_endpoint
def get_job(job_id):
    return job_service.get_job(job_id)


@bp.route('/job_status/<int:job_id>', methods=['GET'])
@tryable_json_endpoint
def job_status(job_id):
    status = job_service.check_job_status(job_id)
    return { "status": status[0], "error": status[1] }


@bp.route('/job/<int:job_id>/tasks', methods=['GET'])
@tryable_json_endpoint
def task_statuses(job_id):
    return task_service.get_tasks_statuses_by_job_id(job_id)


@bp.route('/job/<int:job_id>/sample_file_data', methods=['GET'])
@tryable_json_endpoint
def job_task_sample_file_data(job_id):
    return task_service.get_tasks_sample_file_data_by_job_id(job_id)


@bp.route('/transcode', methods=['POST'])
@tryable_json_endpoint
def queue_transcode():
    payload = request.json
    media_type = payload['media_type']
    source_dir = payload['source_dir']
    local_export_path = payload['local_export_path']
    report_dir = payload['report_dir']
    transcode_list = payload['transcode_list']
    observer_code = payload['observer_code']
    job_id = transcode_service.queue_transcode_job(source_dir, local_export_path, report_dir, media_type, transcode_list, observer_code)
    return {"job_id": job_id}


@bp.route('/job/<int:job_id>', methods=['DELETE'])
@tryable_json_endpoint
def delete_job(job_id):
    orphaned_tasks = job_service.delete_job(job_id)
    return {"orphaned_tasks": orphaned_tasks}


@bp.route('/job', methods=["GET"])
@tryable_json_endpoint
def get_jobs():
    completed = str_to_bool(request.args.get('completed', default="true", type=str))
    page = request.args.get('page', type=int)
    page_size = request.args.get('page_size', type=int)
    jobs = job_service.get_jobs(JobType.TRANSCODE, completed, page, page_size)
    return jobs


@bp.route('/clean_up_jobs', methods=["POST"])
@tryable_json_endpoint
def clean_up_jobs():
    job_service.clean_up_jobs()


@bp.route('/sample/<string:filename>', methods=["GET"])
def get_sample_images(filename):
    filename_unquoted = unquote(filename)
    sample_image_dir = transcode_service.get_sample_image_dir()
    return send_from_directory(sample_image_dir, filename_unquoted, as_attachment=False)


@bp.route('/dark_sample/<string:filename>', methods=["GET"])
def get_dark_sample_images(filename):
    filename_unquoted = unquote(filename)
    dark_sample_image_dir = color_correct_service.get_color_corrected_image_dir()
    return send_from_directory(dark_sample_image_dir, filename_unquoted, as_attachment=False)


@bp.route('/sample', methods=["POST"])
@tryable_json_endpoint
def create_sample_images():
    payload = request.json
    small_image_file_path = payload.get('small_image_file_path', None)
    medium_image_file_path = payload.get('medium_image_file_path', None)
    large_image_file_path = payload.get('large_image_file_path', None)
    xlarge_image_file_path = payload.get('xlarge_image_file_path', None)

    job_id = transcode_service.create_sample_images(
        small_image_file_path,
        medium_image_file_path,
        large_image_file_path,
        xlarge_image_file_path
    )
    return {"job_id": job_id}


@bp.route('/sample/<int:job_id>', methods=["DELETE"])
@tryable_json_endpoint
def delete_sample_images(job_id):
    sample_image_dir = transcode_service.get_sample_image_dir()
    return transcode_service.delete_sample_images(None, sample_image_dir)


@bp.route('/dark_sample/<int:job_id>', methods=["DELETE"])
@tryable_json_endpoint
def delete_dark_sample_images(job_id):
    dark_sample_image_dir = color_correct_service.get_color_corrected_image_dir()
    return transcode_service.delete_sample_images(job_id, dark_sample_image_dir)


@bp.route('/delete_old_tasks', methods=["DELETE"])
@tryable_json_endpoint
def delete_old_tasks():
    deleted_ids = task_service.delete_old_tasks()
    print_out(f'Deleted {len(deleted_ids)} old tasks')
    return {"deleted_ids": deleted_ids}


@bp.route('/dark', methods=['POST'])
@tryable_json_endpoint
def identify_dark_images():
    payload = request.json
    image_paths = payload['image_paths']
    job_id = color_correct_service.identify_dark_images_from_collection(image_paths)
    return {"job_id": job_id}


@bp.route('/job/<int:job_id>/dark', methods=['GET'])
@tryable_json_endpoint
def job_task_dark_data(job_id):
    return task_service.get_tasks_dark_data_by_job_id(job_id)


@bp.route('/dark_sample', methods=['POST'])
@tryable_json_endpoint
def create_dark_samples():
    payload = request.json
    image_paths = payload['image_paths']
    job_id = color_correct_service.create_dark_sample_images(image_paths)
    return {"job_id": job_id}


@bp.route('/export_report', methods=["GET"])
@tryable_json_endpoint
def export_report():
    job_id = request.args.get('job_id')
    output_folder = unquote(request.args.get('output_folder'))

    return ingest_service.export_report(job_id, output_folder)


@bp.route('/export_flowsheet', methods=["GET"])
@tryable_json_endpoint
def export_flowsheet():
    output_folder = unquote(request.args.get('output_folder'))
    observer_code = unquote(request.args.get('observer'))

    return ingest_service.export_flowsheet(output_folder, observer_code)
