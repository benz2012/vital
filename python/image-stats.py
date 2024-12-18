import os
import subprocess

MAGICK = "C:\\Users\\imben\\Development\\vital\\python\\resources\\magick.exe"
FOLDER = "C:\\Users\\imben\\Documents\\Settings_Folders\\Whale Images - Optimized\\2020-2029\\2021\\2021-11-21-ABCD-20"

def main():
    for f in os.listdir(FOLDER):
        fp = os.path.join(FOLDER, f)

        # Get the image stats
        image_stats = subprocess.check_output([
            MAGICK,
            "identify",
            "-format",
            "%w\\n%h\\n%b",
            fp,
        ]).decode("utf-8")

        bips = image_stats.split("\r\n")
        # print(bips)
        width = bips[0]
        height = bips[1]
        size = bips[2]

        # Print the image stats
        print(f'{f} | {width} | {height} | {size}')

if __name__ == "__main__":
    main()
