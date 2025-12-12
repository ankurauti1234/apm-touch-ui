# src/utils/system.py

import subprocess
from typing import Tuple

def run_system_command(command: list) -> Tuple[bool, str]:
    """Execute system command safely with output capture."""
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        return True, result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return False, e.stderr.strip() if e.stderr else "Command failed"
    except Exception as e:
        return False, str(e)