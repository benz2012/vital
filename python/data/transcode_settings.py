from dataclasses import dataclass, asdict

@dataclass
class TranscodeSettings:
    file_path: str
    input_height: int = 1080
    num_frames: int = 1
    output_framerate: int = 30
    jpeg_quality: str = ''
    new_name: str = ''
    is_dark: bool = False
    needs_metadata: bool = False

    def to_dict(self):
        return asdict(self)
