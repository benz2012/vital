from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.triggers.date import DateTrigger

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

from utils.prints import print_out, print_err

from model.config import DB_PATH

class SchedulerService():

    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(SchedulerService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self) -> None:
        jobstores = {
            'default': SQLAlchemyJobStore(url=f'sqlite:///{DB_PATH}')
        }

        self.ap_scheduler = BackgroundScheduler(jobstores=jobstores)
        self.ap_scheduler.add_listener(self._job_listener, EVENT_JOB_ERROR | EVENT_JOB_EXECUTED)
        self.MISFIRE_GRACE_PERIOD = 60
        self.running = False


    def start(self):
        self.ap_scheduler.start()

    def stop(self):
        self.ap_scheduler.shutdown(wait=False)

    def get_run_status(self):
        return self.running

    def set_run_status(self, is_running):
        self.running = is_running

    def add_job(self, func, run_time, args=None):

        # only one queue job can be scheduled at a time
        self.remove_jobs()

        trigger = DateTrigger(run_date=run_time)

        # if job fires more than 60 seconds after it was supposed to (if the app was started after fire time, for example)
        # skip the job
        job = self.ap_scheduler.add_job(func, trigger, args=args, misfire_grace_time=self.MISFIRE_GRACE_PERIOD)

        return job.id

    def remove_jobs(self):
        for job in self.ap_scheduler.get_jobs():
            self.ap_scheduler.remove_job(job.id)

    def get_job(self):
        jobs = list(self.ap_scheduler.get_jobs())
        return jobs[0] if len(jobs) else None

    def _job_listener(self, event):
        if event.exception:
            print_err(f"The job {event.job_id} crashed")
        else:
            print_out(f"The job {event.job_id} completed successfully")
