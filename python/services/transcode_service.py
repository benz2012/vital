import io
import os
import errno
import sys
import re
import tempfile
import shutil
import subprocess
import time
import threading
from subprocess import PIPE
from typing import List

from data.transcode_settings import TranscodeSettings
from data.task import TaskProgessMessages
from services.job_service import JobService
from services.task_service import TaskService
from services.metadata_service import MediaType
from services.report_service import ReportService
from services.ingest_service import IngestService
from model.ingest.job_model import JobType, JobStatus, JobErrors

from settings.settings_service import SettingsService, SettingsEnum
from data.task import TaskStatus

from model.association.folder_model import FolderModel
from model.association.video_model import VideoModel

from utils.file_path import (
    extract_catalog_folder_info,
    construct_catalog_folder_path,
    make_one_dir_ok_exists,
    get_size_of_folder_contents_recursively,
    copy_file_with_attempts,
    RETRY_DELAY_SEC
)
from utils.prints import print_out, print_err
from utils.numbers import find_closest
from utils.death import add_terminator, remove_last_terminator
from utils.constants import image_extensions
from utils.transcode_snippets import auto_exposure_correct


class TranscodeService:

    HEIGHT_STEPS = [2160, 1080, 540, 270]
    BANDWIDTH_STEPS = {
        30: {
            2160: [20_000,  6_000, 2_000, 400],
            1080: [        10_000, 2_000, 400],
            540:  [                3_000, 400],
        },
        60: {
            2160: [40_000, 12_000, 4_000, 800],
            1080: [        20_000, 4_000, 800],
            540:  [                6_000, 800],
        },
    }
    PROGRESS_RATIOS = [12, 4, 2, 1]

    # Define a ratio of total progress for the transcodes versus the transfers, based on transfer bandwidth speeds
    #  Mbps: (Transcode Progress Amount, Transfer Progress Amount)
    TRNSC_2_TRNSFR_PRGS_RATIOS = {
          1: ( 8, 92),
          2: (15, 85),
          5: (30, 70),
         10: (50, 50),
         25: (70, 30),
         50: (83, 17),
        100: (90, 10),
        200: (95,  5),
        500: (98,  2),
    }
    TRNSC_2_TRNSFR_BNDWTHS = list(TRNSC_2_TRNSFR_PRGS_RATIOS.keys())

    LOW_JPEG_QUALITY = 20
    MEDIUM_JPEG_QUALITY = 50
    HIGH_JPEG_QUALITY = 90
    MAX_JPEG_QUALITY = 100
    JPEG_QUALITIES = [
        LOW_JPEG_QUALITY,
        MEDIUM_JPEG_QUALITY,
        HIGH_JPEG_QUALITY,
        MAX_JPEG_QUALITY,
    ]

    TEMP_SAMPLE_DIR = 'temp'

    def __init__(self):
        self.job_service = JobService()
        self.task_service = TaskService()
        self.settings_service = SettingsService()
        self.folder_model = FolderModel()
        self.video_model = VideoModel()
        self.report_service = ReportService()
        self.ingest_service = IngestService()

        base_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
        self.ffmpeg_path = os.path.join(base_dir, 'resources', 'ffmpeg.exe')
        self.mp4box_path = os.path.join(base_dir, 'resources', 'mp4box.exe')
        self.magick_path = os.path.join(base_dir, 'resources', 'magick.exe')

    def queue_transcode_job(
            self,
            source_dir: str,
            local_export_path: str,
            report_dir: str,
            media_type: str,
            transcode_settings_list: List[TranscodeSettings],
            observer_code: str
        ) -> int:
        transcode_job_id = self.job_service.create_job(
            JobType.TRANSCODE,
            JobStatus.QUEUED,
            {
                "source_dir": source_dir,
                "media_type": media_type,
                "local_export_path": local_export_path,
                "report_dir": report_dir,
                "observer_code": observer_code
            }
        )

        for transcode_settings_json in transcode_settings_list:
            transcode_settings = TranscodeSettings(**transcode_settings_json)
            self.task_service.create_task(transcode_job_id, transcode_settings)

        return transcode_job_id

    def get_sample_image_dir(self):
        thumbnail_dir = self.settings_service.get_setting(SettingsEnum.THUMBNAIL_DIR_PATH.value)
        temp_sample_dir = os.path.join(thumbnail_dir, self.TEMP_SAMPLE_DIR)
        return temp_sample_dir

    def create_sample_images(self, small_image_file_path=None, medium_image_file_path=None, large_image_file_path=None):
        job_id = self.job_service.create_job(JobType.SAMPLE, JobStatus.INCOMPLETE, {
                "source_dir": '',
                "media_type": MediaType.IMAGE.value,
            })

        if small_image_file_path:
            self.create_sample_tasks(job_id, small_image_file_path, 'small')

        if medium_image_file_path:
            self.create_sample_tasks(job_id, medium_image_file_path, 'medium')

        if large_image_file_path:
            self.create_sample_tasks(job_id, large_image_file_path, 'large')

        threading.Thread(target=self.run_sample_tasks, args=(job_id,)).start()
        return job_id

    def create_sample_tasks(self, job_id, file_path, bucket_name):
        file_name, file_extension = os.path.splitext(file_path)
        for jpeg_quality in self.JPEG_QUALITIES:
            file_path_jpeg = f'{os.path.basename(file_name)}_{str(jpeg_quality)}.jpg'
            transcode_settings = TranscodeSettings(file_path=file_path, new_name=file_path_jpeg, jpeg_quality=jpeg_quality, input_height=bucket_name)
            self.task_service.create_task(job_id, transcode_settings)

    def run_sample_tasks(self, job_id):
        tasks = self.task_service.get_tasks_by_job_id(job_id)
        temp_sample_dir = self.get_sample_image_dir()
        os.makedirs(temp_sample_dir, exist_ok=True)

        for task in tasks:
            transcode_task_id = task.id
            try:
                transcode_settings = self.task_service.get_transcode_settings(transcode_task_id)
                new_name = transcode_settings.new_name

                _, output_file_path = self.run_transcode_commands(temp_sample_dir, transcode_settings)
                final_output_path = os.path.join(temp_sample_dir, new_name)

                if os.path.exists(final_output_path):
                    os.remove(final_output_path)
                os.rename(output_file_path, final_output_path)

                self.task_service.set_task_progress(transcode_task_id, 100)
                self.task_service.set_task_status(transcode_task_id, TaskStatus.COMPLETED)

            except Exception as err:
                # Even a single task error renders the whole job corrupt, so we catch
                # this one error, push it to the job level, can cancel the job
                print_err(f"Error creating sample images")
                self.job_service.set_error(job_id, f'{err.__class__.__name__}: {err}')
                raise err

        self.job_service.set_job_status(job_id)

    def delete_sample_images(self, job_id, temp_sample_dir):
        if not os.path.exists(temp_sample_dir):
            return

        files_in_temp_dir = os.listdir(temp_sample_dir)

        if job_id is None:
            for file_name in files_in_temp_dir:
                os.remove(os.path.join(temp_sample_dir, file_name))
        else:
            tasks = self.task_service.get_tasks_by_job_id(job_id)
            for task in tasks:
                transcode_settings = self.task_service.get_transcode_settings(task.id)
                file_name = os.path.basename(transcode_settings.new_name)
                if file_name in files_in_temp_dir:
                    os.remove(os.path.join(temp_sample_dir, file_name))

        os.rmdir(temp_sample_dir)
        return job_id

    def transcode_media(self, transcode_job_id, source_dir, local_export_path, report_dir, media_type, transcode_task_ids: List[int], observer_code):
        self.job_service.set_error(transcode_job_id, JobErrors.NONE)

        optimized_base_dir = None
        original_base_dir = None
        if (media_type == MediaType.VIDEO):
            optimized_base_dir = self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_VIDEOS.value)
            original_base_dir = self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_ORIGINAL_VIDEOS.value)
        else:
            optimized_base_dir = self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_OPTIMIZED_IMAGES.value)
            original_base_dir = self.settings_service.get_setting(SettingsEnum.BASE_FOLDER_OF_ORIGINAL_IMAGES.value)

        source_dir_name = os.path.basename(source_dir)

        catalog_folder_info = extract_catalog_folder_info(source_dir_name)
        optimized_dir_path = construct_catalog_folder_path(optimized_base_dir, *catalog_folder_info)
        original_dir_path = construct_catalog_folder_path(original_base_dir, *catalog_folder_info)
        local_dir_path = ''
        if local_export_path:
            local_dir_path = construct_catalog_folder_path(local_export_path, *catalog_folder_info)
            os.makedirs(local_dir_path, exist_ok=True)

        catalog_folder_id = None
        if (media_type == MediaType.VIDEO):
            # remove the cleaned observer code and replace it with the "real" observer code
            catalog_folder_info = catalog_folder_info[:-1] + (observer_code,)
            catalog_folder_id = self.folder_model.create_folder(*catalog_folder_info)

        # We expect that all folders leading up to these leafs will exist, and if not, that an Error should be thrown
        retry_job = True # Start as True just to enter the loop, but then we will only set it back to True when we want to retry
        break_to_kill_job = False
        while retry_job == True:
            retry_job = False
            try:
                make_one_dir_ok_exists(optimized_dir_path)
                make_one_dir_ok_exists(original_dir_path)
            except FileNotFoundError as e:
                # See the task loop for more details on this retry logic
                retry_job = True
                print_err(str(e))
                self.job_service.set_error(transcode_job_id, JobErrors.FILE_NOT_FOUND)
                self.job_service.set_job_status(transcode_job_id)
                time.sleep(RETRY_DELAY_SEC)
            finally:
                # If the Job no longer exists, the user must have deleted it while we were inside this retry loop
                parent_job = self.job_service.get_job(transcode_job_id)
                if not parent_job:
                    break_to_kill_job = True
                    break
        if break_to_kill_job:
            return

        try:
            disk_bandwidth = TranscodeService.get_disk_io_bandwidth(optimized_base_dir)
            print_out(f'Estimated Disk Bandwidth: {disk_bandwidth} Mbps')
        except Exception:
            disk_bandwidth = 10 # this will give us a perfectly balanced 50/50 since we failed to identify the bandwidth
        progress_4_transcode, progress_4_transfer = TranscodeService.get_subtask_progress_ratios(disk_bandwidth)

        break_task_loop = False
        for transcode_task_id in transcode_task_ids:
            if break_task_loop:
                break
            self.job_service.set_error(transcode_job_id, JobErrors.NONE)
            with tempfile.TemporaryDirectory() as temp_dir:
                retry_task = True # Start as True just to enter the loop, but then we will only set it back to True when we want to retry
                while retry_task == True:
                    retry_task = False
                    try:
                        self.task_service.set_task_status(transcode_task_id, TaskStatus.INCOMPLETE)
                        self.task_service.set_task_error_message(transcode_task_id, '')

                        if (media_type == MediaType.VIDEO):
                            self.transcode_video(
                                source_dir,
                                optimized_dir_path,
                                original_dir_path,
                                catalog_folder_id,
                                transcode_task_id,
                                transcode_job_id,
                                temp_dir,
                                progress_4_transcode,
                                progress_4_transfer
                            )
                        else:
                            self.transcode_image(optimized_dir_path, original_dir_path, local_dir_path, transcode_task_id, temp_dir)

                        self.task_service.set_task_progress(transcode_task_id, 100)
                        self.task_service.set_task_status(transcode_task_id, TaskStatus.COMPLETED)

                    except FileNotFoundError as e:
                        # We catch and retry on this error because it might signal that the user lost internet connection or
                        # VPN access to one of the output folders. We set an error string on the Job-level for communication to the UI
                        retry_task = True
                        print_err(str(e))
                        self.job_service.set_error(transcode_job_id, JobErrors.FILE_NOT_FOUND)
                        time.sleep(RETRY_DELAY_SEC)

                    except Exception as e:
                        print_err(str(e))
                        self.task_service.set_task_progress(transcode_task_id, 0)
                        self.task_service.set_task_status(transcode_task_id, TaskStatus.ERROR)
                        self.task_service.set_task_error_message(transcode_task_id, str(e))

                    finally:
                        # If the Job no longer exists, the user must have deleted it while we were working on this task
                        # If the task was within a subprocess when this happened, the subprocess should have been terminated
                        parent_job = self.job_service.get_job(transcode_job_id)
                        if not parent_job:
                            print_out(f'parent job {transcode_job_id} was deleted while task {transcode_task_id} was in progress, cleaning up')
                            self.task_service.force_delete(transcode_task_id)
                            break_task_loop = True
                            break

                        # It might feel wrong to run this before breaking/killing the task, but will_complete will be false
                        will_complete = self.job_service.will_job_complete(transcode_job_id)
                        if will_complete:
                            self.report_service.create_final_report(transcode_job_id, media_type, source_dir, original_dir_path, optimized_dir_path)
                            if report_dir:
                                self.ingest_service.export_report(transcode_job_id, report_dir)

                        self.job_service.set_job_status(transcode_job_id)

    def transcode_video(self, source_dir, optimized_dir_path, original_dir_path, catalog_folder_id, transcode_task_id, transcode_job_id, temp_dir, progress_4_transcode, progress_4_transfer):
        transcode_settings = self.task_service.get_transcode_settings(transcode_task_id)
        self.task_service.set_task_progress(transcode_task_id, 0, TaskProgessMessages.TRANSCODING.value)

        # Determine the Adaptive Bitrate Ladder for this video
        input_height = transcode_settings.input_height
        output_framerate = transcode_settings.output_framerate
        max_height = find_closest(self.HEIGHT_STEPS, input_height)
        max_height_idx = self.HEIGHT_STEPS.index(max_height)
        heights_to_use = self.HEIGHT_STEPS[max_height_idx:]
        framerate_similar = find_closest([30, 60], output_framerate)
        bandwidths_to_use = self.BANDWIDTH_STEPS[framerate_similar][max_height]
        progress_ratios = self.PROGRESS_RATIOS[max_height_idx:]

        # Prepare filepath variables
        shared_extension = '.mp4'
        original_file = transcode_settings.file_path
        original_file_name = os.path.splitext(os.path.basename(original_file))[0]
        output_file_name = transcode_settings.new_name or original_file_name
        original_subdirs = original_file.replace(source_dir, '').lstrip(os.path.sep).split(os.path.sep)[:-1]
        expected_final_dir = os.path.join(optimized_dir_path, *original_subdirs, output_file_name)
        expected_original_dir = os.path.join(original_dir_path, *original_subdirs)

        if os.path.isdir(expected_final_dir):
            # if final dir exists we must delete it, in order to perform a move of a whole new folder to that same location
            # this is because the Dash output will be a folder of files, whereas the original file is a single file
            shutil.rmtree(expected_final_dir, ignore_errors=True)
        for jindex, _ in enumerate(original_subdirs):
            # make each leaf dir up to the final leaf. This prevents accidentally making the base dirs if they don't exist
            # already for access or non-existence reasons
            subdirs_to_this_point = original_subdirs[:jindex + 1]
            make_one_dir_ok_exists(os.path.join(optimized_dir_path, *subdirs_to_this_point))
            make_one_dir_ok_exists(os.path.join(original_dir_path, *subdirs_to_this_point))

        temp_files = [
            os.path.join(temp_dir, f'{output_file_name}_{height}{shared_extension}')
            for height in heights_to_use
        ]
        temp_dash_container = os.path.join(temp_dir, output_file_name)
        output_file_name_mpd = f'{output_file_name}.mpd'
        temp_mpd_file = os.path.join(temp_dash_container, output_file_name_mpd)
        os.makedirs(temp_dash_container, exist_ok=True)

        # Transcode the video into multiple intermediates
        num_frames = transcode_settings.num_frames
        keyframe_rate = output_framerate * 2
        progress_bounds = TranscodeService.calculate_progress_bounds(progress_ratios)
        for index, output_height in enumerate(heights_to_use):
            bandwidth = bandwidths_to_use[index]
            temp_file = temp_files[index]
            ffmpeg_command = self.generate_transcode_command(
                original_file,
                keyframe_rate,
                output_framerate,
                output_height,
                bandwidth,
                temp_file,
            )

            progress_bounds_for_sub_task = progress_bounds[index]
            line_handler = self.create_ffmpeg_line_handler(
                transcode_task_id,
                num_frames,
                progress_bounds_for_sub_task,
                progress_4_transcode / 100,
            )
            TranscodeService.run_command_with_terminator(ffmpeg_command, line_handler)

        # Combine the intermediates into a single DASH file
        intermediate_files = [
            f'{temp_file}#video:id={heights_to_use[index]}'
            for index, temp_file in enumerate(temp_files)
        ]
        mp4box_command = self.generate_dash_command(intermediate_files, temp_mpd_file, output_file_name_mpd)
        TranscodeService.run_command_with_terminator(mp4box_command)
        self.task_service.set_task_progress(transcode_task_id, progress_4_transcode, TaskProgessMessages.COPYING.value)

        # Official Output - Copy the whole DASH folder to the optimized directory
        folder_to_move_into = os.path.dirname(expected_final_dir)
        print_out(f'Moving {temp_dash_container} into {folder_to_move_into}')
        t = threading.Thread(
            target=self.file_size_progress_reporter,
            args=(
                transcode_task_id,
                expected_final_dir,
                get_size_of_folder_contents_recursively(temp_dash_container),
                (progress_4_transcode + 1, progress_4_transcode + (progress_4_transfer * 0.5)),
                True
            )
        )
        t.start()

        copy_success_1 = False
        while copy_success_1 == False:
            try:
                # We do this because shutil.move does not throw this on its own, and also to avoid switching the JobError back to None too early
                if not os.path.isdir(folder_to_move_into):
                    raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), folder_to_move_into)
                self.job_service.set_error(transcode_job_id, JobErrors.NONE)
                if os.path.isdir(expected_final_dir):
                    shutil.rmtree(expected_final_dir, ignore_errors=True)
                shutil.move(temp_dash_container, folder_to_move_into)
                copy_success_1 = True
            except FileNotFoundError as e:
                print_err(str(e))
                self.job_service.set_error(transcode_job_id, JobErrors.FILE_NOT_FOUND)
                time.sleep(RETRY_DELAY_SEC)
            except OSError as e:
                if '[WinError 53]' in str(e):
                    print_err(str(e))
                    self.job_service.set_error(transcode_job_id, JobErrors.FILE_NOT_FOUND)
                    time.sleep(RETRY_DELAY_SEC)
                else:
                    raise e
            finally:
                # If the Job no longer exists, the user must have deleted it while we were inside this retry loop
                parent_job = self.job_service.get_job(transcode_job_id)
                if not parent_job:
                    break

        t.join()
        self.task_service.set_task_progress(transcode_task_id, progress_4_transcode + (progress_4_transfer * 0.5))

        # Official Output - Copy original file to original directory
        # This should happen after the transcode as it is less likely to fail
        print_out(f'Copying {original_file} to {expected_original_dir}')
        t = threading.Thread(
            target=self.file_size_progress_reporter,
            args=(
                transcode_task_id,
                os.path.join(expected_original_dir, os.path.basename(original_file)),
                get_size_of_folder_contents_recursively(original_file),
                (progress_4_transcode + (progress_4_transfer * 0.5) + 1, 99),
                True
            )
        )
        t.start()

        copy_success_2 = False
        while copy_success_2 == False:
            try:
                # We do this to avoid switching the JobError back to None too early
                if not os.path.isdir(expected_original_dir):
                    raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), expected_original_dir)
                self.job_service.set_error(transcode_job_id, JobErrors.NONE)
                shutil.copy(original_file, expected_original_dir)
                copy_success_2 = True
            except FileNotFoundError as e:
                print_err(str(e))
                self.job_service.set_error(transcode_job_id, JobErrors.FILE_NOT_FOUND)
                time.sleep(RETRY_DELAY_SEC)
            finally:
                # If the Job no longer exists, the user must have deleted it while we were inside this retry loop
                parent_job = self.job_service.get_job(transcode_job_id)
                if not parent_job:
                    break

        t.join()
        self.task_service.set_task_progress(transcode_task_id, 99, TaskProgessMessages.DATA_ENTRY.value)

        expected_final_full_path = os.path.join(expected_final_dir, output_file_name_mpd)
        dash_file_partial_leaf = expected_final_full_path.replace(f'{optimized_dir_path}{os.path.sep}', '')

        self.video_model.create_video(catalog_folder_id, os.path.basename(original_file), dash_file_partial_leaf, output_framerate)

    def generate_transcode_command(self, original_file, keyframe_rate, output_framerate, output_height, bandwidth, temp_file):
        return [
            self.ffmpeg_path,
            '-v', 'warning',
            '-stats',
            '-y',
            '-i', original_file,
            '-c:v', 'libx264',
            '-x264opts', f'keyint={keyframe_rate}:min-keyint={keyframe_rate}:no-scenecut',
            '-r', str(output_framerate),
            '-vf', f'scale=-2:{output_height}',
            '-pix_fmt', 'yuv420p',
            '-b:v', f'{bandwidth}k',
            '-maxrate', f'{bandwidth}k',
            '-bufsize', f'{bandwidth * 2}k',
            '-profile:v', 'main',
            '-movflags', 'faststart',
            '-preset', 'fast',
            '-an',
            temp_file
        ]

    def generate_dash_command(self, intermediate_files, temp_mpd_file, output_file_name_mpd):
        return [
            self.mp4box_path,
            '-dash', '4000',
            '-rap',
            '-segment-name', 'segment_$RepresentationID$_',
            *intermediate_files,
            '-out', temp_mpd_file,
            '-mpd-title', f'"{output_file_name_mpd}"'
        ]

    def create_ffmpeg_line_handler(self, transcode_task_id, total_frames, progress_bounds=(0, 100), progress_ratio_within_job=1.0):
        def line_callback(line):
            frames_complete = TranscodeService.parse_ffmpeg_progress(line)
            if frames_complete:
                percent_complete = frames_complete / total_frames
                new_absolute_progress = int(
                    ((progress_bounds[1] - progress_bounds[0])
                    * percent_complete
                    + progress_bounds[0]) * progress_ratio_within_job
                )
                self.task_service.set_task_progress(transcode_task_id, new_absolute_progress)
        return line_callback


    def transcode_image(self, optimized_dir_path, original_dir_path, local_dir_path, transcode_task_id, temp_dir):
        transcode_settings = self.task_service.get_transcode_settings(transcode_task_id)

        file_path, optimized_temp_path = self.run_transcode_commands(temp_dir, transcode_settings)
        self.task_service.set_task_progress(transcode_task_id, 66)

        # Official Outputs
        copy_file_with_attempts(file_path, original_dir_path)
        self.task_service.set_task_progress(transcode_task_id, 85)
        copy_file_with_attempts(optimized_temp_path, optimized_dir_path)
        self.task_service.set_task_progress(transcode_task_id, 99)
        copy_file_with_attempts(optimized_temp_path, local_dir_path)


    def run_transcode_commands(self, temp_dir, transcode_settings):
        file_path = transcode_settings.file_path
        jpeg_quality = transcode_settings.jpeg_quality
        is_dark = transcode_settings.is_dark

        # Prepare filepath variables
        file_name, file_extension = os.path.splitext(file_path)
        file_name = os.path.basename(file_name)
        output_name = transcode_settings.new_name or file_name
        optimized_temp_path = os.path.join(temp_dir, f'{output_name}.jpg')

        if file_extension.lower() not in image_extensions:
            raise ValueError(f'Unsupported image file type: {file_extension}')

        command = self.generate_convert_command(file_path, optimized_temp_path, jpeg_quality, is_dark)
        TranscodeService.run_command_with_terminator(command)

        return file_path, optimized_temp_path

    def generate_convert_command(self, input_path, output_path, jpeg_quality, is_dark):
        command = [
            self.magick_path,
            input_path,
        ]
        if is_dark:
            command.extend(auto_exposure_correct)
        command.extend([
            '-quality', f'{jpeg_quality}',
            output_path,
        ])
        return command

    def file_size_progress_reporter(self, transcode_task_id, file_path, expected_size, progress_bounds=(0, 100), is_folder=False):
        current_size = 0
        if expected_size == 1:
            # this function is useless if the expected_size failed (which is a 1), so its better to not report progress
            return
        while current_size < expected_size - 1024:
            try:
                if is_folder:
                    current_size = get_size_of_folder_contents_recursively(file_path)
                else:
                    current_size = os.path.getsize(file_path)
            except Exception:
                pass
            progress = int(
                (current_size / expected_size)
                * (progress_bounds[1] - progress_bounds[0])
                + progress_bounds[0]
            )
            self.task_service.set_task_progress(transcode_task_id, progress)
            time.sleep(1)

    @staticmethod
    def run_command_with_terminator(command, line_callback = print_out):
        print_out(' '.join(command))
        all_stdout = []
        with subprocess.Popen(command, stdout=PIPE, stderr=PIPE) as proc:
            add_terminator(proc.terminate)
            for line in io.TextIOWrapper(proc.stderr, encoding="utf-8"):
                line_callback(line)
            for line in io.TextIOWrapper(proc.stdout, encoding="utf-8"):
                all_stdout.append(line)
        remove_last_terminator()
        if (proc.returncode != 0):
            raise subprocess.CalledProcessError(proc.returncode, command, proc.stdout, proc.stderr)
        return '\n'.join(all_stdout)

    @staticmethod
    def parse_ffmpeg_progress(line):
        match = re.match(r"frame=\s*(\d+)\s+fps=\s*\d+", line)
        if match:
            return int(match.group(1))
        return None

    @staticmethod
    def calculate_progress_bounds(ratios):
        length_of_transcodes = 100
        ratio_sum = sum(ratios)
        bounds = []
        for index, ratio in enumerate(ratios):
            lower_bound = 0 if index == 0 else bounds[-1][1] + 1
            relative_upper_bound = int((ratio / ratio_sum) * length_of_transcodes)
            upper_bound = length_of_transcodes if index == len(ratios) - 1 else lower_bound + relative_upper_bound
            bounds.append((lower_bound, upper_bound))
        return bounds

    @staticmethod
    def get_disk_io_bandwidth(network_folder_path):
        bandwidth = 1 # 1 Mbps is our lowest threshold, so this is a good default
        # Progressivley scale up the file size until we find a file size that takes longer than 10 seconds to write
        # this will give us a much better bandwidth estimate than just writing a tiny little file super quickly
        time_to_write = 0
        file_size_mb = 1
        while time_to_write < 10 and file_size_mb < 101:
            before = time.time()
            bandwidth = TranscodeService.check_disk_io_bandwidth(network_folder_path, file_size_mb)
            after = time.time()
            time_to_write = after - before
            file_size_mb *= 10 # so basically, check 1, 10, then 100 mb files
        return bandwidth

    @staticmethod
    def check_disk_io_bandwidth(network_folder_path, check_mb=1):
        fileSizeInBytes = 1024 * 1024 * check_mb
        temp_file = os.path.join(network_folder_path, 'vital-temp-file')
        before = time.time()
        with open(temp_file, 'wb') as fout:
            fout.write(os.urandom(fileSizeInBytes))
        after = time.time()
        os.remove(temp_file)
        pure_bandwidth = sys.maxsize if after - before == 0 else (fileSizeInBytes * 8) / (after - before)
        # return Mbps
        return pure_bandwidth / (1024 * 1024)

    @staticmethod
    def get_subtask_progress_ratios(disk_bandwidth):
        closest_bandwidth = find_closest(TranscodeService.TRNSC_2_TRNSFR_BNDWTHS, disk_bandwidth)
        return TranscodeService.TRNSC_2_TRNSFR_PRGS_RATIOS[closest_bandwidth]
