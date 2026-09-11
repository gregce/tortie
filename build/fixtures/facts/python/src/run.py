import os
import subprocess


def run():
    subprocess.run(["ls"])
    return os.environ["APP_ENV"]
