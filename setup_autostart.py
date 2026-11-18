import os
import subprocess

startup_dir = os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup")
shortcut_path = os.path.join(startup_dir, "SnackVault.lnk")
vbs_path = os.path.abspath("start_background.vbs")
work_dir = os.path.abspath(".")

# Use powershell via subprocess to create the .lnk cleanly
ps_script = f"""
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('{shortcut_path}')
$s.TargetPath = 'wscript.exe'
$s.Arguments = '"{vbs_path}"'
$s.WorkingDirectory = '{work_dir}'
$s.Description = 'SnackVault 24/7 Auto-Start'
$s.Save()
"""

subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], check=True)
if os.path.exists(shortcut_path):
    print("SUCCESS: SnackVault auto-start shortcut created at:", shortcut_path)
else:
    print("FAILED to create shortcut.")
