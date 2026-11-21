' Runs start-hub.cmd with no window. Put a shortcut to this file in your Startup folder
' (press Win + R, type shell:startup, press Enter) so the Hub starts when you sign in to Windows.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run "cmd /c start-hub.cmd", 0, False
