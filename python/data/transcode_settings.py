from dataclasses import dataclass, asdict

@dataclass
class TranscodeSettings:
    file_path: str
    input_height: str = ''
    num_frames: int = ''
    output_framerate: str = ''
    jpeg_quality: str = ''
    new_name: str = ''
    is_dark: bool = False
    needs_metadata: bool = False

    def to_dict(self):
        return asdict(self)
